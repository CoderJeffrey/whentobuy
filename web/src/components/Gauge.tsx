import type { Rating } from "../types";

interface GaugeProps {
  percentage: number;
  rating: Rating;
  total: number;
  max: number;
}

const ZONES: { rating: Rating; from: number; to: number; color: string }[] = [
  { rating: "immediate_sell", from: 0, to: 20, color: "var(--rating-immediate_sell)" },
  { rating: "weak_sell", from: 20, to: 40, color: "var(--rating-weak_sell)" },
  { rating: "hold", from: 40, to: 60, color: "var(--rating-hold)" },
  { rating: "weak_buy", from: 60, to: 80, color: "var(--rating-weak_buy)" },
  { rating: "strong_buy", from: 80, to: 100, color: "var(--rating-strong_buy)" },
];

const RATING_LABEL: Record<Rating, string> = {
  strong_buy: "STRONG BUY",
  weak_buy: "WEAK BUY",
  hold: "HOLD",
  weak_sell: "WEAK SELL",
  immediate_sell: "IMMEDIATE SELL",
};

const CX = 150;
const CY = 150;
const R_OUTER = 130;
const R_INNER = 90;

function pctToAngle(pct: number): number {
  // 0% -> 180deg (left), 100% -> 360deg (right), sweep across top
  return 180 + (pct / 100) * 180;
}

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function arcPath(fromPct: number, toPct: number): string {
  const a1 = pctToAngle(fromPct);
  const a2 = pctToAngle(toPct);
  const [x1o, y1o] = polar(a1, R_OUTER);
  const [x2o, y2o] = polar(a2, R_OUTER);
  const [x2i, y2i] = polar(a2, R_INNER);
  const [x1i, y1i] = polar(a1, R_INNER);
  const large = a2 - a1 > 180 ? 1 : 0;
  return [
    `M ${x1o} ${y1o}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x2i} ${y2i}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${x1i} ${y1i}`,
    "Z",
  ].join(" ");
}

export function Gauge({ percentage, rating, total, max }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const needleAngle = pctToAngle(clamped);
  const [nx, ny] = polar(needleAngle, R_OUTER - 6);
  const ratingColor = `var(--rating-${rating})`;

  return (
    <div
      className="flex flex-col items-center"
      data-testid="gauge"
      data-rating={rating}
      data-percentage={clamped}
    >
      <svg
        viewBox="0 0 300 180"
        width="300"
        height="180"
        role="img"
        aria-label={`Gauge: ${RATING_LABEL[rating]}, ${clamped}%`}
      >
        {ZONES.map((z) => (
          <path
            key={z.rating}
            d={arcPath(z.from, z.to)}
            fill={z.color}
            opacity={z.rating === rating ? 1 : 0.35}
          />
        ))}

        <line
          x1={CX}
          y1={CY}
          x2={nx}
          y2={ny}
          stroke="var(--text-primary)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={8} fill="var(--text-primary)" />
        <circle cx={CX} cy={CY} r={4} fill="var(--bg-card)" />
      </svg>

      <div className="flex flex-col items-center -mt-2 gap-1">
        <div
          className="text-2xl font-bold tracking-wider"
          style={{ color: ratingColor }}
          data-testid="gauge-rating"
        >
          {RATING_LABEL[rating]}
        </div>
        <div
          className="font-mono text-sm"
          style={{ color: "var(--text-muted)" }}
          data-testid="gauge-score"
        >
          {total} / {max} · {clamped}%
        </div>
      </div>
    </div>
  );
}
