import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { AnimatePresence, LayoutGroup, Reorder, motion, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Copy, 
  Download, 
  Eye,
  FileCode2,
  Trash2, 
  Maximize2,
  Settings,
  History,
  Bot,
  Plus,
  X,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VersionHistory } from "./components/VersionHistory";
import { BpmnRenderer } from "./components/BpmnRenderer";
import { MermaidCanvas, type MermaidCanvasHandle } from "./components/MermaidCanvas";
import { SpektrLogo } from "./components/branding/SpektrLogo";
import { WorkspacePanelHeader } from "./components/workspace/WorkspacePanelHeader";
import { getSpektrBuildLabel, getSpektrWorkspaceName } from "@/lib/spektr/config";
import { sanitizeMermaidCode } from "@/lib/mermaidSanitizer";

const LazySpektrPanel = lazy(() =>
  import("./components/SpektrPanel").then((module) => ({ default: module.SpektrPanel })),
);

type DiagramType = "mermaid" | "bpmn" | "c4context";

type Diagram = {
  id: number;
  title: string;
  code: string;
  type?: DiagramType;
};

type PersistedSlots = {
  diagrams?: Diagram[];
  activeTab?: number;
};

const DEFAULT_MERMAID_CODE = `graph TD
    A[New Diagram] --> B[Edit Me]`;

const DEFAULT_C4_CONTEXT_CODE = `C4Context
    title Contexto del sistema de MERMAID Flow Studio
    Person(architect, "Arquitecto", "Diseña y revisa diagramas")
    System(flow_studio, "MERMAID Flow Studio", "Editor web para Mermaid, BPMN y C4")
    System_Ext(spektr_module, "SPEKTR", "Motor IA para generar y analizar diagramas")
    System_Ext(local_workspace, "Workspace local", "Persistencia local del navegador")

    Rel(architect, flow_studio, "Diseña y valida")
    Rel(flow_studio, spektr_module, "Solicita soporte")
    Rel(flow_studio, local_workspace, "Guarda slots")`;

const MERMAID_SAMPLE_CODE = `graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`;

const ENTERPRISE_SAMPLE_CODE = `graph TD
    A[Carga de Factura] --> B[Motor IA SPEKTR]
    B --> C[CONSULTA: vantage_bom]
    B --> D[CONSULTA: vantage_projects]
    C --> E{¿Técnicamente OK?}
    D --> F{¿Dinero OK?}
    E & F -- SÍ --> G[INSERT vantage_purchase_orders]
    G --> H(TRIGGER: Update vantage_projects.total_spent)

    style C fill:#fff,stroke:#f00,stroke-width:2px
    style D fill:#fff,stroke:#f00,stroke-width:2px
    style H fill:#f96,stroke:#333,stroke-width:2px`;

const createMermaidDiagram = (id: number, title = `DIAGRAM ${id}`): Diagram => ({
  id,
  title,
  code: DEFAULT_MERMAID_CODE,
  type: "mermaid",
});

const createC4ContextDiagram = (id: number, title = `C4 ${id}`): Diagram => ({
  id,
  title,
  code: DEFAULT_C4_CONTEXT_CODE,
  type: "c4context",
});

const createBpmnDiagram = (id: number, title = `BPMN ${id}`): Diagram => ({
  id,
  title,
  type: "bpmn",
  code: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="179" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="260" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="420" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="428" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="209" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="120" />
        <di:waypoint x="420" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
});

// Sample diagrams
const DEFAULT_DIAGRAMS: Diagram[] = [
  {
    id: 1,
    title: "DIAGRAM 1",
    code: MERMAID_SAMPLE_CODE,
    type: "mermaid",
  },
  {
    id: 2,
    title: "DIAGRAM 2",
    code: ENTERPRISE_SAMPLE_CODE,
    type: "mermaid",
  },
  createMermaidDiagram(3),
  createMermaidDiagram(4),
  createBpmnDiagram(6, "BPMN 1"),
];

const STORAGE_KEY = "spektr_mermaid_slots";

const loadPersistedSlots = () => {
  try {
    const savedSlots = localStorage.getItem(STORAGE_KEY);

    if (!savedSlots) return null;

    const parsedSlots = JSON.parse(savedSlots);
    return parsedSlots && typeof parsedSlots === "object" ? (parsedSlots as PersistedSlots) : null;
  } catch (error) {
    console.error("Failed to load persisted slots", error);
    return null;
  }
};

