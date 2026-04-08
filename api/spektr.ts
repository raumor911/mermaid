import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSpektrPrompt } from "../src/lib/spektr/prompts";
import type {
  SpektrApiErrorResponse,
  SpektrApiRequest,
  SpektrApiSuccessResponse,
  SpektrDiagramType,
  SpektrMode,
} from "../src/lib/spektr/types";

const DEFAULT_SPEKTR_MODEL = "gemini-2.5-flash";
const MAX_PROMPT_LENGTH = 4_000;
const MAX_CURRENT_CODE_LENGTH = 120_000;
const MAX_PROJECT_LENGTH = 120;
const MAX_BODY_LENGTH = 150_000;
const serverEnv =
  (globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }).process?.env ?? {};

type ServerlessRequest = {
  method?: string;
  body?: unknown;
};

type ServerlessResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (statusCode: number) => ServerlessResponse;
  json: (body: SpektrApiSuccessResponse | SpektrApiErrorResponse) => void;
};

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const sanitizeMermaid = (content: string) => {
  return content.replace(/```mermaid/gi, "").replace(/```/g, "").trim();
};

const isMode = (value: unknown): value is SpektrMode => {
  return value === "generate" || value === "analyze";
};

const isDiagramType = (value: unknown): value is SpektrDiagramType => {
  return value === "mermaid" || value === "c4context" || value === "bpmn";
};

const getApiKey = () => {
  const apiKey = serverEnv.SPEKTR_API_KEY?.trim() || serverEnv.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new HttpError(500, "Configuración incompleta del servicio.");
  }

  return apiKey;
};

const getModelName = () => {
  return (
    serverEnv.SPEKTR_MODEL?.trim() ||
    serverEnv.GEMINI_MODEL?.trim() ||
    DEFAULT_SPEKTR_MODEL
  );
};

const parseRequestBody = (body: unknown) => {
  if (typeof body === "string") {
    if (body.length > MAX_BODY_LENGTH) {
      throw new HttpError(413, "La solicitud excede el tamaño permitido.");
    }

    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "Body inválido.");
    }
  }

  if (body && typeof body === "object") {
    return body as Record<string, unknown>;
  }

  throw new HttpError(400, "Body inválido.");
};

const readRequiredTrimmedString = (
  value: unknown,
  fieldLabel: string,
  maxLength: number,
) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldLabel} inválido.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new HttpError(400, `${fieldLabel} es obligatorio.`);
  }

  if (normalizedValue.length > maxLength) {
    throw new HttpError(413, `${fieldLabel} excede el tamaño permitido.`);
  }

  return normalizedValue;
};

const readOptionalTrimmedString = (
  value: unknown,
  fieldLabel: string,
  maxLength: number,
) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldLabel} inválido.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue.length > maxLength) {
    throw new HttpError(413, `${fieldLabel} excede el tamaño permitido.`);
  }

  return normalizedValue;
};

const normalizePayload = (input: Record<string, unknown>): SpektrApiRequest => {
  const mode = input.mode;
  const diagramType = input.diagramType;

  if (!isMode(mode)) {
    throw new HttpError(400, "Modo SPEKTR inválido.");
  }

  return {
    mode,
    prompt: readRequiredTrimmedString(input.prompt, "El prompt", MAX_PROMPT_LENGTH),
    currentCode: readOptionalTrimmedString(
      input.currentCode,
      "El código actual",
      MAX_CURRENT_CODE_LENGTH,
    ),
    currentProject: readOptionalTrimmedString(
      input.currentProject,
      "El proyecto actual",
      MAX_PROJECT_LENGTH,
    ),
    diagramType: isDiagramType(diagramType) ? diagramType : undefined,
  };
};

const sendJson = (
  res: ServerlessResponse,
  statusCode: number,
  body: SpektrApiSuccessResponse | SpektrApiErrorResponse,
) => {
  res.status(statusCode).json(body);
};

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Método no permitido." });
  }

  try {
    const payload = normalizePayload(parseRequestBody(req.body));

    if (payload.mode === "generate" && payload.diagramType === "bpmn") {
      return sendJson(res, 400, {
        error: "La generación con SPEKTR no está disponible para pestañas BPMN.",
      });
    }

    const client = new GoogleGenerativeAI(getApiKey());
    const model = client.getGenerativeModel({ model: getModelName() });
    const result = await model.generateContent(buildSpektrPrompt(payload.mode, payload));
    const response = await result.response;
    const content = response.text().trim();

    if (!content) {
      throw new Error(
        payload.mode === "generate"
          ? "SPEKTR no devolvió código Mermaid."
          : "SPEKTR no devolvió análisis.",
      );
    }

    if (payload.mode === "generate") {
      const code = sanitizeMermaid(content);

      if (!code) {
        throw new Error("SPEKTR no devolvió código Mermaid.");
      }

      return sendJson(res, 200, {
        mode: "generate",
        content: code,
        code,
      });
    }

    return sendJson(res, 200, {
      mode: "analyze",
      content,
    });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message =
      statusCode >= 500
        ? "SPEKTR no pudo completar la solicitud."
        : error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al consultar SPEKTR.";

    if (statusCode >= 500) {
      console.error("SPEKTR API error", error);
    }

    return sendJson(res, statusCode, { error: message });
  }
}
