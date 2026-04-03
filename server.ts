import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import qs from "qs";

dotenv.config();

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    console.log(`Initializing Firebase Admin for project: ${firebaseConfig.projectId}`);
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (e: any) {
    console.error("Error initializing Firebase Admin with config:", e.message);
    if (admin.apps.length === 0) admin.initializeApp();
  }
} else {
  console.warn("firebase-applet-config.json not found, using default Firebase Admin initialization");
  if (admin.apps.length === 0) admin.initializeApp();
}

const getDb = () => {
  try {
    if (firebaseConfig?.firestoreDatabaseId) {
      return getFirestore(firebaseConfig.firestoreDatabaseId);
    }
    return getFirestore();
  } catch (e: any) {
    console.error("Error getting Firestore instance:", e.message);
    return getFirestore();
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error.message || String(error),
    code: error.code,
    operationType,
    path,
    timestamp: new Date().toISOString()
  };
  console.error('Firestore Backend Error:', JSON.stringify(errInfo, null, 2));
  
  if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
    console.error('CRITICAL: Permission Denied. Please ensure the service account has "Cloud Datastore User" role for the specific database.');
  }
  
  return errInfo;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // iFood OAuth
  app.post("/api/ifood/auth", async (req, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      
      const response = await axios.post("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", qs.stringify({
        grant_type: "client_credentials",
        client_id: clientId || process.env.IFOOD_CLIENT_ID,
        client_secret: clientSecret || process.env.IFOOD_CLIENT_SECRET
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const { accessToken, refreshToken, expiresIn } = response.data;
      
      // Store in Firestore
      const db = getDb();
      try {
        await db.collection('settings').doc('ifood').set({
          accessToken,
          refreshToken,
          expiresAt: Date.now() + (expiresIn * 1000),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'settings/ifood');
        throw e;
      }

      res.json({ success: true, accessToken });
    } catch (error: any) {
      console.error('iFood Auth Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to authenticate with iFood' });
    }
  });

  // iFood Polling (triggered by frontend or cron)
  app.get("/api/ifood/orders/poll", async (req, res) => {
    try {
      const db = getDb();
      let ifoodData: any = null;
      try {
        const ifoodDoc = await db.collection('settings').doc('ifood').get();
        ifoodData = ifoodDoc.data();
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'settings/ifood');
        throw e;
      }

      if (!ifoodData?.accessToken) {
        return res.status(401).json({ error: 'iFood not connected' });
      }

      // Poll for events
      const response = await axios.get("https://merchant-api.ifood.com.br/order/v1.0/events:polling", {
        headers: { Authorization: `Bearer ${ifoodData.accessToken}` }
      });

      const events = response.data;
      if (events && events.length > 0) {
        // Process events (simplified: just fetch order details for NEW orders)
        for (const event of events) {
          if (event.eventType === 'PLACED') {
            const orderResponse = await axios.get(`https://merchant-api.ifood.com.br/order/v1.0/orders/${event.orderId}`, {
              headers: { Authorization: `Bearer ${ifoodData.accessToken}` }
            });
            
            const ifoodOrder = orderResponse.data;
            
            // Map iFood order to our system
            const orderData = {
              type: 'DELIVERY',
              status: 'PENDING',
              customerName: ifoodOrder.customer.name,
              customerPhone: ifoodOrder.customer.phone?.number || '',
              deliveryAddress: `${ifoodOrder.delivery.deliveryAddress.streetName}, ${ifoodOrder.delivery.deliveryAddress.streetNumber}`,
              items: ifoodOrder.items.map((item: any) => ({
                productId: item.externalCode || item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.unitPrice
              })),
              subtotal: ifoodOrder.total.subTotal,
              total: ifoodOrder.total.orderAmount,
              ifoodOrderId: ifoodOrder.id,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            };

            try {
              await db.collection('orders').add(orderData);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, 'orders');
            }
          }
        }

        // Acknowledge events
        await axios.post("https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment", events.map((e: any) => ({ id: e.id })), {
          headers: { Authorization: `Bearer ${ifoodData.accessToken}` }
        });
      }

      res.json({ success: true, eventsProcessed: events?.length || 0 });
    } catch (error: any) {
      console.error('iFood Polling Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to poll iFood orders' });
    }
  });

  // Fiscal Integration (NFC-e)
  app.post("/api/fiscal/emitir-nfc-e", async (req, res) => {
    try {
      const { orderId } = req.body;
      const db = getDb();

      // 1. Get order and settings
      let orderDoc, settingsDoc;
      try {
        [orderDoc, settingsDoc] = await Promise.all([
          db.collection('orders').doc(orderId).get(),
          db.collection('settings').doc('general').get()
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'orders/settings');
        throw e;
      }

      if (!orderDoc.exists || !settingsDoc.exists) {
        return res.status(404).json({ error: 'Order or Settings not found' });
      }

      const order = orderDoc.data() as any;
      const settings = settingsDoc.data() as any;

      // 2. Validate order status
      if (order.status !== 'FINISHED' && order.paymentStatus !== 'PAID') {
        return res.status(400).json({ error: 'Order must be FINISHED and PAID before emitting invoice' });
      }

      // 3. Validate fiscal settings
      if (!settings.certificateBase64 || !settings.certificatePassword) {
        return res.status(400).json({ error: 'Fiscal settings (certificate and password) not configured' });
      }

      if (!settings.fiscalEnvironment || !settings.cscId || !settings.cscToken) {
        return res.status(400).json({ error: 'Fiscal environment settings not configured' });
      }

      // 4. Validate fiscal data from settings
      const requiredFiscalFields = ['CNPJ', 'IE', 'UF', 'xMun'];
      const missingFields = requiredFiscalFields.filter(field => !settings[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ error: `Missing fiscal fields: ${missingFields.join(', ')}` });
      }

      // 5. Validate customer data in order
      if (!order.customerName || !order.customerPhone) {
        return res.status(400).json({ error: 'Order must have customer name and phone' });
      }

      // 6. Validate items have fiscal data
      const itemsWithoutFiscal = (order.items || []).filter((item: any) => !item.ncm || !item.cfop);
      if (itemsWithoutFiscal.length > 0) {
        return res.status(400).json({ error: 'All items must have NCM and CFOP configured' });
      }

      console.log(`Emitting NFC-e for order ${orderId} in ${settings.fiscalEnvironment} environment...`);

      // 7. Simulation of successful emission
      const mockProtocol = `351000${Math.floor(Math.random() * 1000000000)}`;
      const mockInvoiceUrl = `https://portal.fazenda.sp.gov.br/consultar-nfe?chave=${mockProtocol}`;

      // 8. Update order with invoice info
      try {
        await db.collection('orders').doc(orderId).update({
          invoiceEmitted: true,
          invoiceProtocol: mockProtocol,
          invoiceUrl: mockInvoiceUrl,
          invoiceEmittedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
        throw e;
      }

      res.json({
        success: true,
        protocol: mockProtocol,
        invoiceUrl: mockInvoiceUrl,
        message: `NFC-e emitida com sucesso em ambiente de ${settings.fiscalEnvironment === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}.`
      });
    } catch (error: any) {
      console.error('Fiscal Emission Error:', error.message);
      res.status(500).json({ error: 'Failed to emit NFC-e: ' + error.message });
    }
  });

  // WhatsApp Webhook (Simulated Bot)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const { From, Body } = req.body; // Standard Twilio-like payload
      console.log(`Received WhatsApp message from ${From}: ${Body}`);

      const db = getDb();
      const settingsDoc = await db.collection('settings').doc('general').get();
      const settings = settingsDoc.data();

      if (settings?.whatsappBotEnabled) {
        const welcomeMessage = settings.whatsappBotWelcomeMessage || "Olá! Confira nosso cardápio:";
        const menuUrl = settings.whatsappBotMenuUrl || "https://seucardapio.com";
        
        const responseMessage = `${welcomeMessage}\n\n${menuUrl}`;
        
        // In a real scenario, you would call the WhatsApp API here (Twilio, Meta, etc.)
        console.log(`Bot Response to ${From}: ${responseMessage}`);
        
        // For Twilio, you would return TwiML
        res.set('Content-Type', 'text/xml');
        res.send(`
          <Response>
            <Message>${responseMessage}</Message>
          </Response>
        `);
        return;
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('WhatsApp Webhook Error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
