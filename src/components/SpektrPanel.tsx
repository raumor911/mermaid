import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ClipboardList, RotateCw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SPEKTR_STARTER_PROMPTS } from "@/lib/spektr/prompts";
import { analyzeSpektrDiagram, generateSpektrDiagram } from "@/lib/spektr/service";
import type { SpektrDiagramType, SpektrMode } from "@/lib/spektr/types";

interface SpektrPanelProps {
  currentCode: string;
  currentProject: string;
  diagramType?: SpektrDiagramType;
  isGenerationAvailable?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCodeUpdate: (newCode: string) => void;
}

interface PromptHistoryItem {
  id: string;
  prompt: string;
  mode: SpektrMode;
  createdAt: string;
}

interface PanelResponse {
  mode: SpektrMode;
  content: string;
}

const PROMPT_HISTORY_KEY = "spektr_prompt_history";
const MAX_PROMPTS = 5;

const loadPromptHistory = (): PromptHistoryItem[] => {
  try {
    const rawHistory = localStorage.getItem(PROMPT_HISTORY_KEY);

    if (!rawHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(rawHistory);
    return Array.isArray(parsedHistory) ? parsedHistory.slice(0, MAX_PROMPTS) : [];
  } catch (error) {
    console.error("No se pudo cargar el historial local de SPEKTR.", error);
    return [];
  }
};

const savePromptHistory = (items: PromptHistoryItem[]) => {
  try {
    localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_PROMPTS)));
  } catch (error) {
    console.error("No se pudo guardar el historial local de SPEKTR.", error);
  }
};

const getModeMeta = (mode: SpektrMode) => {
  if (mode === "generate") {
    return {
      title: "Generación asistida",
      description: "Crea o ajusta el diagrama activo sin salir del workspace.",
      icon: Sparkles,
    };
  }

  return {
    title: "Revisión técnica",
    description: "Evalúa calidad, riesgos y acciones priorizadas.",
    icon: ShieldCheck,
  };
};

export function SpektrPanel({
  currentCode,
  currentProject,
  diagramType = "mermaid",
  isGenerationAvailable = true,
  isOpen,
  onClose,
  onCodeUpdate,
}: SpektrPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<SpektrMode>("generate");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<PromptHistoryItem[]>(() => loadPromptHistory());
  const [response, setResponse] = useState<PanelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modeMeta = useMemo(() => getModeMeta(mode), [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response, error]);

  useEffect(() => {
    if (!isGenerationAvailable && mode === "generate") {
      setMode("analyze");
    }
  }, [isGenerationAvailable, mode]);

  const pushPromptToHistory = (value: string, selectedMode: SpektrMode) => {
    const normalizedPrompt = value.trim();

    if (!normalizedPrompt) {
      return;
    }

    setHistory((prev) => {
      const filteredItems = prev.filter(
        (item) => !(item.prompt === normalizedPrompt && item.mode === selectedMode),
      );

      const nextItems = [
        {
          id: `${Date.now()}`,
          prompt: normalizedPrompt,
          mode: selectedMode,
          createdAt: new Date().toISOString(),
        },
        ...filteredItems,
      ].slice(0, MAX_PROMPTS);

      savePromptHistory(nextItems);
      return nextItems;
    });
  };

  const handleSelectStarterPrompt = (nextPrompt: string, nextMode: SpektrMode) => {
    if (nextMode === "generate" && !isGenerationAvailable) {
      setError("La generación con SPEKTR no está disponible para pestañas BPMN.");
      return;
    }

    setMode(nextMode);
    setPrompt(nextPrompt);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prompt.trim() || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (mode === "generate") {
        const result = await generateSpektrDiagram({
          prompt,
          currentCode,
          currentProject,
          diagramType,
        });

        onCodeUpdate(result.code);
        setResponse({
          mode: result.mode,
          content: "Código Mermaid actualizado y aplicado al slot activo.",
        });
      } else {
        const result = await analyzeSpektrDiagram({
          prompt,
          currentCode,
          currentProject,
          diagramType,
        });

        setResponse({
          mode: result.mode,
          content: result.content,
        });
      }

      pushPromptToHistory(prompt, mode);
      setPrompt("");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Ocurrió un error inesperado al consultar SPEKTR.";

      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
          style={{ maxHeight: "680px" }}
        >
          <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-[#4f46e5] via-[#14b8a6] to-[#22d3ee] p-1.5">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SPEKTR Panel</h3>
                <p className="text-[10px] text-gray-400">{currentProject}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!isGenerationAvailable) {
                    setError("La generación con SPEKTR no está disponible para pestañas BPMN.");
                    return;
                  }

                  setMode("generate");
                }}
                className={cn(
                  "justify-start gap-2 border-gray-200 bg-white text-left",
                  mode === "generate" && isGenerationAvailable && "border-primary/40 bg-primary/10 text-primary",
                  !isGenerationAvailable && "cursor-not-allowed opacity-50",
                )}
                disabled={!isGenerationAvailable}
              >
                <Sparkles className="h-4 w-4" />
                Generar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("analyze")}
                className={cn(
                  "justify-start gap-2 border-gray-200 bg-white text-left",
                  mode === "analyze" && "border-primary/40 bg-primary/10 text-primary",
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Analizar
              </Button>
            </div>

            <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <modeMeta.icon className="h-4 w-4 text-primary" />
                  {modeMeta.title}
                </div>
                <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                  {isProcessing ? "Procesando" : "Listo"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{modeMeta.description}</p>
              {!isGenerationAvailable && (
                <p className="mt-2 text-xs text-amber-700">
                  En pestañas BPMN solo está disponible el modo análisis.
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SPEKTR_STARTER_PROMPTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectStarterPrompt(item.prompt, item.mode)}
                  className={cn(
                    "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                    item.mode === "generate" && !isGenerationAvailable && "cursor-not-allowed opacity-50",
                  )}
                  disabled={item.mode === "generate" && !isGenerationAvailable}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  mode === "generate"
                    ? "Ejemplo: genera un flujo con actor, validación, decisión y almacenamiento."
                    : "Ejemplo: analiza claridad, riesgos y mantenibilidad del flujo actual."
                }
                className="min-h-[110px] w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isProcessing}
              />

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Historial local: últimos 5 prompts</span>
                <span>Procesamiento seguro vía API</span>
              </div>

              {mode === "generate" && !isGenerationAvailable && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Cambia a una pestaña Mermaid o C4 para usar generación asistida.
                </div>
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full gap-2 border-0 bg-gradient-to-r from-[#4f46e5] via-[#0f766e] to-[#06b6d4] text-white hover:opacity-95",
                  isProcessing && "cursor-not-allowed opacity-60",
                )}
                disabled={isProcessing || !prompt.trim() || (mode === "generate" && !isGenerationAvailable)}
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Procesando
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Ejecutar en SPEKTR
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <ClipboardList className="h-3.5 w-3.5" />
                Historial
              </div>

              {history.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500">
                  Aún no hay prompts guardados localmente.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectStarterPrompt(item.prompt, item.mode)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          {item.mode === "generate" ? "Generación" : "Análisis"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-800">{item.prompt}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Bot className="h-3.5 w-3.5" />
                Respuesta
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {response ? (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {response.mode === "generate" ? "Resultado aplicado" : "Informe SPEKTR"}
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-800">
                    {response.content}
                  </pre>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
                  La respuesta de SPEKTR aparecerá aquí.
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
