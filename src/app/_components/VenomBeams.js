"use client";

import { useEffect, useRef } from "react";

/**
 * VenomBeams — animated beam background (canvas)
 * - Works over any bg image/color.
 * - Uses additive blend for a glow/venom vibe.
 * - Theme colors default to your palette.
 *
 * Props:
 *   className (string) — e.g. "absolute inset-0 -z-10"
 *   colors (array) — e.g. ["#2E5EAA", "#81B29A", "#4A8FE7"]
 *   density (number) — 6..16 (more = more beams)
 *   speed (number) — 0.3..2.0 (faster = wilder)
 *   opacity (number) — 0.2..1 (beam alpha)
 */
export default function VenomBeams({
  className = "",
  colors = ["#2E5EAA", "#81B29A", "#4A8FE7"],
  density = 10,
  speed = 0.7,
  opacity = 0.65,
}) {
  const ref = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    let w = (canvas.width = canvas.offsetWidth * devicePixelRatio);
    let h = (canvas.height = canvas.offsetHeight * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    // Beam particles
    const beams = Array.from({ length: density }).map((_, i) => {
      const c = colors[i % colors.length];
      return {
        x: Math.random(),
        y: Math.random(),
        angle: Math.random() * Math.PI * 2,
        width: 180 + Math.random() * 240,   // beam length
        thick: 2 + Math.random() * 4,       // beam thickness
        hue: c,
        drift: (Math.random() * 0.5 + 0.5) * speed,
        curl: Math.random() * 0.8 + 0.2,
      };
    });

    const draw = (t) => {
      // subtle fade to create trails
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0)"; // transparent (we rely on underlying bg)
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Additive glow for beams
      ctx.globalCompositeOperation = "screen";

      beams.forEach((b, idx) => {
        // Move
        b.angle += 0.002 * b.curl + 0.0008 * Math.sin((t * 0.001 + idx) * 0.5);
        b.x += Math.cos(b.angle) * 0.0015 * b.drift;
        b.y += Math.sin(b.angle) * 0.0015 * b.drift;

        // Wrap around
        if (b.x < -0.2) b.x = 1.2;
        if (b.x > 1.2) b.x = -0.2;
        if (b.y < -0.2) b.y = 1.2;
        if (b.y > 1.2) b.y = -0.2;

        const cx = b.x * canvas.offsetWidth;
        const cy = b.y * canvas.offsetHeight;

        // Gradient along the beam
        const a = Math.cos(b.angle) * b.width;
        const bdy = Math.sin(b.angle) * b.width;
        const x1 = cx - a;
        const y1 = cy - bdy;
        const x2 = cx + a;
        const y2 = cy + bdy;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, hexToRgba(b.hue, 0));
        grad.addColorStop(0.3, hexToRgba(b.hue, opacity * 0.9));
        grad.addColorStop(0.5, hexToRgba("#ffffff", opacity * 0.25));
        grad.addColorStop(0.7, hexToRgba(b.hue, opacity * 0.9));
        grad.addColorStop(1, hexToRgba(b.hue, 0));

        ctx.strokeStyle = grad;
        ctx.lineWidth = b.thick;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [colors, density, speed, opacity]);

  return (
    <canvas
      ref={ref}
      className={`pointer-events-none ${className}`}
      style={{
        mixBlendMode: "screen",      // glowy over your bg image
        filter: "blur(0.2px)",       // crisp lines, slight AA
      }}
    />
  );
}

// Helpers
function hexToRgba(hex, a = 1) {
  const c = hex.replace("#", "");
  const bn = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  const r = (bn >> 16) & 255;
  const g = (bn >> 8) & 255;
  const b = bn & 255;
  return `rgba(${r},${g},${b},${a})`;
}
