import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.SPEKTR_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "No se detectó API Key en el servidor." });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return res.status(200).json({
      message: "Lista de modelos disponibles para tu llave:",
      data: data
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
