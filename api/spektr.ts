import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_SPEKTR_MODEL = "gemini-2.5-flash"; // El modelo que sí tienes en tu lista

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
    
    // Usamos el modelo 2.5 o 3 detectado en tu lista
    const model = genAI.getGenerativeModel({ model: modelName });

    const fullPrompt = `
      Eres SPEKTR, un experto en arquitectura y diagramas.
      Modo: ${mode === 'generate' ? 'Generación' : 'Análisis'}
      Código Mermaid actual: \n${currentCode || ''}
      Solicitud del usuario: ${prompt}
      
      Reglas:
      1. Si es generación, responde SOLO con el código Mermaid válido.
      2. Si es análisis, responde en español de forma técnica y concisa.
      3. No uses bloques markdown si es generación.
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
    return res.status(500).json({ 
      error: `Error de SPEKTR: ${error.message || 'Error desconocido'}` 
    });
  }
}
