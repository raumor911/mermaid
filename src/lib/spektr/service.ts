import type {
  SpektrApiErrorResponse,
  SpektrApiRequest,
  SpektrApiSuccessResponse,
  SpektrAnalysisResult,
  SpektrGenerationResult,
  SpektrRequest,
} from "./types";

const SPEKTR_ENDPOINT = "/api/spektr";
const DEFAULT_SPEKTR_ERROR_MESSAGE = "SPEKTR no pudo completar la solicitud.";

const getFallbackErrorMessage = (status: number) => {
  if (status === 500) {
    return "SPEKTR no está configurado correctamente en el servidor.";
  }

  if (status === 502) {
    return "El proveedor de SPEKTR devolvió un error. Reintenta en unos segundos.";
  }

  if (status === 503) {
    return "SPEKTR está temporalmente saturado. Reintenta en unos minutos.";
  }

  return DEFAULT_SPEKTR_ERROR_MESSAGE;
};

const getErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as SpektrApiErrorResponse;
    return data.error?.trim() || getFallbackErrorMessage(response.status);
  } catch {
    return getFallbackErrorMessage(response.status);
  }
};

const postSpektrRequest = async <TResult extends SpektrApiSuccessResponse>(
  payload: SpektrApiRequest,
): Promise<TResult> => {
  let response: Response;

  try {
    response = await fetch(SPEKTR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "No se pudo conectar con el backend de SPEKTR. Asegúrate de que esté corriendo localmente o desplegado.",
      );
    }
    throw new Error("No se pudo conectar con /api/spektr. Verifica que el backend esté disponible.");
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as TResult;
};

export async function generateSpektrDiagram(
  payload: SpektrRequest,
): Promise<SpektrGenerationResult> {
  return postSpektrRequest<SpektrGenerationResult>({
    ...payload,
    mode: "generate",
  });
}

export async function analyzeSpektrDiagram(
  payload: SpektrRequest,
): Promise<SpektrAnalysisResult> {
  return postSpektrRequest<SpektrAnalysisResult>({
    ...payload,
    mode: "analyze",
  });
}
