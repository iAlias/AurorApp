import { fillFraction, sunAngleDeg } from '../core/timer/progress';

export const RAINBOW_COLORS = [
  '#FF5D5D',
  '#FF9A3D',
  '#FFD166',
  '#7BC950',
  '#4CC9F0',
  '#5E7CE2',
  '#9B5DE5',
] as const;

export interface RainbowProps {
  /** Avanzamento del timer pasto, 0..1. */
  progress: number;
  className?: string;
}

const CENTER_X = 500;
const CENTER_Y = 520;
const OUTER_RADIUS = 380;
const RADIUS_STEP = 30;
const STROKE_WIDTH = 26;
const BASE_COLOR = '#E8E4DA';
const BASE_OPACITY = 0.6;

const SUN_ORBIT_RADIUS = OUTER_RADIUS + 46;
const SUN_RADIUS = 40;
const SUN_FILL = '#FFD166';
const SUN_STROKE = '#FF9A3D';
const SUN_RAY_COUNT = 8;
const SUN_FACE_COLOR = '#4A3B2A';

const CLOUD_X = 880;
const CLOUD_Y = 470;

/** Path SVG di un arco semicircolare (180°→0°) di raggio `r` centrato in (CENTER_X, CENTER_Y). */
function arcPath(r: number): string {
  return `M ${CENTER_X - r} ${CENTER_Y} A ${r} ${r} 0 0 1 ${CENTER_X + r} ${CENTER_Y}`;
}

/**
 * Arcobaleno SVG del timer pasto (§8.2). Componente puro e statico: la sola
 * prop `progress` guida il riempimento dei 7 archi (`fillFraction`, Task 15)
 * e la posizione del sole lungo la volta (`sunAngleDeg`, Task 15). Nessuna
 * animazione propria — la micro-oscillazione "viva" del sole e' responsabilita'
 * del chiamante (Task 17, wrapper `motion.div`).
 */
export function Rainbow({ progress, className }: RainbowProps) {
  const sunAngleRad = (sunAngleDeg(progress) * Math.PI) / 180;
  const sunX = CENTER_X + SUN_ORBIT_RADIUS * Math.cos(sunAngleRad);
  const sunY = CENTER_Y - SUN_ORBIT_RADIUS * Math.sin(sunAngleRad);

  return (
    <svg viewBox="0 0 1000 560" className={className}>
      <g data-testid="arcs">
        {RAINBOW_COLORS.map((color, i) => {
          const r = OUTER_RADIUS - i * RADIUS_STEP;
          const d = arcPath(r);
          const offset = 1 - fillFraction(progress, i);
          return (
            <g key={color}>
              <path
                d={d}
                fill="none"
                stroke={BASE_COLOR}
                strokeOpacity={BASE_OPACITY}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                data-testid={`arc-base-${i}`}
              />
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
                strokeDashoffset={offset}
                data-testid={`arc-fill-${i}`}
              />
            </g>
          );
        })}
      </g>

      <g data-testid="cloud" transform={`translate(${CLOUD_X}, ${CLOUD_Y})`}>
        <ellipse cx={0} cy={0} rx={46} ry={24} fill="#FFFFFF" />
        <ellipse cx={-24} cy={6} rx={26} ry={18} fill="#FFFFFF" />
        <ellipse cx={26} cy={8} rx={28} ry={16} fill="#FFFFFF" />
        <line x1={0} y1={-24} x2={0} y2={-46} stroke="#B8B0A0" strokeWidth={3} strokeLinecap="round" />
        <path d="M 0 -46 L 20 -38 L 0 -30 Z" fill="#FF5D5D" />
      </g>

      <g data-testid="sun" transform={`translate(${sunX}, ${sunY})`}>
        {Array.from({ length: SUN_RAY_COUNT }, (_, i) => {
          const rayAngle = (i * 360) / SUN_RAY_COUNT;
          return (
            <line
              key={rayAngle}
              x1={0}
              y1={-(SUN_RADIUS + 6)}
              x2={0}
              y2={-(SUN_RADIUS + 20)}
              stroke={SUN_FILL}
              strokeWidth={6}
              strokeLinecap="round"
              transform={`rotate(${rayAngle})`}
            />
          );
        })}
        <circle r={SUN_RADIUS} fill={SUN_FILL} stroke={SUN_STROKE} strokeWidth={4} />
        <circle cx={-14} cy={-8} r={4} fill={SUN_FACE_COLOR} />
        <circle cx={14} cy={-8} r={4} fill={SUN_FACE_COLOR} />
        <path
          d="M -16 8 Q 0 22 16 8"
          fill="none"
          stroke={SUN_FACE_COLOR}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
