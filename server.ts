// Importação de módulos necessários para o servidor
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import qs from "qs";

// Carrega variáveis de ambiente do arquivo .env
dotenv.config();

// Inicialização do Firebase Admin (Backend)
// O Firebase Admin permite que o servidor acesse o banco de dados com privilégios totais
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    // Tenta ler o arquivo de configuração gerado pelo AI Studio
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    console.log(`Inicializando Firebase Admin para o projeto: ${firebaseConfig.projectId}`);
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (e: any) {
    console.error("Erro ao inicializar Firebase Admin com config:", e.message);
    if (admin.apps.length === 0) admin.initializeApp();
  }
} else {
  // Caso o arquivo não exista, tenta inicialização padrão
  console.warn("firebase-applet-config.json não encontrado, usando inicialização padrão");
  if (admin.apps.length === 0) admin.initializeApp();
}

// Função auxiliar para obter a instância correta do Firestore (banco de dados)
const getDb = () => {
  try {
    // Se houver um ID de banco de dados específico no config, usa ele
    if (firebaseConfig?.firestoreDatabaseId) {
      return getFirestore(firebaseConfig.firestoreDatabaseId);
    }
    return getFirestore();
  } catch (e: any) {
    console.error("Erro ao obter instância do Firestore:", e.message);
    return getFirestore();
  }
};

// Tipos de operações para logs de erro
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Função para tratar erros do Firestore no backend e gerar logs detalhados
function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error.message || String(error),
    code: error.code,
    operationType,
    path,
    timestamp: new Date().toISOString()
  };
  console.error('Erro de Backend Firestore:', JSON.stringify(errInfo, null, 2));
  
  // Alerta específico para erros de permissão (IAM)
  if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
    console.error('CRÍTICO: Permissão Negada. Certifique-se de que a conta de serviço tem o papel "Cloud Datastore User".');
  }
  
  return errInfo;
}

