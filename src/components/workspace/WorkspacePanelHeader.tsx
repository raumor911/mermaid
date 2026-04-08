import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspacePanelHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  meta?: string;
  action?: ReactNode;
  className?: string;
};

export function WorkspacePanelHeader({
  icon: Icon,
  eyebrow,
  title,
  meta,
  action,
  className,
}: WorkspacePanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/80 bg-white/75 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-secondary/70 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
          </div>
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
