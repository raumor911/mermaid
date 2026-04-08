import { motion } from 'framer-motion';
import { History, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Version {
  id: string;
  tag: string;
  description: string;
  timestamp: string;
  author: string;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onRestore: (versionId: string) => void;
}

// Mock Data
const MOCK_VERSIONS: Version[] = [
  {
    id: 'v1.1.0',
    tag: 'v1.1.0',
    description: 'Added AI-generated nodes',
    timestamp: 'Just now',
    author: 'AI Assistant'
  },
  {
    id: 'v1.0.2',
    tag: 'v1.0.2',
    description: 'Updated color scheme to corporate palette',
    timestamp: '2 hours ago',
    author: 'Raumor'
  },
  {
    id: 'v1.0.1',
    tag: 'v1.0.1',
    description: 'Fixed connection logic in sub-graph',
    timestamp: 'Yesterday',
    author: 'Raumor'
  },
  {
    id: 'v1.0.0',
    tag: 'v1.0.0',
    description: 'Initial commit of Vantage Architecture',
    timestamp: '2 days ago',
    author: 'Raumor'
  }
];

export function VersionHistory({ isOpen, onRestore }: VersionHistoryProps) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: isOpen ? 320 : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="border-l bg-gray-50 flex flex-col overflow-hidden h-full"
    >
      <div className="p-4 border-b bg-white flex items-center justify-between min-w-[320px]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm">Version History</h3>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {MOCK_VERSIONS.length} commits
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[320px]">
        {MOCK_VERSIONS.map((version, index) => (
          <div key={version.id} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-0 last:pb-0 group">
            <div className={cn(
              "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm transition-colors",
              index === 0 ? "bg-primary" : "bg-gray-300 group-hover:bg-cyan-400"
            )} />
            
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  index === 0 ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                )}>
                  {version.tag}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {version.timestamp}
                </span>
              </div>
              
              <p className="text-xs font-medium text-gray-800 mb-2 line-clamp-2">
                {version.description}
              </p>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[8px] text-white font-bold">
                    {version.author[0]}
                  </div>
                  <span className="text-[10px] text-gray-500">{version.author}</span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRestore(version.id)}
                  className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
