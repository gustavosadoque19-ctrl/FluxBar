import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { FiscalService } from "./src/services/fiscalService.ts";
import type { FiscalConfig } from "./src/services/fiscalService.ts";
import { DANFe } from "node-sped-pdf";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Fiscal API Endpoints
  app.post("/api/fiscal/status", async (req, res) => {
    try {
      const config: FiscalConfig = req.body;
      const fiscal = new FiscalService(config);
      const status = await fiscal.checkStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      console.error("[FISCAL API] Error checking status:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/fiscal/emit", async (req, res) => {
    try {
      const { config, order, settings } = req.body;
      const fiscal = new FiscalService(config);
      
      // Gerar XML
      const xml = await fiscal.buildNFeXml(order, settings);
      
      // Assinar e Enviar
      const result = await fiscal.signAndSend(xml);
      
      // Se sucesso, gerar PDF (DANFE)
      let invoiceUrl = "";
      if (result.retEnviNFe?.cStat === '103' || result.retEnviNFe?.cStat === '104') {
        // Simular URL do PDF por enquanto, ou gerar e salvar em algum lugar
        // Em um app real, você salvaria o XML no Storage e o PDF também
        invoiceUrl = `/api/fiscal/danfe/${order.id}`;
      }

      res.json({ success: true, result, invoiceUrl });
    } catch (error: any) {
      console.error("[FISCAL API] Error emitting invoice:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/fiscal/danfe/:orderId", async (req, res) => {
    try {
      // Em um cenário real, você buscaria o XML autorizado do banco de dados
      // Aqui vamos simular a geração a partir de um XML mockado ou salvo
      const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><nfeProc>...</nfeProc>"; // Mock
      
      const pdfBuffer = await DANFe({ xml });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=danfe-${req.params.orderId}.pdf`);
      res.send(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error("[FISCAL API] Error generating DANFE:", error);
      res.status(500).send("Erro ao gerar PDF do DANFE.");
    }
  });

  // Mock Tax Invoice API Endpoint (Legacy)
  app.post("/api/emit-invoice", (req, res) => {
    const { orderId, total, items, customer } = req.body;
    
    console.log(`[TAX API] Emitting invoice for Order ${orderId}...`);
    
    // Simulate API processing delay
    setTimeout(() => {
      const success = true; // Simulate success
      
      if (success) {
        res.json({
          success: true,
          invoiceUrl: `https://mock-tax-api.com/danfe/${orderId}.pdf`,
          invoiceNumber: Math.floor(Math.random() * 1000000).toString(),
          message: "Nota Fiscal emitida com sucesso!"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Erro ao emitir nota fiscal na SEFAZ."
        });
      }
    }, 1500);
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