const sanitizeDiagramTitle = (title: string, fallback: string) => {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  return normalizedTitle || fallback;
};

const normalizePersistedDiagrams = (value: unknown): Diagram[] => {
  if (!Array.isArray(value)) return DEFAULT_DIAGRAMS;

  const diagrams = value.reduce<Diagram[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;

    const candidate = item as Partial<Diagram>;

    if (
      typeof candidate.id !== "number" ||
      typeof candidate.title !== "string" ||
      typeof candidate.code !== "string"
    ) {
      return acc;
    }

    const type: DiagramType =
      candidate.type === "bpmn"
        ? "bpmn"
        : candidate.type === "c4context"
          ? "c4context"
          : "mermaid";

    acc.push({
      id: candidate.id,
      title: sanitizeDiagramTitle(candidate.title, `DIAGRAM ${candidate.id}`),
      code: candidate.code,
      type,
    });

    return acc;
  }, []);

  return diagrams.length > 0 ? diagrams : [createMermaidDiagram(1)];
};

const getNextDiagramId = (diagrams: Diagram[]) =>
  diagrams.length > 0 ? Math.max(...diagrams.map((diagram) => diagram.id)) + 1 : 1;

const areNumberArraysEqual = (left: number[], right: number[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const getDiagramTypeBadge = (type?: DiagramType) => {
  if (type === "bpmn") return "BPMN";
  if (type === "c4context") return "C4";
  return null;
};

const getEditorMeta = (type?: DiagramType) => {
  if (type === "bpmn") return "Archivo XML BPMN";
  if (type === "c4context") return "Sintaxis Mermaid C4Context";
  return "Sintaxis Mermaid";
};

const getPreviewMeta = (diagram: Diagram) => {
  if (diagram.type === "c4context") {
    return `${diagram.title} · Mermaid C4Context`;
  }

  return diagram.title;
};

const resolveActiveTab = (diagrams: Diagram[], persistedActiveTab?: number) => {
  if (
    typeof persistedActiveTab === "number" &&
    diagrams.some((diagram) => diagram.id === persistedActiveTab)
  ) {
    return persistedActiveTab;
  }

  return diagrams[0]?.id ?? 1;
};

type DiagramTabItemProps = {
  diagram: Diagram;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (diagramId: number, isEditing: boolean) => void;
  onStartRenaming: (diagram: Diagram) => void;
  onChangeEditingTitle: (title: string) => void;
  onCommitRename: (diagramId: number) => void;
  onTabTitleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>, id: number) => void;
  onCloseTab: (id: number, event: React.MouseEvent) => void;
  tabTitleInputRef: React.RefObject<HTMLInputElement>;
  onDragStart: () => void;
  onDragEnd: () => void;
};

function DiagramTabItem({
  diagram,
  isActive,
  isEditing,
  editingTitle,
  onSelect,
  onStartRenaming,
  onChangeEditingTitle,
  onCommitRename,
  onTabTitleKeyDown,
  onCloseTab,
  tabTitleInputRef,
  onDragStart,
  onDragEnd,
}: DiagramTabItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={diagram.id}
      dragPropagation={false}
      layout="position"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      dragControls={dragControls}
      dragListener={false}
      whileDrag={{
        scale: 1.02,
        zIndex: 30,
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(diagram.id, isEditing)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(diagram.id, isEditing);
        }
      }}
      onDoubleClick={() => onStartRenaming(diagram)}
      role="tab"
      aria-selected={isActive}
      aria-label={`Abrir ${diagram.title}`}
      tabIndex={0}
      className={cn(
        "group relative flex min-w-[156px] touch-pan-x items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold tracking-[0.12em] transition-colors",
        isActive
          ? "border-border bg-white text-primary shadow-sm"
          : "border-transparent bg-muted/65 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId="active-tab-indicator"
          className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r from-[hsl(var(--brand-start))] via-[hsl(var(--brand-middle))] to-[hsl(var(--brand-end))]"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}

      <button
        type="button"
        aria-label={`Reordenar ${diagram.title}`}
        title="Arrastrar para reordenar"
        disabled={isEditing}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          event.stopPropagation();

          if (isEditing || event.button !== 0) return;

          dragControls.start(event, { snapToCursor: false });
        }}
        className={cn(
          "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors",
          isEditing
            ? "cursor-not-allowed opacity-40"
            : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing"
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
        <AnimatePresence initial={false} mode="wait">
          {isEditing ? (
            <motion.input
              key={`input-${diagram.id}`}
              ref={tabTitleInputRef}
              value={editingTitle}
              onChange={(event) => onChangeEditingTitle(event.target.value)}
              onBlur={() => onCommitRename(diagram.id)}
              onKeyDown={(event) => onTabTitleKeyDown(event, diagram.id)}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              className="h-8 flex-1 rounded-lg border border-primary/30 bg-white px-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground outline-none ring-0"
              initial={{ opacity: 0, width: 96 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 96 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
            />
          ) : (
            <motion.span
              key={`label-${diagram.id}`}
              className="truncate"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              title="Doble clic para renombrar"
            >
              {diagram.title}
            </motion.span>
          )}
        </AnimatePresence>

        {getDiagramTypeBadge(diagram.type) && (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-primary">
            {getDiagramTypeBadge(diagram.type)}
          </span>
        )}
      </div>

      <button
        onClick={(event) => onCloseTab(diagram.id, event)}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={`Cerrar ${diagram.title}`}
        className={cn(
          "relative z-10 ml-1 rounded-full p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100",
          isActive ? "text-primary" : "text-muted-foreground",
          isEditing && "opacity-100"
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Reorder.Item>
  );
}

function App() {
  const [editorFeedback, setEditorFeedback] = useState<{
    tone: "info" | "success";
    message: string;
  } | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[]>(() => {
    const persistedSlots = loadPersistedSlots();
    return normalizePersistedDiagrams(persistedSlots?.diagrams);
  });
  
  const [activeTab, setActiveTab] = useState<number>(() => {
    const persistedSlots = loadPersistedSlots();
    const nextDiagrams = normalizePersistedDiagrams(persistedSlots?.diagrams);
    return resolveActiveTab(nextDiagrams, persistedSlots?.activeTab);
  });

  const [showHistory, setShowHistory] = useState(false);
  const [showSpektrPanel, setShowSpektrPanel] = useState(false);
  const [hasOpenedSpektrPanel, setHasOpenedSpektrPanel] = useState(false);
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [tabOrder, setTabOrder] = useState<number[]>(() => {
    const persistedSlots = loadPersistedSlots();
    return normalizePersistedDiagrams(persistedSlots?.diagrams).map((diagram) => diagram.id);
  });
  const currentProject = getSpektrWorkspaceName();
  const buildLabel = getSpektrBuildLabel();
  const mermaidCanvasHandleRef = useRef<MermaidCanvasHandle | null>(null);
  const tabTitleInputRef = useRef<HTMLInputElement | null>(null);
  const tabOrderRef = useRef(tabOrder);

  const activeDiagram = useMemo(
    () => diagrams.find((diagram) => diagram.id === activeTab) || diagrams[0],
    [diagrams, activeTab]
  );
  const diagramsById = useMemo(
    () => new Map(diagrams.map((diagram) => [diagram.id, diagram])),
    [diagrams]
  );
  const orderedDiagrams = useMemo(
    () => tabOrder.map((diagramId) => diagramsById.get(diagramId)).filter(Boolean) as Diagram[],
    [tabOrder, diagramsById]
  );
  const isSpektrGenerationAvailable = activeDiagram.type !== "bpmn";

  // Save state to localStorage whenever diagrams or activeTab changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          diagrams,
          activeTab,
        })
      );
    } catch (error) {
      console.error("Failed to persist slots", error);
    }
  }, [diagrams, activeTab]);

  useEffect(() => {
    if (!diagrams.some((diagram) => diagram.id === activeTab)) {
      setActiveTab(diagrams[0]?.id ?? 1);
    }
  }, [diagrams, activeTab]);

  useEffect(() => {
    setTabOrder((currentOrder) => {
      const diagramIds = diagrams.map((diagram) => diagram.id);
      const nextOrder = [
        ...currentOrder.filter((diagramId) => diagramIds.includes(diagramId)),
        ...diagramIds.filter((diagramId) => !currentOrder.includes(diagramId)),
      ];

      tabOrderRef.current = nextOrder;
      return areNumberArraysEqual(currentOrder, nextOrder) ? currentOrder : nextOrder;
    });
  }, [diagrams]);

  useEffect(() => {
    if (editingTabId === null) return;

    tabTitleInputRef.current?.focus();
    tabTitleInputRef.current?.select();
  }, [editingTabId]);

  useEffect(() => {
    if (showSpektrPanel) {
      setHasOpenedSpektrPanel(true);
    }
  }, [showSpektrPanel]);

  useEffect(() => {
    setEditorFeedback(null);
  }, [activeTab]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setEditorFeedback(null);
    setDiagrams((prev) =>
      prev.map((diagram) =>
        diagram.id === activeTab ? { ...diagram, code: newCode, type: diagram.type || "mermaid" } : diagram
      )
    );
  };

  const handleAddDiagram = () => {
    const newId = getNextDiagramId(diagrams);
    const newDiagram = createMermaidDiagram(newId);
    setDiagrams((prev) => [...prev, newDiagram]);
    setActiveTab(newId);
  };

  const handleAddC4Context = () => {
    const newId = getNextDiagramId(diagrams);
    const newDiagram = createC4ContextDiagram(newId);
    setDiagrams((prev) => [...prev, newDiagram]);
    setActiveTab(newId);
  };

  const handleAddBpmn = () => {
    const newId = getNextDiagramId(diagrams);
    const newBpmn: Diagram = {
      ...createBpmnDiagram(newId),
      code: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_${newId}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_${newId}" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_${newId}">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
    };
    setDiagrams((prev) => [...prev, newBpmn]);
    setActiveTab(newId);
  };

  const handleReorderDiagrams = useCallback((nextOrder: number[]) => {
    tabOrderRef.current = nextOrder;
    setTabOrder(nextOrder);
  }, []);

  const commitDiagramOrder = useCallback((nextOrder: number[]) => {
    setDiagrams((prev) => {
      const diagramsMap = new Map(prev.map((diagram) => [diagram.id, diagram]));
      const nextDiagrams = nextOrder
        .map((diagramId) => diagramsMap.get(diagramId))
        .filter(Boolean) as Diagram[];

      return nextDiagrams.length === prev.length && nextDiagrams.every((diagram, index) => diagram === prev[index])
        ? prev
        : nextDiagrams;
    });
  }, []);

  const handleCodeUpdate = useCallback((newCode: string) => {
    setEditorFeedback(null);
    setDiagrams((prev) => prev.map((diagram) => (diagram.id === activeTab ? { ...diagram, code: newCode } : diagram)));
  }, [activeTab]);

  const handleInsertMermaid = useCallback((snippet: string) => {
    setEditorFeedback(null);
    setDiagrams((prev) =>
      prev.map((diagram) =>
        diagram.id === activeTab ? { ...diagram, code: diagram.code + "\n" + snippet } : diagram
      )
    );
  }, [activeTab]);

  const handleSanitizeActiveDiagram = useCallback(() => {
    if (!activeDiagram || activeDiagram.type === "bpmn") {
      setEditorFeedback({
        tone: "info",
        message: "BPMN XML se preserva sin sanitización Mermaid.",
      });
      return;
    }

    const result = sanitizeMermaidCode(activeDiagram.code);

    if (!result.changed) {
      setEditorFeedback({
        tone: "info",
        message: "No se detectaron caracteres o patrones incompatibles en el código Mermaid.",
      });
      return;
    }

    setDiagrams((prev) =>
      prev.map((diagram) =>
        diagram.id === activeDiagram.id ? { ...diagram, code: result.code } : diagram
      )
    );
    setEditorFeedback({
      tone: "success",
      message: `Código Mermaid sanitizado: ${result.appliedRules.join(", ")}.`,
    });
  }, [activeDiagram]);

  const handleCancelRename = useCallback(() => {
    setEditingTabId(null);
    setEditingTitle("");
  }, []);

  const handleSelectTab = useCallback((diagramId: number, isEditing: boolean) => {
    setActiveTab(diagramId);
    if (!isEditing) {
      handleCancelRename();
    }
  }, [handleCancelRename]);

  const handleChangeEditingTitle = useCallback((title: string) => {
    setEditingTitle(title);
  }, []);

  const handleExportSVG = async () => {
    const svgElement = mermaidCanvasHandleRef.current?.getSvgElement();

    if (svgElement) {
      try {
        const svgData = activeDiagram.type === 'bpmn'
          ? svgElement.outerHTML
          : await mermaidCanvasHandleRef.current?.exportStandaloneSvg();

        if (!svgData) return;

        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const safeTitle = activeDiagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeTitle}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to export SVG:", error);
      }
    }
  };

  const handleStartRenaming = useCallback((diagram: Diagram) => {
    setActiveTab(diagram.id);
    setEditingTabId(diagram.id);
    setEditingTitle(diagram.title);
  }, []);

  const handleCommitRename = useCallback((id: number) => {
    const diagram = diagrams.find((item) => item.id === id);
    if (!diagram) {
      setEditingTabId(null);
      setEditingTitle("");
      return;
    }

    const nextTitle = sanitizeDiagramTitle(editingTitle, diagram.title);

    setDiagrams((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: nextTitle } : item))
    );
    setEditingTabId(null);
    setEditingTitle("");
  }, [diagrams, editingTitle]);

  const handleTabTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, id: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleCommitRename(id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelRename();
    }
  };

  const handleCloseTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    const closingIndex = diagrams.findIndex((diagram) => diagram.id === id);
    const newDiagrams = diagrams.filter((diagram) => diagram.id !== id);
    setEditingTabId((current) => (current === id ? null : current));
    setEditingTitle("");

    if (newDiagrams.length === 0) {
      const replacement = createMermaidDiagram(getNextDiagramId(diagrams));
      setDiagrams([replacement]);
      setActiveTab(replacement.id);
      return;
    }

    setDiagrams(newDiagrams);

    if (activeTab === id || !newDiagrams.some((diagram) => diagram.id === activeTab)) {
      const fallbackIndex = Math.max(0, closingIndex - 1);
      setActiveTab(newDiagrams[fallbackIndex]?.id ?? newDiagrams[0].id);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="relative z-20 border-b border-border/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center">
            <SpektrLogo
              className="h-10 shrink-0 sm:h-11"
              title={currentProject}
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-2 border-border/80 bg-white/85 text-foreground",
                  showSpektrPanel && "border-primary/30 bg-primary/10 text-primary"
                )}
                onClick={() => {
                  setHasOpenedSpektrPanel(true);
                  setShowSpektrPanel(!showSpektrPanel);
                }}
              >
                <Bot className="h-4 w-4" />
                SPEKTR IA
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-2 border-border/80 bg-white/85 text-foreground",
                  showHistory && "border-primary/30 bg-primary/10 text-primary"
                )}
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
                History
              </Button>

              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="hidden h-6 w-px bg-border/80 xl:block" />
            
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2 border-border/80 bg-white/85">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                size="sm"
                className="h-9 gap-2 border-0 bg-gradient-to-r from-[hsl(var(--brand-start))] via-[hsl(var(--brand-middle))] to-[hsl(var(--brand-end))] text-white shadow-sm hover:opacity-95"
                onClick={handleExportSVG}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="z-10 flex items-center gap-3 overflow-x-auto border-b border-border/80 bg-white/80 px-3 py-2 backdrop-blur sm:px-4">
        <LayoutGroup id="diagram-tabs">
          <Reorder.Group
            axis="x"
            values={tabOrder}
            onReorder={handleReorderDiagrams}
            role="tablist"
            aria-label="Pestañas de diagramas"
            className="flex items-center gap-2"
          >
            <AnimatePresence initial={false}>
              {orderedDiagrams.map((diagram) => {
                const isActive = activeTab === diagram.id;
                const isEditing = editingTabId === diagram.id;

                return (
                  <DiagramTabItem
                    key={diagram.id}
                    diagram={diagram}
                    isActive={isActive}
                    isEditing={isEditing}
                    editingTitle={editingTitle}
                    onSelect={handleSelectTab}
                    onStartRenaming={handleStartRenaming}
                    onChangeEditingTitle={handleChangeEditingTitle}
                    onCommitRename={handleCommitRename}
                    onTabTitleKeyDown={handleTabTitleKeyDown}
                    onCloseTab={handleCloseTab}
                    tabTitleInputRef={tabTitleInputRef}
                    onDragStart={handleCancelRename}
                    onDragEnd={() => commitDiagramOrder(tabOrderRef.current)}
                  />
                );
              })}
            </AnimatePresence>
          </Reorder.Group>
        </LayoutGroup>
        
        <div className="mx-1 h-6 w-px bg-border/80" />
        
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleAddDiagram} className="h-8 gap-1.5 text-xs text-foreground">
            <Plus className="h-3.5 w-3.5" />
            Mermaid
          </Button>
          <Button variant="ghost" size="sm" onClick={handleAddC4Context} className="h-8 gap-1.5 text-xs text-foreground">
            <Plus className="h-3.5 w-3.5" />
            C4 Context
          </Button>
          <Button variant="ghost" size="sm" onClick={handleAddBpmn} className="h-8 gap-1.5 text-xs text-foreground">
            <Plus className="h-3.5 w-3.5" />
            BPMN
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Editor Panel */}
        <div className="flex min-h-[320px] w-full flex-col border-b border-border/80 bg-muted/30 lg:min-h-0 lg:w-[34rem] lg:max-w-[38%] lg:border-b-0 lg:border-r">
          <WorkspacePanelHeader
            icon={FileCode2}
            eyebrow="Editor"
            title={activeDiagram.title}
            meta={getEditorMeta(activeDiagram.type)}
            action={
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleSanitizeActiveDiagram}
                  disabled={activeDiagram.type === "bpmn"}
                >
                  Sanitizar Mermaid
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Eliminar diagrama">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            }
          />
          <div className="relative flex-1">
            <div className="border-b border-border/70 bg-white/70 px-4 py-2 text-xs sm:px-5">
              <span className="text-muted-foreground">
                {activeDiagram.type === "bpmn"
                  ? "BPMN XML se preserva; la sanitización Mermaid está desactivada."
                  : "Normaliza bloques Markdown, tipografía inteligente, flechas Unicode y espacios invisibles antes de renderizar."}
              </span>
              {editorFeedback ? (
                <span
                  className={cn(
                    "ml-2 font-medium",
                    editorFeedback.tone === "success" ? "text-emerald-600" : "text-muted-foreground"
                  )}
                >
                  {editorFeedback.message}
                </span>
              ) : null}
            </div>
            <textarea
              value={activeDiagram.code}
              onChange={handleCodeChange}
              className="h-full w-full resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-foreground/90 outline-none placeholder:text-muted-foreground sm:px-5"
              aria-label={`Editor de código para ${activeDiagram.title}`}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
          <WorkspacePanelHeader
            icon={Eye}
            eyebrow="Preview"
            title="Visual Output"
            meta={getPreviewMeta(activeDiagram)}
            action={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Salida vectorial</span>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            }
          />
          <div className="flex-1 p-3 sm:p-4">
            <div className="mermaid-overscroll-guard relative flex h-full min-h-[320px] overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
              {activeDiagram.type === 'bpmn' ? (
                <BpmnRenderer 
                  xml={activeDiagram.code} 
                  onXmlChange={handleCodeUpdate}
                />
              ) : (
                <MermaidCanvas
                  ref={mermaidCanvasHandleRef}
                  diagramId={activeDiagram.id}
                  diagramType={activeDiagram.type}
                  code={activeDiagram.code}
                  onInsert={handleInsertMermaid}
                />
              )}
            </div>
          </div>
          
          {hasOpenedSpektrPanel && (
            <Suspense fallback={null}>
              <LazySpektrPanel
                currentCode={activeDiagram.code}
                currentProject={currentProject}
                diagramType={activeDiagram.type || "mermaid"}
                isGenerationAvailable={isSpektrGenerationAvailable}
                onCodeUpdate={handleCodeUpdate}
                isOpen={showSpektrPanel}
                onClose={() => setShowSpektrPanel(false)}
              />
            </Suspense>
          )}
        </div>

        {/* History Panel */}
        <VersionHistory 
          isOpen={showHistory} 
          onRestore={(versionId) => console.log("Restore", versionId)} 
        />
      </main>

      {/* Status Bar */}
      <footer className="flex flex-col gap-2 bg-gradient-to-r from-[hsl(var(--brand-start))] via-[hsl(var(--brand-middle))] to-[hsl(var(--brand-end))] px-4 py-2 text-xs text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SpektrLogo mode="icon" className="h-5 w-auto shrink-0" title="MERMAID" />
          <span className="rounded-full bg-white/12 px-2.5 py-1 font-semibold tracking-[0.14em]">
            SYSTEM: MERMAID FLOW ONLINE
          </span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/90">
            ACTIVE_SLOT: {activeDiagram.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/90">
            IA: {showSpektrPanel ? "SPEKTR ACTIVO" : "SPEKTR EN ESPERA"}
          </span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/90">
            BUILD: {buildLabel}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
