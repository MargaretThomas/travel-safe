import { cn } from "@/lib/utils";

export interface TrailPoint {
  latitude: number;
  longitude: number;
}

interface TrailMapProps {
  points: TrailPoint[];
  className?: string;
  label: string;
}

/**
 * A dependency-free sketch of a GPS trail. It is intentionally not a tile map:
 * emergency pages should not leak coordinates to a third-party tile provider.
 */
export function TrailMap({ points, className, label }: TrailMapProps) {
  const coordinates = points.map((point) => toSvg(point, points));

  return (
    <svg
      viewBox="0 0 100 72"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="trail-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="trail-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="72" fill="var(--muted)" opacity="0.35" />
      {Array.from({ length: 9 }).map((_, index) => (
        <line
          key={`v-${index}`}
          x1={index * 12.5}
          y1="0"
          x2={index * 12.5}
          y2="72"
          stroke="var(--foreground)"
          strokeOpacity="0.055"
          strokeWidth="0.35"
        />
      ))}
      {Array.from({ length: 7 }).map((_, index) => (
        <line
          key={`h-${index}`}
          x1="0"
          y1={index * 12}
          x2="100"
          y2={index * 12}
          stroke="var(--foreground)"
          strokeOpacity="0.055"
          strokeWidth="0.35"
        />
      ))}
      <circle cx={coordinates.at(-1)?.x ?? 50} cy={coordinates.at(-1)?.y ?? 36} r="22" fill="url(#trail-glow)" />
      {coordinates.length > 1 && (
        <polyline
          points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="url(#trail-line)"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {coordinates.map((point, index) => {
        const last = index === coordinates.length - 1;
        return (
          <g key={`${point.x}-${point.y}-${index}`}>
            {last && (
              <circle cx={point.x} cy={point.y} r="4" fill="var(--primary)" opacity="0.2">
                <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.28;0.05;0.28" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={last ? 2.1 : 1.35}
              fill={last ? "var(--primary)" : "var(--card)"}
              stroke="var(--primary)"
              strokeWidth={last ? 1.1 : 0.8}
            />
          </g>
        );
      })}
    </svg>
  );
}

function toSvg(point: TrailPoint, points: TrailPoint[]) {
  const latitudes = points.map((item) => item.latitude);
  const longitudes = points.map((item) => item.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  const x = lonRange === 0 ? 50 : 8 + ((point.longitude - minLon) / lonRange) * 84;
  const y = latRange === 0 ? 36 : 8 + ((maxLat - point.latitude) / latRange) * 56;
  return { x, y };
}
