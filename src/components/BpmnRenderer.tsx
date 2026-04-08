import { useEffect, useRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

interface BpmnRendererProps {
  xml: string;
  onXmlChange?: (xml: string) => void;
}

export function BpmnRenderer({ xml, onXmlChange }: BpmnRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const lastImportedXml = useRef<string | null>(null);
  const lastInvalidXml = useRef<string | null>(null);

  const isValidXml = (source: string) => {
    const parsed = new DOMParser().parseFromString(source, 'application/xml');
    return !parsed.querySelector('parsererror');
  };

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      modelerRef.current = new BpmnModeler({
        container: containerRef.current,
        keyboard: {
          bindTo: document
        }
      });

      // Listen for changes
      modelerRef.current.on('commandStack.changed', async () => {
        if (onXmlChange) {
          try {
            const { xml: newXml } = await modelerRef.current.saveXML({ format: true });
            lastImportedXml.current = newXml;
            onXmlChange(newXml);
          } catch (err) {
            console.error('Error saving BPMN XML', err);
          }
        }
      });

    } catch (err) {
      console.error('Error initializing BPMN modeler', err);
    }

    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
    };
  }, []); // Init once

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;

    const stopPropagation = (event: Event) => {
      event.stopPropagation();
    };

    const containGesture = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    host.addEventListener('wheel', stopPropagation, { capture: true });
    host.addEventListener('touchmove', stopPropagation, { capture: true });
    host.addEventListener('gesturestart', containGesture, { passive: false });
    host.addEventListener('gesturechange', containGesture, { passive: false });
    host.addEventListener('gestureend', containGesture, { passive: false });

    return () => {
      host.removeEventListener('wheel', stopPropagation, true);
      host.removeEventListener('touchmove', stopPropagation, true);
      host.removeEventListener('gesturestart', containGesture);
      host.removeEventListener('gesturechange', containGesture);
      host.removeEventListener('gestureend', containGesture);
    };
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (modelerRef.current && xml && xml !== lastImportedXml.current) {
        if (!isValidXml(xml)) {
          if (lastInvalidXml.current !== xml) {
            console.warn('Skipping BPMN import until XML is well-formed.');
            lastInvalidXml.current = xml;
          }
          return;
        }

        try {
          await modelerRef.current.importXML(xml);
          lastImportedXml.current = xml;
          lastInvalidXml.current = null;
        } catch (err) {
          console.error('BPMN rendering error', err);
        }
      }
    };

    const timeoutId = window.setTimeout(renderDiagram, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [xml]);

  return (
    <div ref={hostRef} className="viewer-overscroll-guard relative h-full w-full overflow-hidden bg-white">
      <div className="viewer-overscroll-guard viewer-gesture-guard h-full w-full overflow-hidden">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <style>{`
        .djs-palette {
          top: 10px;
          left: 10px;
        }
      `}</style>
    </div>
  );
}
