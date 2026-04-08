import { useId } from "react";
import { cn } from "@/lib/utils";

type SpektrLogoProps = {
  className?: string;
  mode?: "full" | "icon";
  title?: string;
  wordmark?: string;
  subtitle?: string;
};

export function SpektrLogo({
  className,
  mode = "full",
  title = "MERMAID Flow Studio",
  wordmark = "MERMAID",
  subtitle = "FLOW STUDIO",
}: SpektrLogoProps) {
  const gradientScope = useId().replace(/:/g, "");
  const strokeGradientId = `${gradientScope}-stroke`;
  const nodeGradientAId = `${gradientScope}-node-a`;
  const nodeGradientBId = `${gradientScope}-node-b`;
  const wordmarkGradientId = `${gradientScope}-wordmark`;

  const icon = (
    <svg
      viewBox="0 0 96 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("h-full w-auto", className)}
      preserveAspectRatio="xMinYMid meet"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={strokeGradientId} x1="10" y1="12" x2="92" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--brand-start))" />
          <stop offset="0.52" stopColor="hsl(var(--brand-middle))" />
          <stop offset="1" stopColor="hsl(var(--brand-end))" />
        </linearGradient>
        <linearGradient id={nodeGradientAId} x1="18" y1="54" x2="30" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary) / 0.88)" />
          <stop offset="1" stopColor="hsl(var(--brand-start))" />
        </linearGradient>
        <linearGradient id={nodeGradientBId} x1="56" y1="14" x2="74" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--brand-middle))" />
          <stop offset="1" stopColor="hsl(var(--brand-end))" />
        </linearGradient>
      </defs>
      <g transform="translate(4 6)">
        <rect
          x="0.75"
          y="0.75"
          width="86.5"
          height="58.5"
          rx="18"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        <path
          d="M16 42L30 18L44 42L58 22L72 42"
          stroke={`url(#${strokeGradientId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M30 18L58 22"
          stroke="hsl(var(--brand-end))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 6"
        />
        <circle cx="16" cy="42" r="6" fill={`url(#${nodeGradientAId})`} />
        <circle cx="30" cy="18" r="7.5" fill={`url(#${nodeGradientBId})`} />
        <circle cx="44" cy="42" r="6" fill="hsl(var(--brand-middle))" />
        <circle cx="58" cy="22" r="7.5" fill="hsl(var(--brand-end))" />
        <circle cx="72" cy="42" r="6" fill="hsl(var(--primary))" />
      </g>
    </svg>
  );

  if (mode === "icon") {
    return icon;
  }

  return (
    <svg
      viewBox="0 0 320 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("h-full w-auto", className)}
      preserveAspectRatio="xMinYMid meet"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={strokeGradientId} x1="10" y1="12" x2="92" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--brand-start))" />
          <stop offset="0.52" stopColor="hsl(var(--brand-middle))" />
          <stop offset="1" stopColor="hsl(var(--brand-end))" />
        </linearGradient>
        <linearGradient id={nodeGradientAId} x1="18" y1="54" x2="30" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary) / 0.88)" />
          <stop offset="1" stopColor="hsl(var(--brand-start))" />
        </linearGradient>
        <linearGradient id={nodeGradientBId} x1="56" y1="14" x2="74" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--brand-middle))" />
          <stop offset="1" stopColor="hsl(var(--brand-end))" />
        </linearGradient>
        <linearGradient id={wordmarkGradientId} x1="108" y1="16" x2="274" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--brand-start))" />
          <stop offset="0.5" stopColor="hsl(var(--brand-middle))" />
          <stop offset="1" stopColor="hsl(var(--brand-end))" />
        </linearGradient>
      </defs>
      <g transform="translate(8 6)">
        <rect
          x="0.75"
          y="0.75"
          width="86.5"
          height="58.5"
          rx="18"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        <path
          d="M16 42L30 18L44 42L58 22L72 42"
          stroke={`url(#${strokeGradientId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M30 18L58 22"
          stroke="hsl(var(--brand-end))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 6"
        />
        <circle cx="16" cy="42" r="6" fill={`url(#${nodeGradientAId})`} />
        <circle cx="30" cy="18" r="7.5" fill={`url(#${nodeGradientBId})`} />
        <circle cx="44" cy="42" r="6" fill="hsl(var(--brand-middle))" />
        <circle cx="58" cy="22" r="7.5" fill="hsl(var(--brand-end))" />
        <circle cx="72" cy="42" r="6" fill="hsl(var(--primary))" />
      </g>
      <g transform="translate(108 17)">
        <text
          x="0"
          y="20"
          fill={`url(#${wordmarkGradientId})`}
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="28"
          fontWeight="800"
          letterSpacing="0.16em"
        >
          {wordmark}
        </text>
        <text
          x="1"
          y="42"
          fill="hsl(var(--muted-foreground))"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.28em"
        >
          {subtitle}
        </text>
      </g>
    </svg>
  );
}
