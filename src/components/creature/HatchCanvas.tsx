import { useRef, useEffect, useCallback } from 'react';

interface HatchCanvasProps {
  accent: string;
  accentRgb: string;
  progress: number;
  size?: number;
  hatched: boolean;
}

export default function HatchCanvas({ accent, accentRgb, progress, size = 350, hatched }: HatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const cracksRef = useRef<{ x1: number; y1: number; x2: number; y2: number; born: number }[]>([]);
  const shatterRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; rot: number; opacity: number }[]>([]);

  useEffect(() => {
    const numCracks = Math.floor(progress * 8);
    while (cracksRef.current.length < numCracks) {
      const angle = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 20;
      const len = 15 + Math.random() * 25;
      cracksRef.current.push({
        x1: Math.cos(angle) * r,
        y1: Math.sin(angle) * (r * 0.7),
        x2: Math.cos(angle) * (r + len) + (Math.random() - 0.5) * 15,
        y2: Math.sin(angle) * ((r + len) * 0.7) + (Math.random() - 0.5) * 10,
        born: Date.now(),
      });
    }
  }, [progress]);

  useEffect(() => {
    if (hatched && shatterRef.current.length === 0) {
      shatterRef.current = Array.from({ length: 30 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        return {
          x: (Math.random() - 0.5) * 40,
          y: (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          r: 3 + Math.random() * 8,
          rot: Math.random() * Math.PI * 2,
          opacity: 1,
        };
      });
    }
  }, [hatched]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, dt: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, size * dpr, size * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);
    timeRef.current += dt * 0.001;
    const t = timeRef.current;

    if (!hatched) {
      const pulseScale = 1 + Math.sin(t * 2) * 0.02 * (1 + progress);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulseScale, pulseScale);
      const eggW = 55;
      const eggH = 70;

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, eggH * 1.5);
      glow.addColorStop(0, `rgba(${accentRgb}, ${0.1 + progress * 0.15})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, eggH * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, eggW, eggH, 0, 0, Math.PI * 2);
      const eggGrad = ctx.createRadialGradient(-10, -15, 0, 0, 0, eggH);
      eggGrad.addColorStop(0, `rgba(${accentRgb}, 0.3)`);
      eggGrad.addColorStop(0.5, `rgba(${accentRgb}, 0.15)`);
      eggGrad.addColorStop(1, `rgba(${accentRgb}, 0.06)`);
      ctx.fillStyle = eggGrad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${accentRgb}, 0.6)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-15, -20, 8, 16, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentRgb}, 0.12)`;
      ctx.fill();

      cracksRef.current.forEach(crack => {
        const age = (Date.now() - crack.born) / 300;
        const crackProgress = Math.min(age, 1);
        ctx.beginPath();
        ctx.moveTo(crack.x1, crack.y1);
        ctx.lineTo(
          crack.x1 + (crack.x2 - crack.x1) * crackProgress,
          crack.y1 + (crack.y2 - crack.y1) * crackProgress
        );
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (crackProgress > 0.5) {
          const mx = (crack.x1 + crack.x2) / 2;
          const my = (crack.y1 + crack.y2) / 2;
          const crackGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 12);
          crackGlow.addColorStop(0, `rgba(${accentRgb}, ${0.15 * crackProgress})`);
          crackGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = crackGlow;
          ctx.beginPath();
          ctx.arc(mx, my, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (progress > 0.6) {
        const wobble = Math.sin(t * 12) * progress * 3;
        ctx.translate(wobble, 0);
      }
      ctx.restore();
    } else {
      shatterRef.current.forEach(p => {
        p.x += p.vx * dt * 0.05;
        p.y += p.vy * dt * 0.05;
        p.vy += 0.1 * dt * 0.05;
        p.rot += 0.02 * dt * 0.05;
        p.opacity -= 0.001 * dt;
        if (p.opacity > 0) {
          ctx.save();
          ctx.translate(cx + p.x, cy + p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.beginPath();
          ctx.moveTo(-p.r, -p.r * 0.5);
          ctx.lineTo(p.r * 0.5, -p.r);
          ctx.lineTo(p.r, p.r * 0.5);
          ctx.closePath();
          ctx.fillStyle = `rgba(${accentRgb}, 0.4)`;
          ctx.fill();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.restore();
        }
      });
    }
    ctx.restore();
  }, [accent, accentRgb, progress, hatched, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d')!;
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      draw(ctx, dt);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="block mx-auto" />;
}
