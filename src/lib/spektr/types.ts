export type SpektrMode = "generate" | "analyze";
export type SpektrDiagramType = "mermaid" | "c4context" | "bpmn";

export interface SpektrRequest {
  prompt: string;
  currentCode?: string;
  currentProject?: string;
  diagramType?: SpektrDiagramType;
}

export interface SpektrApiRequest extends SpektrRequest {
  mode: SpektrMode;
}

export interface SpektrGenerationResult {
  mode: "generate";
  content: string;
  code: string;
}

export interface SpektrAnalysisResult {
  mode: "analyze";
  content: string;
}

export type SpektrApiSuccessResponse = SpektrGenerationResult | SpektrAnalysisResult;

export interface SpektrApiErrorResponse {
  error: string;
}

export interface SpektrStarterPrompt {
  id: string;
  label: string;
  prompt: string;
  mode: SpektrMode;
}
