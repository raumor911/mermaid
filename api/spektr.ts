import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_SPEKTR_MODEL = "gemini-1.5-flash"; // Intentaremos este primero
const FALLBACK_MODEL = "gemini-1.5-flash-latest";

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
  let modelName = getModelName();

  if (!apiKey) {
    return res.status(500).json({ 
      error: "SPEKTR no detecta API Key en Vercel. Verifica las Environment Variables." 
    });
  }

  // Debug parcial de llave para confirmar actualización en Vercel
  const keyDebug = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;

  try {
    const { mode, prompt, currentCode, diagramType } = req.body || {};

    const genAI = new GoogleGenerativeAI(apiKey);
    let model = genAI.getGenerativeModel({ model: modelName });

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

    let result;
    const modelsToTry = [modelName, "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];
    let lastError;

    for (const modelId of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelId });
        result = await model.generateContent(fullPrompt);
        if (result) break;
      } catch (e: any) {
        lastError = e;
        if (e.message?.includes("404") || e.message?.includes("not found")) {
          continue; // Probamos el siguiente
        } else {
          throw e; // Si es otro error (como 401), paramos
        }
      }
    }

    if (!result) {
      // DIAGNÓSTICO CRÍTICO: Si llegamos aquí, vamos a preguntar a Google qué modelos SÍ podemos ver.
      try {
        const available = await genAI.listModels();
        const modelNames = available.models?.map(m => m.name) || [];
        throw new Error(`Modelos disponibles para tu llave: ${modelNames.join(", ") || "NINGUNO"}. Por favor activa 'Generative Language API' en tu consola de Google.`);
      } catch (listError: any) {
        throw new Error(`Error fatal: Tu llave no puede ni siquiera listar modelos. Motivo: ${listError.message || lastError.message}`);
      }
    }
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
      error: `Error de SPEKTR (Key: ${keyDebug}): ${error.message || 'Error desconocido'}` 
    });
  }
}