// Função principal que inicia o servidor Express
async function startServer() {
  const app = express();
  const PORT = 3000; // Porta padrão do ambiente

  app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

  // Rota de verificação de saúde do sistema
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Rota de Autenticação com o iFood
  app.post("/api/ifood/auth", async (req, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      
      // Chamada para obter o token de acesso do iFood
      const response = await axios.post("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", qs.stringify({
        grant_type: "client_credentials",
        client_id: clientId || process.env.IFOOD_CLIENT_ID,
        client_secret: clientSecret || process.env.IFOOD_CLIENT_SECRET
      }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const { accessToken, refreshToken, expiresIn } = response.data;
      
      // Salva os tokens no Firestore para uso futuro
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
      console.error('Erro de Autenticação iFood:', error.response?.data || error.message);
      res.status(500).json({ error: 'Falha ao autenticar com iFood' });
    }
  });

  // Rota para buscar novos pedidos do iFood (Polling)
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
        return res.status(401).json({ error: 'iFood não conectado' });
      }

      // Busca eventos pendentes no iFood
      const response = await axios.get("https://merchant-api.ifood.com.br/order/v1.0/events:polling", {
        headers: { Authorization: `Bearer ${ifoodData.accessToken}` }
      });

      const events = response.data;
      if (events && events.length > 0) {
        // Processa cada evento recebido
        for (const event of events) {
          if (event.eventType === 'PLACED') { // Novo pedido realizado
            const orderResponse = await axios.get(`https://merchant-api.ifood.com.br/order/v1.0/orders/${event.orderId}`, {
              headers: { Authorization: `Bearer ${ifoodData.accessToken}` }
            });
            
            const ifoodOrder = orderResponse.data;
            
            // Mapeia o pedido do iFood para o formato do nosso sistema
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
              // Adiciona o pedido ao nosso banco de dados
              await db.collection('orders').add(orderData);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, 'orders');
            }
          }
        }

        // Confirma o recebimento dos eventos para o iFood
        await axios.post("https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment", events.map((e: any) => ({ id: e.id })), {
          headers: { Authorization: `Bearer ${ifoodData.accessToken}` }
        });
      }

      res.json({ success: true, eventsProcessed: events?.length || 0 });
    } catch (error: any) {
      console.error('Erro de Polling iFood:', error.response?.data || error.message);
      res.status(500).json({ error: 'Falha ao buscar pedidos do iFood' });
    }
  });

  // Rota para Emissão de NFC-e (Integração Fiscal com NFe.io)
  app.post("/api/fiscal/emitir-nfc-e", async (req, res) => {
    try {
      const { orderId } = req.body;
      const db = getDb();
      
      // 1. Busca o pedido e as configurações privadas (certificados, etc.)
      let orderDoc, settingsDoc;
      try {
        [orderDoc, settingsDoc] = await Promise.all([
          db.collection('orders').doc(orderId).get(),
          db.collection('settings').doc('private').get()
        ]);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'orders/settings');
        throw e;
      }
      
      if (!orderDoc.exists || !settingsDoc.exists) {
        return res.status(404).json({ error: 'Pedido ou Configurações Fiscais não encontrados' });
      }
      
      const order = orderDoc.data() as any;
      const settings = settingsDoc.data() as any;
      
      // Verifica se o certificado digital está configurado
      if (!settings.certificateBase64 || !settings.certificatePassword) {
        return res.status(400).json({ error: 'Certificado digital não configurado' });
      }

      // 2. Prepara os dados e chama a API da NFe.io
      const apiKey = process.env.NFE_IO_API_KEY;
      const companyId = settings.nfeIoCompanyId;

      // Se não houver chave de API, cai no modo de simulação
      if (!apiKey || !companyId) {
        console.warn('Chave API NFe.io ou Company ID não configurados. Usando simulação.');
        const mockProtocol = `351000${Math.floor(Math.random() * 1000000000)}`;
        const mockInvoiceUrl = `https://portal.fazenda.sp.gov.br/consultar-nfe?chave=${mockProtocol}`;

        try {
          await db.collection('orders').doc(orderId).update({
            invoiceEmitted: true,
            invoiceUrl: mockInvoiceUrl,
            updatedAt: FieldValue.serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `orders/${orderId}`);
          throw e;
        }

        return res.json({ 
          success: true, 
          protocol: mockProtocol, 
          invoiceUrl: mockInvoiceUrl,
          message: `[SIMULAÇÃO] NFC-e emitida com sucesso (${settings.fiscalEnvironment}).`
        });
      }

      console.log(`Emitindo NFC-e REAL para o pedido ${orderId} via NFe.io...`);
      
      try {
        // Mapeia itens do pedido para o formato da NFe.io
        const items = order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          ncmCode: item.ncm || '21069090', // NCM padrão para alimentos
          taxCode: item.taxCode || '5102', // CFOP padrão para venda interna
        }));

        const payload = {
          type: 'NFCe',
          environment: settings.fiscalEnvironment === 'producao' ? 'Production' : 'Development',
          items: items,
          buyer: order.customer ? {
            name: order.customer.name,
            federalTaxNumber: order.customer.document?.replace(/\D/g, ''),
            email: order.customer.email,
          } : undefined,
          payments: [
            {
              type: order.paymentMethod === 'CASH' ? 'Dinheiro' : 
                    order.paymentMethod === 'CARD' ? 'CartaoDebito' : 'Outros',
              amount: order.total
            }
          ]
        };

        // Chamada real para a API da NFe.io
        const nfeResponse = await axios.post(
          `https://api.nfe.io/v1/companies/${companyId}/productinvoices`,
          payload,
          {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        const invoiceData = nfeResponse.data;
        const protocol = invoiceData.protocol || invoiceData.id;
        const invoiceUrl = invoiceData.pdfUrl || `https://nfe.io/consultar/${invoiceData.id}`;

        // Atualiza o pedido com as informações da nota emitida
        await db.collection('orders').doc(orderId).update({
          invoiceEmitted: true,
          invoiceId: invoiceData.id,
          invoiceUrl: invoiceUrl,
          updatedAt: FieldValue.serverTimestamp()
        });

        res.json({ 
          success: true, 
          protocol: protocol, 
          invoiceUrl: invoiceUrl,
          message: `NFC-e emitida com sucesso via NFe.io (${settings.fiscalEnvironment}).`
        });
      } catch (nfeError: any) {
        console.error('Erro API NFe.io:', nfeError.response?.data || nfeError.message);
        const errorMessage = nfeError.response?.data?.message || nfeError.message;
        res.status(500).json({ error: 'Erro na API NFe.io: ' + errorMessage });
      }
    } catch (error: any) {
      console.error('Erro de Emissão Fiscal:', error.message);
      res.status(500).json({ error: 'Falha ao emitir NFC-e: ' + error.message });
    }
  });

  // Webhook para WhatsApp (Simulação de Bot)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const { From, Body } = req.body;
      console.log(`Mensagem WhatsApp recebida de ${From}: ${Body}`);

      const db = getDb();
      const settingsDoc = await db.collection('settings').doc('general').get();
      const settings = settingsDoc.data();

      // Se o bot estiver ativado, responde automaticamente
      if (settings?.whatsappBotEnabled) {
        const welcomeMessage = settings.whatsappBotWelcomeMessage || "Olá! Confira nosso cardápio:";
        const menuUrl = settings.whatsappBotMenuUrl || "https://seucardapio.com";
        
        const responseMessage = `${welcomeMessage}\n\n${menuUrl}`;
        
        console.log(`Resposta do Bot para ${From}: ${responseMessage}`);
        
        // Retorna formato XML (padrão Twilio)
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
      console.error('Erro no Webhook WhatsApp:', error);
      res.status(500).send('Erro Interno');
    }
  });

  // Configuração do middleware Vite para desenvolvimento
  // Isso permite que o React e o Express rodem juntos na mesma porta
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Em produção, serve os arquivos estáticos da pasta 'dist'
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Inicia o servidor na porta 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

// Executa a função de início do servidor
startServer();
