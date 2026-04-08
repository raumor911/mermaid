import type {
  SpektrApiErrorResponse,
  SpektrApiRequest,
  SpektrApiSuccessResponse,
  SpektrAnalysisResult,
  SpektrGenerationResult,
  SpektrRequest,
} from "./types";

const SPEKTR_ENDPOINT = "/api/spektr";

const getErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as SpektrApiErrorResponse;
    return data.error?.trim() || "SPEKTR no pudo completar la solicitud.";
  } catch {
    return "SPEKTR no pudo completar la solicitud.";
  }
};

const postSpektrRequest = async <TResult extends SpektrApiSuccessResponse>(
  payload: SpektrApiRequest,
): Promise<TResult> => {
  const response = await fetch(SPEKTR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

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
