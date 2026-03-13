interface Point {
  t: number; // seconds
  m: number; // multiplier
}

interface CrashGraphProps {
  state: 'WAITING' | 'RUNNING' | 'CRASHED';
  multiplier: number;
  points: Point[];
}

export function CrashGraph({ state, points }: CrashGraphProps): JSX.Element {
  const width = 600;
  const height = 200;

  if (points.length === 0) {
    return (
      <div className="w-full max-w-xl h-[200px] rounded bg-slate-950/60 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
        Waiting for next round…
      </div>
    );
  }

  const maxT = Math.max(...points.map(p => p.t), 1);
  const maxM = Math.max(...points.map(p => p.m), 2);

  const toX = (t: number) => (t / maxT) * width;
  const toY = (m: number) => height - (m / maxM) * height;

  const pathD = points
    .map((p, idx) => {
      const x = toX(p.t);
      const y = toY(p.m);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="w-full max-w-xl rounded bg-slate-950/60 border border-slate-800 shadow-inner"
    >
      {/* Y-axis markers */}
      {[1, 2, 3, 4].map(i => {
        const yVal = (i * maxM) / 4;
        const y = toY(yVal);
        return (
          <g key={i}>
            <line
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke="#1f2937"
              strokeWidth={0.5}
            />
            <text x={4} y={y - 2} fontSize={10} fill="#6b7280">
              {yVal.toFixed(1)}x
            </text>
          </g>
        );
      })}

      {/* Line path */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke={state === 'CRASHED' ? '#f97373' : '#facc15'}
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

