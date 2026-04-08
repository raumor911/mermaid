import { useState, useEffect, useRef } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import mermaid from "mermaid";
import { select, type Selection } from "d3-selection";
import {
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3-zoom";
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
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AISentinelPanel } from "./components/AISentinelPanel";
import { VersionHistory } from "./components/VersionHistory";
import { BpmnRenderer } from "./components/BpmnRenderer";
import { MermaidToolbar } from "./components/MermaidToolbar";
import { RauviaLogo } from "./components/branding/RauviaLogo";
import { WorkspacePanelHeader } from "./components/workspace/WorkspacePanelHeader";

type DiagramType = "mermaid" | "bpmn";

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

const MERMAID_SAMPLE_CODE = `graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`;

const ENTERPRISE_SAMPLE_CODE = `graph TD
    A[Carga de Factura] --> B[Sentinel IA]
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

const MERMAID_RENDER_CONFIG = {
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
};

const MERMAID_EXPORT_CONFIG = {
  ...MERMAID_RENDER_CONFIG,
  flowchart: {
    htmlLabels: false,
  },
};

const STORAGE_KEY = "rauvia_mermaid_slots";
const MERMAID_MIN_SCALE = 0.05;
const MERMAID_MAX_SCALE = 8;
const MERMAID_ZOOM_STEP = 1.2;

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

    const type: DiagramType = candidate.type === "bpmn" ? "bpmn" : "mermaid";

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

const resolveActiveTab = (diagrams: Diagram[], persistedActiveTab?: number) => {
  if (
    typeof persistedActiveTab === "number" &&
    diagrams.some((diagram) => diagram.id === persistedActiveTab)
  ) {
    return persistedActiveTab;
  }

  return diagrams[0]?.id ?? 1;
};

const serializeSvgForExport = (
  svgElement: SVGSVGElement,
  bounds?: { minX: number; minY: number; width: number; height: number } | null
) => {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  if (!clonedSvg.getAttribute("xmlns")) {
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  if (!clonedSvg.getAttribute("xmlns:xlink")) {
    clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }

  if (bounds) {
    clonedSvg.setAttribute("viewBox", `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
    clonedSvg.setAttribute("width", `${bounds.width}`);
    clonedSvg.setAttribute("height", `${bounds.height}`);
    clonedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  clonedSvg.style.removeProperty("max-width");
  clonedSvg.style.removeProperty("max-height");

  const serializer = new XMLSerializer();
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clonedSvg)}`;
};

function App() {
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
  const [showAIChat, setShowAIChat] = useState(false);
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [mermaidZoomScale, setMermaidZoomScale] = useState(1);
  const currentProject = "RAUVIA Flow Studio";
  const mermaidViewportRef = useRef<HTMLDivElement | null>(null);
  const mermaidDiagramRef = useRef<HTMLDivElement | null>(null);
  const mermaidCanvasRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const zoomSelectionRef = useRef<Selection<HTMLDivElement, unknown, null, undefined> | null>(null);
  const zoomTransformRef = useRef<ZoomTransform>(zoomIdentity);
  const hasManualViewportRef = useRef(false);
  const tabTitleInputRef = useRef<HTMLInputElement | null>(null);

  const measureMermaidSvg = (svgElement: SVGSVGElement) => {
    const viewBox = svgElement.viewBox.baseVal;
    let minX = viewBox?.x ?? 0;
    let minY = viewBox?.y ?? 0;
    let maxX = minX + (viewBox?.width || 0);
    let maxY = minY + (viewBox?.height || 0);

    try {
      const bbox = svgElement.getBBox();

      if (bbox.width && bbox.height) {
        const bboxPadding = 24;
        minX = Math.min(minX, bbox.x - bboxPadding);
        minY = Math.min(minY, bbox.y - bboxPadding);
        maxX = Math.max(maxX, bbox.x + bbox.width + bboxPadding);
        maxY = Math.max(maxY, bbox.y + bbox.height + bboxPadding);
      }
    } catch (error) {
      console.warn("Failed to measure Mermaid SVG via getBBox", error);
    }

    let width = maxX - minX;
    let height = maxY - minY;

    if (!width || !height) {
      const rect = svgElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      minX = 0;
      minY = 0;
    }

    if (!width || !height) return null;

    return {
      minX,
      minY,
      width,
      height,
    };
  };

  const renderStandaloneMermaidSvg = async (diagramCode: string) => {
    const exportHost = document.createElement("div");
    exportHost.style.position = "fixed";
    exportHost.style.left = "-10000px";
    exportHost.style.top = "0";
    exportHost.style.visibility = "hidden";
    exportHost.style.pointerEvents = "none";

    document.body.appendChild(exportHost);

    try {
      mermaid.initialize(MERMAID_EXPORT_CONFIG);

      const exportId = `mermaid-export-${activeTab}-${Date.now()}`;
      const { svg } = await mermaid.render(exportId, diagramCode);

      exportHost.innerHTML = svg;

      const exportSvgElement = exportHost.querySelector("svg");

      if (!exportSvgElement) {
        throw new Error("Mermaid export did not produce an SVG element.");
      }

      const exportBounds = measureMermaidSvg(exportSvgElement);
      return serializeSvgForExport(exportSvgElement, exportBounds);
    } finally {
      mermaid.initialize(MERMAID_RENDER_CONFIG);
      document.body.removeChild(exportHost);
    }
  };

  const activeDiagram = diagrams.find((diagram) => diagram.id === activeTab) || diagrams[0];

  const applyMermaidTransform = (transform: ZoomTransform) => {
    const canvas = mermaidCanvasRef.current;

    if (!canvas) return;

    canvas.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
    canvas.style.transformOrigin = "0 0";
  };

  const normalizeWheelDelta = (delta: number, deltaMode: number) => {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return delta * (mermaidViewportRef.current?.clientHeight || window.innerHeight);
    }

    return delta;
  };

  const fitMermaidDiagram = () => {
    const viewport = mermaidViewportRef.current;
    const diagramHost = mermaidDiagramRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    const zoomSelection = zoomSelectionRef.current;
    const svgElement = diagramHost?.querySelector("svg");

    if (!viewport || !svgElement || !zoomBehavior || !zoomSelection) return;

    const bounds = measureMermaidSvg(svgElement);

    if (!bounds) return;

    const { minX, minY, width: diagramWidth, height: diagramHeight } = bounds;

    svgElement.style.display = "block";
    svgElement.style.width = `${diagramWidth}px`;
    svgElement.style.height = `${diagramHeight}px`;
    svgElement.style.maxWidth = "none";
    svgElement.style.maxHeight = "none";
    svgElement.setAttribute("viewBox", `${minX} ${minY} ${diagramWidth} ${diagramHeight}`);
    svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const padding = Math.max(Math.min(Math.min(viewport.clientWidth, viewport.clientHeight) * 0.08, 64), 24);
    const availableWidth = Math.max(viewport.clientWidth - padding, 1);
    const availableHeight = Math.max(viewport.clientHeight - padding, 1);
    const fitScale = Math.min(availableWidth / diagramWidth, availableHeight / diagramHeight);
    const safeScale = Math.min(Math.max(fitScale, MERMAID_MIN_SCALE), MERMAID_MAX_SCALE);
    const positionX = (viewport.clientWidth - diagramWidth * safeScale) / 2;
    const positionY = (viewport.clientHeight - diagramHeight * safeScale) / 2;

    zoomSelection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(positionX, positionY).scale(safeScale)
    );
  };

  const centerMermaidDiagramAtScale = (scale: number) => {
    const viewport = mermaidViewportRef.current;
    const diagramHost = mermaidDiagramRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    const zoomSelection = zoomSelectionRef.current;
    const svgElement = diagramHost?.querySelector("svg");

    if (!viewport || !svgElement || !zoomBehavior || !zoomSelection) return;

    const bounds = measureMermaidSvg(svgElement);

    if (!bounds) return;

    const safeScale = Math.min(Math.max(scale, MERMAID_MIN_SCALE), MERMAID_MAX_SCALE);
    const positionX = (viewport.clientWidth - bounds.width * safeScale) / 2;
    const positionY = (viewport.clientHeight - bounds.height * safeScale) / 2;

    zoomSelection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(positionX, positionY).scale(safeScale)
    );
  };

  const zoomMermaidBy = (factor: number) => {
    const zoomBehavior = zoomBehaviorRef.current;
    const zoomSelection = zoomSelectionRef.current;
    const viewport = mermaidViewportRef.current;

    if (!zoomBehavior || !zoomSelection || !viewport) return;

    hasManualViewportRef.current = true;
    zoomSelection.call(
      zoomBehavior.scaleBy,
      factor,
      [viewport.clientWidth / 2, viewport.clientHeight / 2]
    );
  };

  const resetMermaidDiagramView = () => {
    hasManualViewportRef.current = true;
    centerMermaidDiagramAtScale(1);
  };

  const handleFitMermaidDiagram = () => {
    hasManualViewportRef.current = false;
    fitMermaidDiagram();
  };

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
    if (editingTabId === null) return;

    tabTitleInputRef.current?.focus();
    tabTitleInputRef.current?.select();
  }, [editingTabId]);

  useEffect(() => {
    mermaid.initialize(MERMAID_RENDER_CONFIG);
  }, []);

  useEffect(() => {
    if (activeDiagram.type && activeDiagram.type !== "mermaid") return;

    const viewport = mermaidViewportRef.current;
    const canvas = mermaidCanvasRef.current;

    if (!viewport || !canvas) return;

    const viewportSelection = select(viewport);
    const zoomBehavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([MERMAID_MIN_SCALE, MERMAID_MAX_SCALE])
      .filter((event) => {
        if (event.type === "wheel" || event.type === "dblclick") return false;
        if (event.type === "mousedown") return event.button === 0;
        return true;
      })
      .touchable(() => {
        if (typeof navigator === "undefined") return false;
        if (navigator.maxTouchPoints > 0) return true;
        return typeof window !== "undefined" && "ontouchstart" in window;
      })
      .on("zoom", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        zoomTransformRef.current = event.transform;
        setMermaidZoomScale(event.transform.k);
        applyMermaidTransform(event.transform);

        if (event.sourceEvent) {
          hasManualViewportRef.current = true;
        }
      });

    viewportSelection.call(zoomBehavior);
    viewportSelection.on("dblclick.zoom", null);

    const handleWheel = (event: WheelEvent) => {
      const behavior = zoomBehaviorRef.current;
      const selection = zoomSelectionRef.current;

      if (!behavior || !selection) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = viewport.getBoundingClientRect();
      const pointer: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];

      if (event.ctrlKey || event.metaKey) {
        const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
        const zoomFactor = Math.exp(-deltaY * 0.0025);
        selection.call(behavior.scaleBy, zoomFactor, pointer);
        return;
      }

      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
      const currentScale = zoomTransformRef.current.k || 1;

      if (!deltaX && !deltaY) return;

      selection.call(
        behavior.translateBy,
        -deltaX / currentScale,
        -deltaY / currentScale
      );
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    zoomBehaviorRef.current = zoomBehavior;
    zoomSelectionRef.current = viewportSelection;
    zoomTransformRef.current = zoomIdentity;
    setMermaidZoomScale(1);
    applyMermaidTransform(zoomIdentity);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewportSelection.on(".zoom", null);
      zoomBehaviorRef.current = null;
      zoomSelectionRef.current = null;
      zoomTransformRef.current = zoomIdentity;
      setMermaidZoomScale(1);
    };
  }, [activeDiagram.type]);

  useEffect(() => {
    // Only render mermaid if active diagram is mermaid type (or undefined for backward compatibility)
    if (activeDiagram.type && activeDiagram.type !== 'mermaid') return;

    const renderDiagram = async () => {
      try {
        const element = mermaidDiagramRef.current;
        if (element) {
          hasManualViewportRef.current = false;
          element.innerHTML = '';
          const { svg } = await mermaid.render(`mermaid-svg-${activeTab}`, activeDiagram.code);
          element.innerHTML = svg;
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(fitMermaidDiagram);
          });
        }
      } catch (error) {
        console.error("Mermaid syntax error:", error);
        // Keep the old diagram or show error state if desired
      }
    };

    // Debounce rendering
    const timeoutId = setTimeout(renderDiagram, 500);
    return () => clearTimeout(timeoutId);
  }, [activeDiagram.code, activeTab]);

  useEffect(() => {
    if (activeDiagram.type && activeDiagram.type !== 'mermaid') return;

    const viewport = mermaidViewportRef.current;

    if (!viewport || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      if (hasManualViewportRef.current) return;
      window.requestAnimationFrame(fitMermaidDiagram);
    });

    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [activeDiagram.type, activeTab]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
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

  const handleCodeUpdate = (newCode: string) => {
    setDiagrams((prev) => prev.map((diagram) => (diagram.id === activeTab ? { ...diagram, code: newCode } : diagram)));
  };

  const handleInsertMermaid = (snippet: string) => {
    setDiagrams((prev) =>
      prev.map((diagram) =>
        diagram.id === activeTab ? { ...diagram, code: diagram.code + "\n" + snippet } : diagram
      )
    );
  };

  const handleExportSVG = async () => {
    const element = mermaidDiagramRef.current;
    const svgElement = element?.querySelector("svg");

    if (svgElement) {
      try {
        const svgBounds = measureMermaidSvg(svgElement);
        const svgData = activeDiagram.type === 'bpmn'
          ? serializeSvgForExport(svgElement, svgBounds)
          : await renderStandaloneMermaidSvg(activeDiagram.code);

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

  const handleStartRenaming = (diagram: Diagram) => {
    setActiveTab(diagram.id);
    setEditingTabId(diagram.id);
    setEditingTitle(diagram.title);
  };

  const handleCommitRename = (id: number) => {
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
  };

  const handleCancelRename = () => {
    setEditingTabId(null);
    setEditingTitle("");
  };

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
            <RauviaLogo
              className="h-10 shrink-0 sm:h-11"
              title="RAUVIA Flow Studio"
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 gap-2 border-border/80 bg-white/85 text-foreground",
                  showAIChat && "border-primary/30 bg-primary/10 text-primary"
                )}
                onClick={() => setShowAIChat(!showAIChat)}
              >
                <Bot className="h-4 w-4" />
                AI Sentinel
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
          <motion.div layout className="flex items-center gap-2">
            <AnimatePresence initial={false}>
              {diagrams.map((diagram) => {
                const isActive = activeTab === diagram.id;
                const isEditing = editingTabId === diagram.id;

                return (
                  <motion.div
                    key={diagram.id}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onClick={() => {
                      setActiveTab(diagram.id);
                      if (!isEditing) {
                        handleCancelRename();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveTab(diagram.id);
                        if (!isEditing) {
                          handleCancelRename();
                        }
                      }
                    }}
                    onDoubleClick={() => handleStartRenaming(diagram)}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Abrir ${diagram.title}`}
                    tabIndex={0}
                    className={cn(
                      "group relative flex min-w-[156px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold tracking-[0.12em] transition-colors",
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

                    <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
                      <AnimatePresence initial={false} mode="wait">
                        {isEditing ? (
                          <motion.input
                            key={`input-${diagram.id}`}
                            ref={tabTitleInputRef}
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onBlur={() => handleCommitRename(diagram.id)}
                            onKeyDown={(event) => handleTabTitleKeyDown(event, diagram.id)}
                            onClick={(event) => event.stopPropagation()}
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

                      {diagram.type === "bpmn" && (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-primary">
                          BPMN
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => handleCloseTab(diagram.id, e)}
                      aria-label={`Cerrar ${diagram.title}`}
                      className={cn(
                        "relative z-10 ml-1 rounded-full p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100",
                        isActive ? "text-primary" : "text-muted-foreground",
                        isEditing && "opacity-100"
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
        
        <div className="mx-1 h-6 w-px bg-border/80" />
        
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleAddDiagram} className="h-8 gap-1.5 text-xs text-foreground">
            <Plus className="h-3.5 w-3.5" />
            Mermaid
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
            meta={activeDiagram.type === "bpmn" ? "Archivo XML BPMN" : "Sintaxis Mermaid"}
            action={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Eliminar diagrama">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
          <div className="relative flex-1">
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
            meta={activeDiagram.title}
            action={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Salida vectorial</span>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            }
          />
          <div className="flex-1 p-3 sm:p-4">
            <div ref={mermaidViewportRef} className="mermaid-overscroll-guard relative flex h-full min-h-[320px] overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
              {activeDiagram.type === 'bpmn' ? (
                <BpmnRenderer 
                  xml={activeDiagram.code} 
                  onXmlChange={handleCodeUpdate}
                />
              ) : (
                <>
                  <MermaidToolbar onInsert={handleInsertMermaid} />
                  <div className="mermaid-overscroll-guard h-full w-full overflow-hidden touch-none select-none">
                    <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-white/95 p-2 shadow-sm backdrop-blur">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border/80"
                        aria-label="Reducir zoom"
                        disabled={mermaidZoomScale <= MERMAID_MIN_SCALE + 0.001}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          zoomMermaidBy(1 / MERMAID_ZOOM_STEP);
                        }}
                      >
                        -
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border/80"
                        aria-label="Aumentar zoom"
                        disabled={mermaidZoomScale >= MERMAID_MAX_SCALE - 0.001}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          zoomMermaidBy(MERMAID_ZOOM_STEP);
                        }}
                      >
                        +
                      </Button>
                      <div className="min-w-[4.75rem] rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1 text-center text-xs font-semibold text-foreground">
                        {Math.round(mermaidZoomScale * 100)}%
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-border/80 px-3 text-xs"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          resetMermaidDiagramView();
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-border/80 px-3 text-xs"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFitMermaidDiagram();
                        }}
                      >
                        Fit
                      </Button>
                    </div>
                    <div
                      ref={mermaidCanvasRef}
                      className="relative inline-block will-change-transform"
                    >
                      <div
                        ref={mermaidDiagramRef}
                        id={`mermaid-diagram-${activeTab}`}
                        className="inline-block"
                      >
                        {/* Mermaid diagram renders here */}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <AISentinelPanel 
            currentCode={activeDiagram.code} 
            currentProject={currentProject}
            onCodeUpdate={handleCodeUpdate}
            isOpen={showAIChat}
            onClose={() => setShowAIChat(false)}
          />
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
          <RauviaLogo mode="icon" className="h-5 w-auto shrink-0" title="RAUVIA" />
          <span className="rounded-full bg-white/12 px-2.5 py-1 font-semibold tracking-[0.14em]">
            SYSTEM: RAUVIA FLOW ENABLED
          </span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/90">
            ACTIVE_SLOT: {activeDiagram.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/90">
            BUFFER: {diagrams.length}/∞
          </span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/90">
            BUILD: 2026.04.07
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
