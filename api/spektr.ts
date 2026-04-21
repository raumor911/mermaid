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
    return res.status(500).json({ error: "SPEKTR: API Key no detectada." });
  }

  try {
    const { mode, prompt, currentCode } = req.body || {};

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Forzamos el uso de la API v1 (estable) en lugar de v1beta
    const model = genAI.getGenerativeModel(
      { model: modelName },
      { apiVersion: 'v1' }
    );

    const fullPrompt = `
      Actúa como SPEKTR.
      Modo: ${mode === 'generate' ? 'Generación' : 'Análisis'}
      Código actual: \n${currentCode || ''}
      Solicitud: ${prompt}
      
      Reglas:
      1. Si es generación, responde SOLO con el código Mermaid.
      2. No uses bloques markdown.
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
      error: `Error de SPEKTR (v1): ${error.message || 'Error desconocido'}` 
    });
  }
}
