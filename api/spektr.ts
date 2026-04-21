import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_SPEKTR_MODEL = "gemini-1.5-flash";

const getEnv = () => {
  return typeof process !== "undefined" ? process.env : {};
};

const getApiKey = () => {
  const env = getEnv();
  return env.GEMINI_API_KEY || env.SPEKTR_API_KEY || env.GOOGLE_API_KEY || env.VITE_GEMINI_API_KEY;
};

const getModelName = () => {
  const env = getEnv();
  return env.SPEKTR_MODEL || env.GEMINI_MODEL || DEFAULT_SPEKTR_MODEL;
};

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = getApiKey();
  const modelName = getModelName();

  if (!apiKey) {
    return res.status(500).json({ 
      error: "SPEKTR no detecta API Key en Vercel. Verifica las Environment Variables." 
    });
  }

  try {
    const { mode, prompt, currentCode, diagramType } = req.body || {};

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const fullPrompt = `
      Actúa como SPEKTR, experto en diagramas y arquitectura.
      Modo: ${mode === 'generate' ? 'Generación de código Mermaid' : 'Análisis de diagrama'}
      Código actual:
      \`\`\`
      ${currentCode || 'graph TD\n  A --> B'}
      \`\`\`
      
      Solicitud: ${prompt}
      
      Reglas:
      1. Si es generación, responde SOLO con el código Mermaid.
      2. Si es análisis, responde en español con bullets cortos.
      3. No uses explicaciones innecesarias.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text().trim();

    if (mode === "generate") {
      const cleanCode = text.replace(/```mermaid/gi, "").replace(/```/g, "").trim();
      return res.status(200).json({ mode, content: cleanCode, code: cleanCode });
    }

    return res.status(200).json({ mode, content: text });

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ 
      error: `Error de SPEKTR: ${error.message || 'Error desconocido'}` 
    });
  }
}
