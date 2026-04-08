import type {
  SpektrDiagramType,
  SpektrMode,
  SpektrRequest,
  SpektrStarterPrompt,
} from "./types";

const FALLBACK_CODE = "graph TD\n    A[Inicio] --> B[Fin]";

export const SPEKTR_STARTER_PROMPTS: SpektrStarterPrompt[] = [
  {
    id: "generate-approval-flow",
    label: "Flujo aprobación",
    mode: "generate",
    prompt: "Genera un flujo Mermaid de aprobación con validación, decisión y almacenamiento final.",
  },
  {
    id: "generate-architecture-cleanup",
    label: "Claridad visual",
    mode: "generate",
    prompt: "Reordena el diagrama activo para mejorar claridad arquitectónica y nombres de nodos en español.",
  },
  {
    id: "analyze-risk-check",
    label: "Riesgos",
    mode: "analyze",
    prompt: "Analiza mantenibilidad, riesgos operativos y trazabilidad del flujo actual.",
  },
];

const getCurrentCode = (currentCode?: string) => {
  return currentCode?.trim() || FALLBACK_CODE;
};

const getCurrentProject = (currentProject?: string) => {
  return currentProject?.trim() || "SPEKTR Mermaid Workspace";
};

const getDiagramFormat = (diagramType?: SpektrDiagramType) => {
  if (diagramType === "bpmn") {
    return {
      name: "XML BPMN",
      fencedLanguage: "xml",
      analysisFocus: "Analiza el siguiente proceso BPMN con foco en claridad operativa y calidad técnica.",
    };
  }

  if (diagramType === "c4context") {
    return {
      name: "Mermaid C4Context",
      fencedLanguage: "mermaid",
      analysisFocus:
        "Analiza el siguiente diagrama Mermaid C4Context con foco en claridad operativa y calidad técnica.",
    };
  }

  return {
    name: "Mermaid",
    fencedLanguage: "mermaid",
    analysisFocus: "Analiza el siguiente diagrama Mermaid con foco en claridad operativa y calidad técnica.",
  };
};

export const buildSpektrPrompt = (mode: SpektrMode, payload: SpektrRequest) => {
  const project = getCurrentProject(payload.currentProject);
  const currentCode = getCurrentCode(payload.currentCode);
  const diagramFormat = getDiagramFormat(payload.diagramType);

  if (mode === "generate") {
    return `
Eres SPEKTR, el módulo de IA del workspace.
Genera o ajusta un diagrama Mermaid válido en función de la solicitud del usuario.

Proyecto: ${project}
Formato del diagrama activo: ${diagramFormat.name}
Código actual:
\`\`\`${diagramFormat.fencedLanguage}
${currentCode}
\`\`\`

Solicitud del usuario:
${payload.prompt}

Reglas obligatorias:
1. Responde solo con código Mermaid válido.
2. No uses bloques markdown.
3. Mantén la estructura actual salvo que la solicitud exija cambiarla.
4. Usa nombres claros en español cuando sea posible.
5. No agregues explicaciones.
6. Si el formato activo es Mermaid C4Context, conserva esa sintaxis.
`;
  }

  return `
Actúa como SPEKTR, módulo de análisis del workspace.
${diagramFormat.analysisFocus}

Proyecto: ${project}
Solicitud adicional del usuario:
${payload.prompt || "Analiza la calidad general del diagrama."}

Diagrama o definición actual (${diagramFormat.name}):
\`\`\`${diagramFormat.fencedLanguage}
${currentCode}
\`\`\`

Responde en español con este formato exacto:
RESUMEN:
- máximo 3 bullets

CALIDAD:
- Legibilidad
- Mantenibilidad
- Riesgos
- Recomendaciones priorizadas

Reglas:
1. Sé concreto y accionable.
2. No devuelvas Mermaid.
3. No uses markdown con títulos #.
4. Si falta contexto, dilo explícitamente sin inventar.
`;
};
