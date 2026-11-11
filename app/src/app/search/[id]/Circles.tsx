import type { PhotoResult } from "@/lib/finder";

/** The original photo with a glowing circle around each candidate, ranked by confidence. */
export function Circles({ src, photo }: { src: string; photo: PhotoResult }) {
  const { width: W, height: H, candidates } = photo;
  const minR = Math.max(W, H) * 0.035;
  return (
    // w-fit: the box hugs the image, so the SVG overlay (inset-0) has exactly the image's shape,
    // even when a tall photo is capped to 78vh.
    <div className="pop relative mx-auto w-fit overflow-hidden rounded-3xl bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
      <img src={src} alt={`Scene photo ${photo.idx}`} className="block max-h-[78vh] w-auto max-w-full" />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <filter id={`glow-${photo.idx}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={W / 160} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {candidates.map((c, i) => {
          const cx = (c.x0 + c.x1) / 2;
          const cy = (c.y0 + c.y1) / 2;
          const rx = Math.max((c.x1 - c.x0) / 2, minR) * 1.35;
          const ry = Math.max((c.y1 - c.y0) / 2, minR) * 1.35;
          const top = i === 0;
          return (
            <g key={i} filter={`url(#glow-${photo.idx})`}>
              <ellipse
                cx={cx} cy={cy} rx={rx} ry={ry}
                fill="none"
                stroke={top ? "#ff4d1f" : "#ffc93c"}
                strokeWidth={W / (top ? 160 : 260)}
                strokeDasharray={top ? undefined : `${W / 80} ${W / 120}`}
                opacity={0.35 + c.confidence * 0.65}
                className={top ? "circle-pulse" : undefined}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            </g>
          );
        })}
      </svg>
      {candidates.map((c, i) => (
        <span
          key={i}
          className={`absolute -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-ink px-2 py-0.5 font-mono text-[11px] font-bold md:text-xs ${i === 0 ? "bg-flare text-white" : "bg-sun"}`}
          style={{
            left: `${(((c.x0 + c.x1) / 2) / W) * 100}%`,
            // just under the ring: centre + the ring's vertical radius (same maths as the ellipse above)
            top: `${Math.min(92, (((c.y0 + c.y1) / 2 + Math.max((c.y1 - c.y0) / 2, minR) * 1.35) / H) * 100 + 1)}%`,
          }}
        >
          #{i + 1} · {Math.round(c.confidence * 100)}% · {c.label}
        </span>
      ))}
    </div>
  );
}
