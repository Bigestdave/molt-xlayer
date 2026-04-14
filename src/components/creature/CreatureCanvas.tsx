import { useRef, useEffect, useCallback } from 'react';
import type { PersonalityType } from '../../lib/personalities';
import type { CreatureState } from '../../store/appStore';

interface CreatureCanvasProps {
  personality: PersonalityType;
  accent: string;
  accentRgb: string;
  energyLevel: number;
  creatureState: CreatureState;
  size?: number;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
}

const PERSONALITY_SPEEDS: Record<PersonalityType, number> = {
  steward: 1.5,
  hunter: 3.5,
  sentinel: 2.0,
};

export default function CreatureCanvas({
  personality,
  accent,
  accentRgb,
  energyLevel,
  creatureState,
  size = 300,
}: CreatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const blinkRef = useRef({ nextBlink: 3000, blinking: false, blinkT: 0 });
  const hunterLungeRef = useRef({ active: false, t: 0, cooldown: 0 });
  const sentinelScanRef = useRef({ active: false, radius: 0, opacity: 0, cooldown: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const breathRef = useRef(0);

  useEffect(() => {
    if (creatureState === 'evolved') {
      particlesRef.current = Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,
        radius: 90,
        speed: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4,
      }));
    }
  }, [creatureState]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, dt: number) => {
    const cx = size / 2;
    const cy = size / 2;
    const dpr = window.devicePixelRatio || 1;
    const speed = PERSONALITY_SPEEDS[personality];

    ctx.clearRect(0, 0, size * dpr, size * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    timeRef.current += dt * 0.001;
    const t = timeRef.current;

    let baseR = creatureState === 'evolved' ? 65 : 55;
    const amplitude = 8 + energyLevel * 6;
    const frequency = 5;

    if (personality === 'steward') {
      breathRef.current += dt * 0.001;
      const breathScale = 1.0 + Math.sin(breathRef.current * (Math.PI / 2)) * 0.04;
      baseR *= breathScale;
    }

    if (personality === 'hunter') {
      hunterLungeRef.current.cooldown -= dt;
      if (!hunterLungeRef.current.active && hunterLungeRef.current.cooldown <= 0 && energyLevel > 0.6) {
        if (Math.random() < 0.002) {
          hunterLungeRef.current.active = true;
          hunterLungeRef.current.t = 0;
        }
      }
      if (hunterLungeRef.current.active) {
        hunterLungeRef.current.t += dt;
        const lt = hunterLungeRef.current.t / 300;
        if (lt < 1) {
          const lunge = Math.sin(lt * Math.PI) * 8;
          baseR += lunge;
        } else {
          hunterLungeRef.current.active = false;
          hunterLungeRef.current.cooldown = 3000;
        }
      }
    }

    const numPoints = 60;
    const bodyPoints: [number, number][] = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const wobble = Math.sin(angle * frequency + t * speed) * amplitude;
      const wobble2 = Math.sin(angle * 3 + t * speed * 0.7) * (amplitude * 0.3);
      const twitch = personality === 'hunter' ? Math.sin(angle * 11 + t * 8) * 1.5 : 0;
      const r = baseR + wobble + wobble2 + twitch;
      bodyPoints.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }

    ctx.beginPath();
    ctx.moveTo(bodyPoints[0][0], bodyPoints[0][1]);
    for (let i = 0; i < bodyPoints.length; i++) {
      const next = bodyPoints[(i + 1) % bodyPoints.length];
      const curr = bodyPoints[i];
      const cpx = (curr[0] + next[0]) / 2;
      const cpy = (curr[1] + next[1]) / 2;
      ctx.quadraticCurveTo(curr[0], curr[1], cpx, cpy);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR + amplitude);
    grad.addColorStop(0, `rgba(${accentRgb}, 0.35)`);
    grad.addColorStop(0.5, `rgba(${accentRgb}, 0.18)`);
    grad.addColorStop(1, `rgba(${accentRgb}, 0.08)`);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `rgba(${accentRgb}, 0.7)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (energyLevel > 0.5) {
      const glowPulse = 0.5 + Math.sin(t * 2) * 0.3;
      const innerGrad = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy, baseR * 0.6);
      innerGrad.addColorStop(0, `rgba(${accentRgb}, ${0.15 * glowPulse * energyLevel})`);
      innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    const eyeY = cy - 8;
    const eyeSpacing = 18;
    const eyeRadius = 5;

    blinkRef.current.nextBlink -= dt;
    if (blinkRef.current.nextBlink <= 0 && !blinkRef.current.blinking) {
      blinkRef.current.blinking = true;
      blinkRef.current.blinkT = 0;
    }
    let eyeScaleY = 1;
    if (blinkRef.current.blinking) {
      blinkRef.current.blinkT += dt;
      const bt = blinkRef.current.blinkT;
      if (bt < 75) eyeScaleY = 1 - (bt / 75) * 0.95;
      else if (bt < 150) eyeScaleY = 0.05 + ((bt - 75) / 75) * 0.95;
      else {
        blinkRef.current.blinking = false;
        blinkRef.current.nextBlink = 4000 + Math.random() * 2000;
        eyeScaleY = 1;
      }
    }

    const lookX = Math.sin(t * 0.5) * 2;
    const lookY = Math.cos(t * 0.3) * 1;

    for (const xOff of [-eyeSpacing, eyeSpacing]) {
      const ex = cx + xOff;
      ctx.save();
      ctx.translate(ex, eyeY);
      ctx.scale(1, eyeScaleY);
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentRgb}, 0.9)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX, lookY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.restore();
    }

    if (energyLevel < 0.3) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#0a0a0f';
      ctx.beginPath();
      ctx.arc(cx, cy, baseR + amplitude + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (creatureState === 'thriving' || creatureState === 'evolved') {
      const ringR = baseR + amplitude + 15;
      const arcLen = energyLevel * Math.PI * 2;
      const ringRotation = t * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, ringRotation, ringRotation + arcLen);
      ctx.strokeStyle = `rgba(${accentRgb}, 0.4)`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    if (creatureState === 'evolved' && particlesRef.current.length > 0) {
      particlesRef.current.forEach(p => {
        p.angle += p.speed * dt * 0.001;
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;
        const twinkle = 0.5 + Math.sin(t * 3 + p.angle * 2) * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, p.size * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRgb}, ${p.opacity * twinkle})`;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px - p.size * 2 * twinkle, py);
        ctx.lineTo(px + p.size * 2 * twinkle, py);
        ctx.moveTo(px, py - p.size * 2 * twinkle);
        ctx.lineTo(px, py + p.size * 2 * twinkle);
        ctx.strokeStyle = `rgba(${accentRgb}, ${p.opacity * twinkle * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    }

    if (personality === 'sentinel') {
      sentinelScanRef.current.cooldown -= dt;
      if (!sentinelScanRef.current.active && sentinelScanRef.current.cooldown <= 0) {
        if (Math.random() < 0.001) {
          sentinelScanRef.current.active = true;
          sentinelScanRef.current.radius = 0;
          sentinelScanRef.current.opacity = 0.5;
        }
      }
      if (sentinelScanRef.current.active) {
        sentinelScanRef.current.radius += dt * 0.08;
        sentinelScanRef.current.opacity -= dt * 0.0003;
        if (sentinelScanRef.current.opacity <= 0) {
          sentinelScanRef.current.active = false;
          sentinelScanRef.current.cooldown = 8000;
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, sentinelScanRef.current.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${accentRgb}, ${sentinelScanRef.current.opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    const ambientGrad = ctx.createRadialGradient(cx, cy + baseR * 0.8, 0, cx, cy + baseR * 0.8, baseR * 1.5);
    ambientGrad.addColorStop(0, `rgba(${accentRgb}, ${0.06 * energyLevel})`);
    ambientGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + baseR * 0.8, baseR * 1.5, baseR * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [personality, accent, accentRgb, energyLevel, creatureState, size]);

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
