import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import { MermaidToolbar } from "@/components/MermaidToolbar";

type MermaidDiagramType = "mermaid" | "c4context" | undefined;

type MermaidCanvasProps = {
  diagramId: number;
  diagramType?: MermaidDiagramType;
  code: string;
  onInsert: (snippet: string) => void;
};

type SafariGestureEvent = Event & {
  scale: number;
  clientX?: number;
  clientY?: number;
};

export type MermaidCanvasHandle = {
  getSvgElement: () => SVGSVGElement | null;
  exportStandaloneSvg: () => Promise<string>;
};

const MERMAID_RENDER_CONFIG = {
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  flowchart: {
    htmlLabels: false,
  },
};

const MERMAID_EXPORT_CONFIG = {
  ...MERMAID_RENDER_CONFIG,
};

const MERMAID_MIN_SCALE = 0.05;
const MERMAID_MAX_SCALE = 8;
const MERMAID_ZOOM_STEP = 1.2;

const isMermaidControlTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-mermaid-control]"));

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

const MermaidCanvasComponent = forwardRef<MermaidCanvasHandle, MermaidCanvasProps>(
  function MermaidCanvas({ diagramId, diagramType, code, onInsert }, ref) {
    const [mermaidZoomScale, setMermaidZoomScale] = useState(1);
    const [mermaidRenderError, setMermaidRenderError] = useState<string | null>(null);
    const mermaidViewportRef = useRef<HTMLDivElement | null>(null);
    const mermaidDiagramRef = useRef<HTMLDivElement | null>(null);
    const mermaidCanvasRef = useRef<HTMLDivElement | null>(null);
    const zoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
    const zoomSelectionRef = useRef<Selection<HTMLDivElement, unknown, null, undefined> | null>(null);
    const zoomTransformRef = useRef<ZoomTransform>(zoomIdentity);
    const hasManualViewportRef = useRef(false);
    const safariGestureScaleRef = useRef(1);

    const applyMermaidTransform = (transform: ZoomTransform) => {
      const canvas = mermaidCanvasRef.current;

      if (!canvas) return;

      canvas.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
      canvas.style.transformOrigin = "0 0";
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

    const normalizeWheelDelta = (delta: number, deltaMode: number) => {
      if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
      if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        return delta * (mermaidViewportRef.current?.clientHeight || window.innerHeight);
      }

      return delta;
    };

    const renderStandaloneMermaidSvg = async () => {
      const exportHost = document.createElement("div");
      exportHost.style.position = "fixed";
      exportHost.style.left = "-10000px";
      exportHost.style.top = "0";
      exportHost.style.visibility = "hidden";
      exportHost.style.pointerEvents = "none";

      document.body.appendChild(exportHost);

      try {
        mermaid.initialize(MERMAID_EXPORT_CONFIG);

        const exportId = `mermaid-export-${diagramId}-${Date.now()}`;
        const { svg } = await mermaid.render(exportId, code);

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

    useImperativeHandle(ref, () => ({
      getSvgElement: () => mermaidDiagramRef.current?.querySelector("svg") ?? null,
      exportStandaloneSvg: renderStandaloneMermaidSvg,
    }), [code, diagramId]);

    useEffect(() => {
      mermaid.initialize(MERMAID_RENDER_CONFIG);
    }, []);

    useEffect(() => {
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

        if (!behavior || !selection || isMermaidControlTarget(event.target)) return;

        event.preventDefault();
        event.stopPropagation();
        hasManualViewportRef.current = true;

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

      const stopViewportGesturePropagation = (event: Event) => {
        if (isMermaidControlTarget(event.target)) return;
        event.stopPropagation();
      };

      const handleSafariGestureStart = (event: Event) => {
        if (isMermaidControlTarget(event.target)) return;

        const gestureEvent = event as SafariGestureEvent;
        safariGestureScaleRef.current = gestureEvent.scale || 1;
        event.preventDefault();
        event.stopPropagation();
      };

      const handleSafariGestureChange = (event: Event) => {
        const behavior = zoomBehaviorRef.current;
        const selection = zoomSelectionRef.current;

        if (!behavior || !selection || isMermaidControlTarget(event.target)) return;

        const gestureEvent = event as SafariGestureEvent;
        const nextScale = gestureEvent.scale || safariGestureScaleRef.current || 1;
        const scaleDelta = nextScale / (safariGestureScaleRef.current || 1);

        safariGestureScaleRef.current = nextScale;

        if (!Number.isFinite(scaleDelta) || scaleDelta === 0) return;

        event.preventDefault();
        event.stopPropagation();
        hasManualViewportRef.current = true;

        const rect = viewport.getBoundingClientRect();
        const clientX = gestureEvent.clientX ?? rect.left + rect.width / 2;
        const clientY = gestureEvent.clientY ?? rect.top + rect.height / 2;

        selection.call(
          behavior.scaleBy,
          scaleDelta,
          [clientX - rect.left, clientY - rect.top]
        );
      };

      const handleSafariGestureEnd = (event: Event) => {
        if (isMermaidControlTarget(event.target)) return;

        safariGestureScaleRef.current = 1;
        event.preventDefault();
        event.stopPropagation();
      };

      viewport.addEventListener("wheel", handleWheel, { passive: false });
      viewport.addEventListener("pointerdown", stopViewportGesturePropagation);
      viewport.addEventListener("pointermove", stopViewportGesturePropagation);
      viewport.addEventListener("pointerup", stopViewportGesturePropagation);
      viewport.addEventListener("gesturestart", handleSafariGestureStart, { passive: false });
      viewport.addEventListener("gesturechange", handleSafariGestureChange, { passive: false });
      viewport.addEventListener("gestureend", handleSafariGestureEnd, { passive: false });

      zoomBehaviorRef.current = zoomBehavior;
      zoomSelectionRef.current = viewportSelection;
      zoomTransformRef.current = zoomIdentity;
      setMermaidZoomScale(1);
      applyMermaidTransform(zoomIdentity);

      return () => {
        viewport.removeEventListener("wheel", handleWheel);
        viewport.removeEventListener("pointerdown", stopViewportGesturePropagation);
        viewport.removeEventListener("pointermove", stopViewportGesturePropagation);
        viewport.removeEventListener("pointerup", stopViewportGesturePropagation);
        viewport.removeEventListener("gesturestart", handleSafariGestureStart);
        viewport.removeEventListener("gesturechange", handleSafariGestureChange);
        viewport.removeEventListener("gestureend", handleSafariGestureEnd);
        viewportSelection.on(".zoom", null);
        zoomBehaviorRef.current = null;
        zoomSelectionRef.current = null;
        zoomTransformRef.current = zoomIdentity;
        setMermaidZoomScale(1);
      };
    }, []);

    useEffect(() => {
      const renderDiagram = async () => {
        try {
          const element = mermaidDiagramRef.current;
          if (!element) return;

          hasManualViewportRef.current = false;
          setMermaidRenderError(null);
          element.innerHTML = "";
          await mermaid.parse(code);
          const { svg } = await mermaid.render(`mermaid-svg-${diagramId}`, code);
          element.innerHTML = svg;
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(fitMermaidDiagram);
          });
        } catch (error) {
          console.error("Mermaid syntax error:", error);
          const message = error instanceof Error ? error.message : "No se pudo renderizar el diagrama Mermaid.";
          setMermaidRenderError(message);

          if (mermaidDiagramRef.current) {
            mermaidDiagramRef.current.innerHTML = "";
          }
        }
      };

      const timeoutId = window.setTimeout(renderDiagram, 300);
      return () => window.clearTimeout(timeoutId);
    }, [code, diagramId]);

    useEffect(() => {
      const viewport = mermaidViewportRef.current;

      if (!viewport || typeof ResizeObserver === "undefined") return;

      const resizeObserver = new ResizeObserver(() => {
        if (hasManualViewportRef.current) return;
        window.requestAnimationFrame(fitMermaidDiagram);
      });

      resizeObserver.observe(viewport);

      return () => resizeObserver.disconnect();
    }, []);

    return (
      <>
        {diagramType === "mermaid" ? (
          <MermaidToolbar onInsert={onInsert} />
        ) : (
          <div
            data-mermaid-control
            className="absolute left-3 top-3 z-10 rounded-xl border border-border/80 bg-white/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur"
          >
            Modo C4Context experimental de Mermaid
          </div>
        )}
        <div
          ref={mermaidViewportRef}
          className="mermaid-overscroll-guard mermaid-gesture-surface h-full w-full overflow-hidden select-none"
        >
          {mermaidRenderError && (
            <div
              data-mermaid-control
              className="absolute bottom-3 left-3 z-10 max-w-[min(32rem,calc(100%-1.5rem))] rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-sm"
            >
              {mermaidRenderError}
            </div>
          )}
          <div
            data-mermaid-control
            className="absolute right-3 top-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-white/95 p-2 shadow-sm backdrop-blur"
          >
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
                hasManualViewportRef.current = true;
                centerMermaidDiagramAtScale(1);
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
                hasManualViewportRef.current = false;
                fitMermaidDiagram();
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
              id={`mermaid-diagram-${diagramId}`}
              className="inline-block"
            />
          </div>
        </div>
      </>
    );
  }
);

MermaidCanvasComponent.displayName = "MermaidCanvas";

export const MermaidCanvas = memo(MermaidCanvasComponent);
