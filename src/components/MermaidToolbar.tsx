import { 
  Square, 
  Circle, 
  Database, 
  ArrowRight, 
  GitCommit, // Using as proxy for sub-process/group
  Type,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidToolbarProps {
  onInsert: (snippet: string) => void;
}

export function MermaidToolbar({ onInsert }: MermaidToolbarProps) {
  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 bg-white p-1.5 rounded-lg shadow-md border border-gray-200 z-10 transition-opacity hover:opacity-100 opacity-80">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-gray-400 px-1 mb-1">NODES</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert('\n    NewNode[New Node]')}>
          <Square className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert('\n    NewCircle((Circle))')}>
          <Circle className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert('\n    NewDB[(Database)]')}>
          <Database className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="h-px bg-gray-200 mx-1" />
      
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-gray-400 px-1 mb-1">LINKS</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert(' --> ')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert(' -.-> ')}>
          <GitCommit className="w-4 h-4 rotate-90" /> {/* Dotted proxy */}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert(' -- Label --> ')}>
          <Type className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-px bg-gray-200 mx-1" />

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-gray-400 px-1 mb-1">FLOW</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert('\n    subgraph NewGroup\n    End')}>
          <div className="border border-dashed border-current w-4 h-4 rounded" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert('direction TD\n')}>
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
