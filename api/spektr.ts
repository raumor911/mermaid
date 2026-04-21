import { GoogleGenAI } from "@google/genai";
import { buildSpektrPrompt } from "../src/lib/spektr/prompts";
import type {
  SpektrApiErrorResponse,
  SpektrApiRequest,
  SpektrApiSuccessResponse,
  SpektrDiagramType,
  SpektrMode,
} from "../src/lib/spektr/types";

const DEFAULT_SPEKTR_MODEL = "gemini-1.5-flash";
const MAX_PROMPT_LENGTH = 4_000;
const MAX_CURRENT_CODE_LENGTH = 120_000;
const MAX_PROJECT_LENGTH = 120;
const MAX_BODY_LENGTH = 150_000;
const SERVER_API_KEY_ENV_NAMES = ["SPEKTR_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;
const LEGACY_API_KEY_ENV_NAMES = ["VITE_GEMINI_API_KEY"] as const;

const getEnv = () => {
  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }
  return {};
};

type ApiKeySource =
  | (typeof SERVER_API_KEY_ENV_NAMES)[number]
  | (typeof LEGACY_API_KEY_ENV_NAMES)[number];

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

let hasWarnedAboutLegacyApiKey = false;

const sanitizeMermaid = (content: string) => {
  return content.replace(/```mermaid/gi, "").replace(/```/g, "").trim();
};

const isMode = (value: unknown): value is SpektrMode => {
  return value === "generate" || value === "analyze";
};

const isDiagramType = (value: unknown): value is SpektrDiagramType => {
  return value === "mermaid" || value === "c4context" || value === "bpmn";
};

const readEnvValue = (envName: ApiKeySource) => {
  return getEnv()[envName]?.trim();
};

const getApiKeyConfig = () => {
  for (const envName of SERVER_API_KEY_ENV_NAMES) {
    const envValue = readEnvValue(envName);

    if (envValue) {
      return {
        apiKey: envValue,
        source: envName,
      };
    }
  }

  for (const envName of LEGACY_API_KEY_ENV_NAMES) {
    const envValue = readEnvValue(envName);

    if (envValue) {
      if (!hasWarnedAboutLegacyApiKey) {
        hasWarnedAboutLegacyApiKey = true;
        console.warn(
          `SPEKTR API is using deprecated env var ${envName}. Migrate to SPEKTR_API_KEY or GEMINI_API_KEY.`,
        );
      }

      return {
        apiKey: envValue,
        source: envName,
      };
    }
  }

  throw new HttpError(
    500,
    "SPEKTR no está configurado. Define SPEKTR_API_KEY o GEMINI_API_KEY en el servidor.",
  );
};

const getModelName = () => {
  const env = getEnv();
  return (
    env.SPEKTR_MODEL?.trim() ||
    env.GEMINI_MODEL?.trim() ||
    DEFAULT_SPEKTR_MODEL
  );
};

const toPublicHttpError = (error: unknown, modelName: string) => {
  if (error instanceof HttpError) {
    return error;
  }

  const providerMessage = error instanceof Error ? error.message.trim() : String(error);

  if (!providerMessage) {
    return new HttpError(500, "SPEKTR no pudo completar la solicitud.");
  }

  if (
    /(api key|api_key).*(not valid|invalid)|invalid api key|permission denied|unauthorized/i.test(
      providerMessage,
    )
  ) {
    return new HttpError(
      500,
      "SPEKTR no está configurado correctamente. Verifica la API key del servidor.",
    );
  }

  if (
    /model.*(not found|not supported|not available|unsupported)|is not found for api version|404/i.test(
      providerMessage,
    )
  ) {
    return new HttpError(
      502,
      `El modelo configurado para SPEKTR no está disponible (${modelName}).`,
    );
  }

  if (/quota|rate limit|resource exhausted|too many requests|429/i.test(providerMessage)) {
    return new HttpError(
      503,
      "SPEKTR alcanzó el límite temporal del proveedor. Intenta nuevamente en unos minutos.",
    );
  }

  return new HttpError(502, `Error de SPEKTR: ${providerMessage.slice(0, 100)}`);
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

  let modelName = getModelName();
  let apiKeySource: ApiKeySource | "missing" = "missing";

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

    const apiKeyConfig = getApiKeyConfig();
    modelName = getModelName();
    apiKeySource = apiKeyConfig.source;

    const ai = new GoogleGenAI({ apiKey: apiKeyConfig.apiKey });
    const result = await ai.models.generateContent({
      model: modelName,
      contents: buildSpektrPrompt(payload.mode, payload)
    });

    const content = result.text?.trim() ?? "";

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
    const publicError = toPublicHttpError(error, modelName);
    const statusCode = publicError.statusCode;
    const message = publicError.message;

    if (statusCode >= 500) {
      console.error("SPEKTR API error", {
        statusCode,
        modelName,
        apiKeySource,
        error,
      });
    }

    return sendJson(res, statusCode, { error: message });
  }
}
