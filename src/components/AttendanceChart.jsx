import { useId } from "react";

function niceMax(value) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

/**
 * Responsive SVG area chart (no chart library).
 * data: [{ label: "Mon", value: 12 }, ...]
 */
export default function AttendanceChart({ data, color = "#2563eb" }) {
  const gradientId = useId().replace(/:/g, "");
  const width = 640;
  const height = 240;
  const pad = { top: 16, right: 20, bottom: 30, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(0, ...data.map((item) => item.value)));
  const ticks = 4;
  const x = (index) =>
    pad.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value) => pad.top + innerH - (value / max) * innerH;

  const points = data.map((item, index) => [x(index), y(item.value)]);
  const line = points.map(([px, py], index) => `${index === 0 ? "M" : "L"}${px},${py}`).join(" ");
  const area = points.length
    ? `${line} L${points[points.length - 1][0]},${pad.top + innerH} L${points[0][0]},${pad.top + innerH} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Students marked present per day">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {Array.from({ length: ticks + 1 }).map((_, index) => {
        const value = Math.round((max / ticks) * index);
        const gy = y(value);
        return (
          <g key={index}>
            <line x1={pad.left} x2={width - pad.right} y1={gy} y2={gy} stroke="#e2e8f0" strokeDasharray="3 4" />
            <text x={pad.left - 8} y={gy + 4} textAnchor="end" fontSize="12" fill="#64748b">
              {value}
            </text>
          </g>
        );
      })}

      {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      {line ? <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" /> : null}

      {data.map((item, index) => (
        <g key={item.label + index}>
          <circle cx={x(index)} cy={y(item.value)} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5">
            <title>{`${item.label}: ${item.value}`}</title>
          </circle>
          <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="12" fill="#475569">
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
