import express from "express";
import { createServer as createViteServer } from "vite";
import { vantageDb, catalystDb, blueprintDb } from "./src/db.ts";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Catalyst Leads
  app.get("/api/catalyst/leads", (req, res) => {
    try {
      const leads = catalystDb.prepare("SELECT * FROM leads").all();
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Blueprint Designs & BOM
  app.get("/api/blueprint/designs", (req, res) => {
    try {
      const designs = blueprintDb.prepare("SELECT * FROM designs").all();
      res.json(designs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/blueprint/designs/:id/bom", (req, res) => {
    try {
      const bom = blueprintDb.prepare("SELECT * FROM bom_items WHERE design_id = ?").all(req.params.id);
      res.json(bom);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects (Vantage)
  app.get("/api/projects", (req, res) => {
    const projects = vantageDb.prepare("SELECT * FROM projects").all();
    res.json(projects);
  });

  app.get("/api/projects/:id", (req, res) => {
    const project = vantageDb.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    const bom = vantageDb.prepare("SELECT * FROM bom_items WHERE project_id = ?").all(req.params.id);
    const pos = vantageDb.prepare("SELECT * FROM purchase_orders WHERE project_id = ?").all(req.params.id);
    res.json({ ...project, bom, purchase_orders: pos });
  });

  // Catalyst Sync Webhook Simulation
  app.post("/api/sync-catalyst-funds", (req, res) => {
    const { id_lead_unico, project_name, budget_total_contrato, monto_anticipo_real } = req.body;
    
    try {
      const existing = vantageDb.prepare("SELECT id FROM projects WHERE catalyst_lead_id = ?").get(id_lead_unico) as { id: string } | undefined;
      
      if (existing) {
        vantageDb.prepare("UPDATE projects SET spending_limit = ?, name = ? WHERE id = ?").run(monto_anticipo_real, project_name, existing.id);
      } else {
        vantageDb.prepare("INSERT INTO projects (id, name, catalyst_lead_id, spending_limit) VALUES (?, ?, ?, ?)").run(
          uuidv4(), project_name, id_lead_unico, monto_anticipo_real
        );
      }
      
      vantageDb.prepare("INSERT INTO system_logs (event, details) VALUES (?, ?)").run(
        "CATALYST_SYNC", `Synced project ${project_name} with limit ${monto_anticipo_real}`
      );
      
      res.status(201).json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // The Sentinel - AI Invoice Validation
  app.post("/api/validate-invoice", async (req, res) => {
    const { projectId, invoiceData, fileName } = req.body;
    
    try {
      const project = vantageDb.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as any;
      const bom = vantageDb.prepare("SELECT * FROM bom_items WHERE project_id = ?").all(projectId) as any[];
      
      if (!project) return res.status(404).json({ error: "Project not found" });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Prompt construction
      const prompt = `
        Analyze this invoice data and compare it with the Bill of Materials (BOM).
        Invoice: ${JSON.stringify(invoiceData)}
        BOM: ${JSON.stringify(bom)}
        
        Rules:
        1. Check if items in invoice exist in BOM (use semantic mapping if names differ slightly).
        2. Check if quantities in invoice + previously spent don't exceed BOM quantities.
        3. Extract total amount.
        
        Return a JSON object with:
        {
          "matches": boolean,
          "items": [{ "sku": string, "description": string, "quantity": number, "price": number, "status": "APPROVED" | "UNAUTHORIZED_ITEM" | "EXCESS_QUANTITY" }],
          "total_invoice": number,
          "reasoning": string,
          "vendor": string
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matches: { type: Type.BOOLEAN },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sku: { type: Type.STRING },
                    description: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    price: { type: Type.NUMBER },
                    status: { type: Type.STRING }
                  }
                }
              },
              total_invoice: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              vendor: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      
      // Financial Shield Logic
      const newTotalSpent = project.total_spent + result.total_invoice;
      let status = "APPROVED";
      
      if (!result.matches) {
        status = "TECH_ERROR";
      } else if (newTotalSpent > project.spending_limit) {
        status = "BLOCKED";
      }

      const poId = uuidv4();
      vantageDb.prepare(`
        INSERT INTO purchase_orders (id, project_id, vendor_name, total_amount, status, ai_reasoning)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(poId, projectId, result.vendor, result.total_invoice, status, result.reasoning);

      if (status === "APPROVED") {
        vantageDb.prepare("UPDATE projects SET total_spent = ? WHERE id = ?").run(newTotalSpent, projectId);
      }

      res.json({ poId, status, result });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Inventory
  app.get("/api/inventory", (req, res) => {
    const items = vantageDb.prepare("SELECT * FROM inventory").all();
    res.json(items);
  });

  // Dashboard Summary
  app.get("/api/dashboard-summary", (req, res) => {
    const summary = vantageDb.prepare(`
      SELECT 
        p.name as project_name,
        p.spending_limit,
        p.total_spent,
        (p.spending_limit - p.total_spent) as remaining_budget,
        (SELECT COUNT(*) FROM purchase_orders WHERE project_id = p.id AND status = 'BLOCKED') as blocked_count
      FROM projects p
    `).all();
    res.json(summary);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
