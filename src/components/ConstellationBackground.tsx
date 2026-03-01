'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Zodiac constellation data
// stars: [x, y] pixel offsets from constellation centre (scaled by viewport)
// lines: index pairs to draw connecting lines between stars
// ---------------------------------------------------------------------------
const CONSTELLATIONS = [
  {
    name: 'Aries',
    stars: [[0,0],[32,-8],[58,-20],[62,-35]] as [number,number][],
    lines: [[0,1],[1,2],[2,3]] as [number,number][],
  },
  {
    name: 'Taurus',
    stars: [[0,0],[-28,28],[-55,12],[-72,-18],[-50,-38],[38,-52],[18,-64]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6]] as [number,number][],
  },
  {
    name: 'Gemini',
    stars: [[0,0],[-5,-38],[-5,-62],[28,0],[25,-35],[22,-60],[0,-25]] as [number,number][],
    lines: [[0,1],[1,2],[3,4],[4,5],[0,3],[1,4],[0,6],[6,3]] as [number,number][],
  },
  {
    name: 'Cancer',
    stars: [[0,0],[35,5],[30,-30],[-28,-25],[-40,15]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,0]] as [number,number][],
  },
  {
    name: 'Leo',
    stars: [[0,0],[-18,-28],[-28,-55],[-18,-80],[5,-72],[22,-50],[12,-24],[60,-12],[80,22]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[0,7],[7,8]] as [number,number][],
  },
  {
    name: 'Virgo',
    stars: [[0,0],[22,-42],[38,-68],[18,-90],[-22,-78],[-42,-52],[55,32],[72,58]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,1],[0,6],[6,7]] as [number,number][],
  },
  {
    name: 'Libra',
    stars: [[0,0],[48,0],[22,-42],[-28,18]] as [number,number][],
    lines: [[0,1],[0,2],[1,2],[0,3]] as [number,number][],
  },
  {
    name: 'Scorpius',
    stars: [[0,0],[18,-28],[32,-48],[22,-68],[0,-85],[-28,-95],[-42,-115],[-32,-135],[-10,-150],[12,-160]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]] as [number,number][],
  },
  {
    name: 'Sagittarius',
    stars: [[0,0],[30,-18],[52,5],[72,-22],[52,-52],[28,-62],[8,-48],[58,-52]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[2,4],[4,7],[5,7],[1,6]] as [number,number][],
  },
  {
    name: 'Capricornus',
    stars: [[0,0],[42,0],[72,-20],[68,-58],[28,-62],[-8,-45]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[4,1]] as [number,number][],
  },
  {
    name: 'Aquarius',
    stars: [[0,0],[32,-18],[58,-5],[88,-22],[22,-42],[48,-62],[22,-82]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[1,4],[4,5],[5,6]] as [number,number][],
  },
  {
    name: 'Pisces',
    stars: [[0,0],[32,22],[52,5],[42,-28],[10,-35],[-22,-15],[82,-18],[102,5],[112,-28],[98,-48]] as [number,number][],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[6,7],[7,8],[8,9],[9,6]] as [number,number][],
  },
];

