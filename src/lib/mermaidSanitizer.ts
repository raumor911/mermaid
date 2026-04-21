export type MermaidSanitizationResult = {
  code: string;
  changed: boolean;
  appliedRules: string[];
};

const MERMAID_SANITIZATION_RULES = [
  {
    label: "bloques Markdown",
    apply: (source: string) =>
      source
        .replace(/^\s*```(?:mermaid|mmd)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .replace(/^\s*mermaid\s*\n/i, ""),
  },
  {
    label: "saltos de línea",
    apply: (source: string) => source.replace(/\r\n?/g, "\n"),
  },
  {
    label: "caracteres invisibles",
    apply: (source: string) => source.replace(/[\u200B-\u200D\u2060\uFEFF]/g, ""),
  },
  {
    label: "espacios conflictivos",
    apply: (source: string) =>
      source
        .replace(/\u00A0/g, " ")
        .replace(/\t/g, "    ")
        .replace(/[ \t]+$/gm, ""),
  },
  {
    label: "tipografía inteligente",
    apply: (source: string) =>
      source
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[\u2022\u25AA\u25CF]/g, "-"),
  },
  {
    label: "flechas Unicode",
    apply: (source: string) =>
      source
        .replace(/[→⟶⇒⇢]/g, "-->")
        .replace(/[←⟵⇐⇠]/g, "<--")
        .replace(/[↔⟷⇔]/g, "<-->"),
  },
];

export function sanitizeMermaidCode(source: string): MermaidSanitizationResult {
  let nextCode = source;
  const appliedRules: string[] = [];

  for (const rule of MERMAID_SANITIZATION_RULES) {
    const sanitizedCode = rule.apply(nextCode);

    if (sanitizedCode !== nextCode) {
      appliedRules.push(rule.label);
      nextCode = sanitizedCode;
    }
  }

  return {
    code: nextCode,
    changed: nextCode !== source,
    appliedRules,
  };
}
