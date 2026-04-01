import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // WhatsApp Webhook (Simulated Bot)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const { From, Body } = req.body; // Standard Twilio-like payload
      console.log(`Received WhatsApp message from ${From}: ${Body}`);

      const db = admin.firestore();
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
