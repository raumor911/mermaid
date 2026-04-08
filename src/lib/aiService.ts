import {
  analyzeSpektrDiagram,
  generateSpektrDiagram,
} from "@/lib/spektr/service";

export type { SpektrMode as AIServiceMode } from "@/lib/spektr/types";
export type {
  SpektrAnalysisResult as QualityAnalysisResult,
  SpektrGenerationResult as MermaidGenerationResult,
  SpektrRequest as AIServiceBasePayload,
} from "@/lib/spektr/types";

export const generateMermaidDiagram = generateSpektrDiagram;
export const analyzeDiagramQuality = analyzeSpektrDiagram;
