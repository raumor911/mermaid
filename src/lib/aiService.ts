import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIServiceMode = "generate" | "analyze";

interface AIServiceBasePayload {
  prompt: string;
  currentCode?: string;
  currentProject?: string;
}

export interface MermaidGenerationResult {
  mode: "generate";
  content: string;
  code: string;
}

export interface QualityAnalysisResult {
  mode: "analyze";
  content: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta VITE_GEMINI_API_KEY en el entorno de Vite.");
  }

  return apiKey;
};

const getModelName = () => {
  return import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
};

const getModel = () => {
  const client = new GoogleGenerativeAI(getApiKey());
  return client.getGenerativeModel({ model: getModelName() });
};

const getCurrentCode = (currentCode?: string) => {
  return currentCode?.trim() || "graph TD\n    A[Inicio] --> B[Fin]";
};

const sanitizeMermaid = (content: string) => {
  return content.replace(/```mermaid/gi, "").replace(/```/g, "").trim();
};

export async function generateMermaidDiagram(
  payload: AIServiceBasePayload,
): Promise<MermaidGenerationResult> {
  const model = getModel();
  const prompt = `
Eres AISentinel de RAUVIA.
Genera o ajusta un diagrama Mermaid válido en función de la solicitud del usuario.

Proyecto: ${payload.currentProject || "RAUVIA Mermaid Workspace"}
Código Mermaid actual:
\`\`\`mermaid
${getCurrentCode(payload.currentCode)}
\`\`\`

Solicitud del usuario:
${payload.prompt}

Reglas obligatorias:
1. Responde solo con código Mermaid válido.
2. No uses bloques markdown.
3. Mantén la estructura actual salvo que la solicitud exija cambiarla.
4. Usa nombres claros en español cuando sea posible.
5. No agregues explicaciones.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const code = sanitizeMermaid(response.text());

  if (!code) {
    throw new Error("La IA no devolvió código Mermaid.");
  }

  return {
    mode: "generate",
    content: code,
    code,
  };
}

export async function analyzeDiagramQuality(
  payload: AIServiceBasePayload,
): Promise<QualityAnalysisResult> {
  const model = getModel();
  const prompt = `
Actúa como AISentinel de RAUVIA.
Analiza el siguiente diagrama Mermaid con foco en ISO 25010 y criterios RAUVIA.

Proyecto: ${payload.currentProject || "RAUVIA Mermaid Workspace"}
Solicitud adicional del usuario:
${payload.prompt || "Analiza la calidad general del diagrama."}

Diagrama Mermaid:
\`\`\`mermaid
${getCurrentCode(payload.currentCode)}
\`\`\`

Responde en español con este formato exacto:
RESUMEN:
- máximo 3 bullets

ISO 25010:
- Adecuación funcional
- Mantenibilidad
- Fiabilidad
- Usabilidad
- Seguridad

RAUVIA:
- Claridad arquitectónica
- Trazabilidad del flujo
- Riesgos operativos
- Recomendaciones priorizadas

Reglas:
1. Sé concreto y accionable.
2. No devuelvas Mermaid.
3. No uses markdown con títulos #.
4. Si falta contexto, dilo explícitamente sin inventar.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text().trim();

  if (!content) {
    throw new Error("La IA no devolvió análisis.");
  }

  return {
    mode: "analyze",
    content,
  };
}