interface BgStar {
  rx: number; // relative x (0–1)
  ry: number; // relative y (0–1)
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

function makeBgStars(count: number): BgStar[] {
  return Array.from({ length: count }, () => ({
    rx: Math.random(),
    ry: Math.random(),
    radius: Math.random() * 1.2 + 0.2,
    opacity: Math.random() * 0.65 + 0.15,
    twinkleSpeed: Math.random() * 0.025 + 0.005,
    twinklePhase: Math.random() * Math.PI * 2,
  }));
}

// Slight radial variation per constellation so they don't all sit on one ring
const ORBIT_OFFSETS = [0, 0.06, -0.04, 0.08, -0.06, 0.04, 0, -0.08, 0.05, -0.03, 0.07, -0.05];

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const starsRef = useRef<BgStar[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    starsRef.current = makeBgStars(300);

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    onResize();
    window.addEventListener('resize', onResize);

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5),
        y: (e.clientY / window.innerHeight - 0.5),
      };
    };
    window.addEventListener('mousemove', onMouse);

    const draw = () => {
      const frame = ++frameRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Slow rotation: one full revolution ≈ 8 minutes at 60 fps
      const rotation = frame * 0.00013;
      // Constellation scale relative to viewport
      const scale = Math.min(w, h) / 820;

      ctx.clearRect(0, 0, w, h);

      // ── 1. Deep space gradient ──────────────────────────────────────────
      const bg = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, Math.max(w, h) * 0.85);
      bg.addColorStop(0, '#0c0920');
      bg.addColorStop(0.45, '#080614');
      bg.addColorStop(1, '#020208');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── 2. Galactic rift (Milky Way band) ─────────────────────────────
      drawGalacticRift(ctx, w, h, mx, my);

      // ── 3. Background star field ───────────────────────────────────────
      ctx.save();
      // Rotate the entire star field around canvas centre, with gentle parallax
      ctx.translate(cx + mx * 12, cy + my * 9);
      ctx.rotate(rotation * 0.4);
      ctx.translate(-cx, -cy);

      for (const s of starsRef.current) {
        const sx = s.rx * w;
        const sy = s.ry * h;
        const twinkle = Math.sin(frame * s.twinkleSpeed + s.twinklePhase) * 0.28 + 0.72;
        ctx.beginPath();
        ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,205,255,${(s.opacity * twinkle).toFixed(3)})`;
        ctx.fill();
      }
      ctx.restore();

      // ── 4. Zodiac constellations ───────────────────────────────────────
      const orbitRx = w * 0.36;
      const orbitRy = h * 0.30;

      for (let i = 0; i < CONSTELLATIONS.length; i++) {
        const c = CONSTELLATIONS[i];
        const baseAngle = (i / CONSTELLATIONS.length) * Math.PI * 2;
        const angle = baseAngle + rotation;
        const radiusBoost = 1 + ORBIT_OFFSETS[i];

        // Constellation centre position
        const px = cx + Math.cos(angle) * orbitRx * radiusBoost + mx * 28;
        const py = cy + Math.sin(angle) * orbitRy * radiusBoost + my * 18;

        // Fade constellations that drift near/beyond edges
        const marginX = Math.min(px, w - px) / w;
        const marginY = Math.min(py, h - py) / h;
        const fade = Math.max(0, Math.min(1, Math.min(marginX, marginY) * 7));
        if (fade < 0.02) continue;

        // ── Constellation lines
        ctx.save();
        ctx.globalAlpha = 0.22 * fade;
        ctx.lineWidth = 0.75;
        for (const [a, b] of c.lines) {
          const ax = px + c.stars[a][0] * scale;
          const ay = py + c.stars[a][1] * scale;
          const bx = px + c.stars[b][0] * scale;
          const by = py + c.stars[b][1] * scale;
          const lg = ctx.createLinearGradient(ax, ay, bx, by);
          lg.addColorStop(0, '#c9a84c');
          lg.addColorStop(1, '#7b5ea7');
          ctx.strokeStyle = lg;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
        ctx.restore();

        // ── Constellation stars
        for (const [sx, sy] of c.stars) {
          const starX = px + sx * scale;
          const starY = py + sy * scale;
          const twinkle = Math.sin(frame * 0.028 + starX * 0.009 + starY * 0.007) * 0.25 + 0.75;
          const glowR = 7 * scale;

          // Soft glow
          const glow = ctx.createRadialGradient(starX, starY, 0, starX, starY, glowR);
          glow.addColorStop(0, `rgba(201,168,76,${(0.55 * fade * twinkle).toFixed(3)})`);
          glow.addColorStop(0.5, `rgba(180,140,200,${(0.18 * fade * twinkle).toFixed(3)})`);
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath();
          ctx.arc(starX, starY, glowR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Star core
          ctx.beginPath();
          ctx.arc(starX, starY, Math.max(1.2, 1.6 * scale), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245,235,200,${(0.92 * fade * twinkle).toFixed(3)})`;
          ctx.fill();
        }

        // ── Subtle constellation label
        if (fade > 0.6 && scale > 0.7) {
          ctx.save();
          ctx.globalAlpha = 0.18 * fade;
          ctx.font = `${Math.round(10 * scale)}px Georgia, serif`;
          ctx.fillStyle = '#c9a84c';
          ctx.letterSpacing = '0.08em';
          ctx.fillText(c.name.toUpperCase(), px + 4, py + 16 * scale);
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

// ── Galactic rift helper ───────────────────────────────────────────────────
function drawGalacticRift(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mx: number,
  my: number,
) {
  const ox = mx * 10;
  const oy = my * 7;

  // Series of overlapping soft ellipses forming a diagonal Milky Way band
  const nodes = [
    { x: w * 0.05 + ox, y: h * 0.88 + oy, rx: 90,  ry: 200, a: 0.030 },
    { x: w * 0.20 + ox, y: h * 0.72 + oy, rx: 115, ry: 255, a: 0.048 },
    { x: w * 0.38 + ox, y: h * 0.54 + oy, rx: 130, ry: 285, a: 0.062 },
    { x: w * 0.55 + ox, y: h * 0.40 + oy, rx: 120, ry: 265, a: 0.055 },
    { x: w * 0.72 + ox, y: h * 0.26 + oy, rx: 105, ry: 230, a: 0.042 },
    { x: w * 0.88 + ox, y: h * 0.12 + oy, rx: 80,  ry: 180, a: 0.028 },
  ];

  for (const n of nodes) {
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(-Math.PI / 4); // 45° diagonal

    const maxR = Math.max(n.rx, n.ry);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
    grad.addColorStop(0,   `rgba(170,145,255,${(n.a * 1.6).toFixed(3)})`);
    grad.addColorStop(0.35,`rgba(110,85,200,${n.a.toFixed(3)})`);
    grad.addColorStop(0.65,`rgba(60,40,130,${(n.a * 0.45).toFixed(3)})`);
    grad.addColorStop(1,   'rgba(0,0,0,0)');

    ctx.scale(n.rx / maxR, n.ry / maxR);
    ctx.beginPath();
    ctx.arc(0, 0, maxR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
}
