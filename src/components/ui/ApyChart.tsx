import { useRef, useEffect, useState } from 'react';

interface ApyChartProps {
  data: { timestamp: number; apy: number }[];
  accentRgb: string;
  height?: number;
}

export default function ApyChart({ data, accentRgb, height = 180 }: ApyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const ob = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    if (containerRef.current) {
      ob.observe(containerRef.current);
      setWidth(containerRef.current.getBoundingClientRect().width);
    }
    return () => ob.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || data.length === 0) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const valid = data.filter(d => typeof d.apy === 'number' && !isNaN(d.apy));
    if (valid.length === 0) return;
    const chartData = valid.length === 1
      ? [{ ...valid[0], timestamp: valid[0].timestamp - 1000 }, valid[0]]
      : valid;

    const minApy = Math.min(...chartData.map(d => d.apy));
    const maxApy = Math.max(...chartData.map(d => d.apy));
    const range = maxApy - minApy || 1;
    const yMin = Math.max(0, minApy - range * 0.2);
    const yMax = maxApy + range * 0.2;
    const yRange = yMax - yMin;
    const chartH = height - 20;
    const minTime = chartData[0].timestamp;
    const maxTime = chartData[chartData.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    const pts = chartData.map(d => ({
      x: ((d.timestamp - minTime) / timeRange) * width,
      y: ((yMax - d.apy) / yRange) * chartH,
    }));

    // Area fill — 5% opacity gradient
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[pts.length - 1].x, height);
    ctx.lineTo(pts[0].x, height);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
    fillGrad.addColorStop(0, `rgba(${accentRgb}, 0.05)`);
    fillGrad.addColorStop(1, `rgba(${accentRgb}, 0.0)`);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Glow stroke (shadow under the line)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.shadowColor = `rgba(${accentRgb}, 0.6)`;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = `rgba(${accentRgb}, 0.9)`;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Sharp stroke on top
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
    strokeGrad.addColorStop(0, `rgba(${accentRgb}, 0.2)`);
    strokeGrad.addColorStop(0.4, `rgba(${accentRgb}, 0.85)`);
    strokeGrad.addColorStop(1, `rgba(${accentRgb}, 1)`);
    ctx.strokeStyle = strokeGrad;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // End dot with glow
    const last = pts[pts.length - 1];
    ctx.save();
    ctx.shadowColor = `rgba(${accentRgb}, 0.5)`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${accentRgb})`;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accentRgb}, 0.15)`;
    ctx.fill();
  }, [data, accentRgb, width, height]);

  return (
    <div ref={containerRef} className="w-full relative" style={{ height }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
