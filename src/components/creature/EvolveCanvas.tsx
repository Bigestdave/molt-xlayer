import { useRef, useEffect, useCallback } from 'react';

interface EvolveCanvasProps {
  accent: string;
  accentRgb: string;
  phase: 'spin' | 'burst' | 'emerge';
  size?: number;
}

interface EvolveParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  burstVx: number;
  burstVy: number;
}

export default function EvolveCanvas({ accent, accentRgb, phase, size = 400 }: EvolveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<EvolveParticle[]>([]);

  useEffect(() => {
    particlesRef.current = Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      return {
        angle, radius: 40 + Math.random() * 20, speed: 1 + Math.random() * 2,
        size: 2 + Math.random() * 3, opacity: 0.8,
        burstVx: Math.cos(angle) * (3 + Math.random() * 5),
        burstVy: Math.sin(angle) * (3 + Math.random() * 5),
      };
    });
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, dt: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, size * dpr, size * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);
    timeRef.current += dt * 0.001;
    const t = timeRef.current;

    if (phase === 'spin') {
      const spinSpeed = t * 4;
      const numPoints = 40;
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2 + spinSpeed;
        const wobble = Math.sin(angle * 5 + t * 3) * 10;
        const r = 50 + wobble;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      grad.addColorStop(0, `rgba(${accentRgb}, 0.35)`);
      grad.addColorStop(1, `rgba(${accentRgb}, 0.08)`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${accentRgb}, 0.6)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      particlesRef.current.forEach(p => {
        p.angle += p.speed * dt * 0.003;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRgb}, ${p.opacity * (0.5 + Math.sin(t * 3) * 0.5)})`;
        ctx.fill();
      });
    } else if (phase === 'burst') {
      particlesRef.current.forEach(p => {
        p.radius += 3;
        p.opacity -= 0.01;
        const px = cx + Math.cos(p.angle) * p.radius + p.burstVx * t * 5;
        const py = cy + Math.sin(p.angle) * p.radius + p.burstVy * t * 5;
        if (p.opacity > 0) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accentRgb}, ${Math.max(0, p.opacity)})`;
          ctx.fill();
        }
      });
      const flash = Math.max(0, 1 - t * 0.5);
      const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
      flashGrad.addColorStop(0, `rgba(${accentRgb}, ${flash * 0.5})`);
      flashGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI * 2);
      ctx.fill();
    } else if (phase === 'emerge') {
      const formProgress = Math.min(t * 0.5, 1);
      const baseR = 65 * formProgress;
      const numPts = 60;
      ctx.beginPath();
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const wobble = Math.sin(angle * 5 + t * 2) * (8 + formProgress * 6);
        const r = baseR + wobble;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR + 20);
      grad.addColorStop(0, `rgba(${accentRgb}, ${0.35 * formProgress})`);
      grad.addColorStop(1, `rgba(${accentRgb}, ${0.08 * formProgress})`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${accentRgb}, ${0.7 * formProgress})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (formProgress > 0.5) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + t * 0.5;
          const sparkR = 90;
          const sx = cx + Math.cos(angle) * sparkR;
          const sy = cy + Math.sin(angle) * sparkR;
          const sparkle = 0.5 + Math.sin(t * 4 + i) * 0.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 3 * sparkle, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accentRgb}, ${sparkle * formProgress * 0.8})`;
          ctx.fill();
        }
      }
      if (formProgress > 0.7) {
        const ep = (formProgress - 0.7) / 0.3;
        for (const xOff of [-18, 18]) {
          ctx.beginPath();
          ctx.arc(cx + xOff, cy - 8, 5 * ep, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accentRgb}, ${0.9 * ep})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + xOff, cy - 8, 2.5 * ep, 0, Math.PI * 2);
          ctx.fillStyle = accent;
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }, [accent, accentRgb, phase, size]);

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
    timeRef.current = 0;
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
