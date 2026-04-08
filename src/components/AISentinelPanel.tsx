import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ClipboardList, RotateCw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  analyzeDiagramQuality,
  generateMermaidDiagram,
  type AIServiceMode,
} from "@/lib/aiService";

interface AISentinelPanelProps {
  currentCode: string;
  currentProject: string;
  isOpen: boolean;
  onClose: () => void;
  onCodeUpdate: (newCode: string) => void;
}

interface PromptHistoryItem {
  id: string;
  prompt: string;
  mode: AIServiceMode;
  createdAt: string;
}

interface PanelResponse {
  mode: AIServiceMode;
  content: string;
}

const PROMPT_HISTORY_KEY = "rauvia_ai_sentinel_prompt_history";
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
    console.error("No se pudo cargar el historial local de prompts.", error);
    return [];
  }
};

const savePromptHistory = (items: PromptHistoryItem[]) => {
  try {
    localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_PROMPTS)));
  } catch (error) {
    console.error("No se pudo guardar el historial local de prompts.", error);
  }
};

const getModeMeta = (mode: AIServiceMode) => {
  if (mode === "generate") {
    return {
      title: "Generación Mermaid",
      description: "Crea o ajusta el diagrama activo.",
      icon: Sparkles,
    };
  }

  return {
    title: "Análisis ISO 25010 / RAUVIA",
    description: "Evalúa calidad, riesgos y recomendaciones.",
    icon: ShieldCheck,
  };
};

export function AISentinelPanel({
  currentCode,
  currentProject,
  isOpen,
  onClose,
  onCodeUpdate,
}: AISentinelPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<AIServiceMode>("generate");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<PromptHistoryItem[]>(() => loadPromptHistory());
  const [response, setResponse] = useState<PanelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modeMeta = useMemo(() => getModeMeta(mode), [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response, error]);

  const pushPromptToHistory = (value: string, selectedMode: AIServiceMode) => {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!prompt.trim() || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (mode === "generate") {
        const result = await generateMermaidDiagram({
          prompt,
          currentCode,
          currentProject,
        });

        onCodeUpdate(result.code);
        setResponse({
          mode: result.mode,
          content: "Código Mermaid actualizado y aplicado al slot activo.",
        });
      } else {
        const result = await analyzeDiagramQuality({
          prompt,
          currentCode,
          currentProject,
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
          : "Ocurrió un error inesperado al consultar AISentinel.";

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
                <h3 className="text-sm font-semibold">AISentinel Panel</h3>
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
                onClick={() => setMode("generate")}
                className={cn(
                  "justify-start gap-2 border-gray-200 bg-white text-left",
                  mode === "generate" && "border-primary/40 bg-primary/10 text-primary",
                )}
              >
                <Sparkles className="h-4 w-4" />
                Generar Mermaid
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
                Analizar calidad
              </Button>
            </div>

            <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <modeMeta.icon className="h-4 w-4 text-primary" />
                {modeMeta.title}
              </div>
              <p className="mt-1 text-xs text-gray-500">{modeMeta.description}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  mode === "generate"
                    ? "Ejemplo: genera un flujo de aprobación con actor, validación y almacenamiento."
                    : "Ejemplo: analiza mantenibilidad, seguridad y claridad operativa."
                }
                className="min-h-[110px] w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isProcessing}
              />

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Historial local: últimos 5 prompts</span>
                <span>Modelo: {import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash"}</span>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full gap-2 border-0 bg-gradient-to-r from-[#4f46e5] via-[#0f766e] to-[#06b6d4] text-white hover:opacity-95",
                  isProcessing && "cursor-not-allowed opacity-60",
                )}
                disabled={isProcessing || !prompt.trim()}
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Procesando
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Ejecutar en AISentinel
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
                      onClick={() => {
                        setPrompt(item.prompt);
                        setMode(item.mode);
                      }}
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
                    {response.mode === "generate"
                      ? "Resultado aplicado"
                      : "Informe ISO 25010 / RAUVIA"}
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-800">
                    {response.content}
                  </pre>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500">
                  La respuesta de AISentinel aparecerá aquí.
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
