import type { PhotoResult } from "@/lib/finder";

/**
 * The original photo with a thin crosshair ring on each candidate, ranked by confidence.
 * Version 2: signal red for the most likely spot, dashed amber for the rest.
 */
export function Circles({ src, photo }: { src: string; photo: PhotoResult }) {
  const { width: W, height: H, candidates } = photo;
  const minR = Math.max(W, H) * 0.035;
  const stroke = Math.max(W, H) / 500;
  return (
    // w-fit: the box hugs the image, so the SVG overlay (inset-0) has exactly the image's shape,
    // even when a tall photo is capped to 78vh.
    <div className="case relative mx-auto w-fit overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
      <img src={src} alt={`Scene photo ${photo.idx}`} className="block max-h-[78vh] w-auto max-w-full" />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {candidates.map((c, i) => {
          const cx = (c.x0 + c.x1) / 2;
          const cy = (c.y0 + c.y1) / 2;
          // An ellipse that follows the box's own shape. (It was a circle from the box's longer
          // side, so a wide, short box like keys in a tray got a ring far bigger than the keys.)
          const rx = Math.max((c.x1 - c.x0) / 2, minR) * 1.2;
          const ry = Math.max((c.y1 - c.y0) / 2, minR) * 1.2;
          const top = i === 0;
          const colour = top ? "#d9432f" : "#e8a33d";
          const tick = Math.min(rx, ry) * 0.45;
          return (
            <g key={i} stroke={colour} fill="none" strokeWidth={top ? stroke * 1.6 : stroke} opacity={top ? 1 : 0.45 + c.confidence * 0.5}>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} strokeDasharray={top ? undefined : `${stroke * 6} ${stroke * 4}`} />
              {top && (
                <path
                  d={`M${cx} ${cy - ry - tick}V${cy - ry + tick * 0.4} M${cx} ${cy + ry - tick * 0.4}V${cy + ry + tick} M${cx - rx - tick} ${cy}H${cx - rx + tick * 0.4} M${cx + rx - tick * 0.4} ${cy}H${cx + rx + tick}`}
                />
              )}
            </g>
          );
        })}
      </svg>
      {candidates.map((c, i) => {
        const rx = Math.max((c.x1 - c.x0) / 2, minR) * 1.2;
        const ry = Math.max((c.y1 - c.y0) / 2, minR) * 1.2;
        const x = (c.x0 + c.x1) / 2 / W;
        // Near an edge, the tag starts (or ends) at the ring's outer side instead of centring on it,
        // so it never runs off the photo. (Version 1's tags were clipped at the left edge.)
        const anchor = x < 0.3 ? "translate-x-0" : x > 0.7 ? "-translate-x-full" : "-translate-x-1/2";
        const left = x < 0.3 ? Math.max(0, x - rx / W) : x > 0.7 ? Math.min(1, x + rx / W) : x;
        // The tag sits under its ring, unless that would run off the bottom: then above it.
        const cy = (c.y0 + c.y1) / 2;
        const below = ((cy + ry * 1.45) / H) * 100;
        const top = below <= 92 ? `${below}%` : `calc(${((cy - ry * 1.45) / H) * 100}% - 1.6rem)`;
        return (
          <span
            key={i}
            className={`label absolute ${anchor} whitespace-nowrap px-2 py-1 ${i === 0 ? "bg-signal text-ink" : "bg-cream/85 text-flare"}`}
            style={{
              left: `${left * 100}%`,
              top,
            }}
          >
            {/* Faint guesses get just their number on the photo, so tags don't collide; the full
                text is in the findings list beside it. */}
            {i === 0 || c.confidence >= 0.4 ? `#${i + 1} · ${Math.round(c.confidence * 100)}% · ${c.label}` : `#${i + 1}`}
          </span>
        );
      })}
    </div>
  );
}
