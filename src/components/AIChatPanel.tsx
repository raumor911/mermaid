import { SpektrPanel } from "@/components/SpektrPanel";
import { getSpektrWorkspaceName } from "@/lib/spektr/config";

interface AIChatPanelProps {
  currentCode: string;
  onCodeUpdate: (newCode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatPanel({
  currentCode,
  onCodeUpdate,
  isOpen,
  onClose,
}: AIChatPanelProps) {
  return (
    <SpektrPanel
      currentCode={currentCode}
      currentProject={getSpektrWorkspaceName()}
      isOpen={isOpen}
      onClose={onClose}
      onCodeUpdate={onCodeUpdate}
    />
  );
}
