'use client';

import { useEffect, useRef } from 'react';

const SPACING = 32; // px between dots
const INFLUENCE = 120; // px radius the cursor pushes dots within
const MAX_PUSH = 10; // px a dot can be displaced at the cursor's center
const EASE = 0.15; // how fast a dot chases its target each frame
const RADIUS = 1.2; // dot size, px

interface Dot {
  hx: number;
  hy: number; // home position
  x: number;
  y: number; // current (animated) position
}

/** Global cursor-reactive dot-grid background, mounted once in the root
 * layout so it sits behind every page. Plain Canvas + rAF — no animation
 * library needed for a single full-viewport effect like this. Respects
 * prefers-reduced-motion with a static, non-reactive grid instead of
 * disabling it outright (apple-design skill: gentler, not absent). */
export function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    let dots: Dot[] = [];
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;

    function layout() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const hx = i * SPACING;
          const hy = j * SPACING;
          dots.push({ hx, hy, x: hx, y: hy });
        }
      }
    }

    function render() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx!.fillStyle = darkQuery.matches ? 'rgba(148, 166, 168, 0.35)' : 'rgba(46, 57, 68, 0.2)';
      for (const d of dots) {
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, RADIUS, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function tick() {
      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        let tx = d.hx;
        let ty = d.hy;
        if (dist < INFLUENCE) {
          const force = (1 - dist / INFLUENCE) * MAX_PUSH;
          const angle = Math.atan2(dy, dx);
          tx = d.hx + Math.cos(angle) * force;
          ty = d.hy + Math.sin(angle) * force;
        }
        d.x += (tx - d.x) * EASE;
        d.y += (ty - d.y) * EASE;
      }
      render();
      raf = requestAnimationFrame(tick);
    }

    function onResize() {
      layout();
      if (reduceMotion) render();
    }
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    layout();
    if (reduceMotion) {
      render();
    } else {
      tick();
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
