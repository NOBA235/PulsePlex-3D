import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

interface ECGMonitorProps {
  bpm?: number;
  isBeating?: boolean;
  hasStDepression?: boolean;
  hasStElevation?: boolean;
}

export const ECGMonitor: React.FC<ECGMonitorProps> = ({
  bpm = 75,
  isBeating = true,
  hasStDepression = false,
  hasStElevation = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const xRef = useRef<number>(0);
  const dataPointsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Buffer of points to draw
    const bufferSize = width;
    if (dataPointsRef.current.length !== bufferSize) {
      dataPointsRef.current = new Array(bufferSize).fill(midY);
    }

    let phase = 0;
    // Calculate cycle length based on BPM (e.g. 75 bpm at 60fps)
    const cycleLength = Math.max(25, Math.round((60 / Math.max(40, bpm)) * 60));

    const render = () => {
      if (!isBeating) {
        // Paused line
        ctx.fillStyle = 'rgba(10, 15, 29, 0.2)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
        animRef.current = requestAnimationFrame(render);
        return;
      }

      // Calculate ECG amplitude for current phase
      const cyclePos = phase % cycleLength;
      const t = cyclePos / cycleLength; // 0 to 1
      let yOffset = 0;

      // P wave (0.10 - 0.22)
      if (t >= 0.10 && t < 0.22) {
        const pt = (t - 0.10) / 0.12;
        yOffset = -Math.sin(pt * Math.PI) * 7;
      }
      // PR segment (0.22 - 0.30)
      else if (t >= 0.22 && t < 0.30) {
        yOffset = 0;
      }
      // Q wave (0.30 - 0.33)
      else if (t >= 0.30 && t < 0.33) {
        const qt = (t - 0.30) / 0.03;
        yOffset = Math.sin(qt * Math.PI) * 5; // downward
      }
      // R peak (0.33 - 0.38)
      else if (t >= 0.33 && t < 0.38) {
        const rt = (t - 0.33) / 0.05;
        yOffset = -Math.sin(rt * Math.PI) * 28; // high upward spike
      }
      // S wave (0.38 - 0.42)
      else if (t >= 0.38 && t < 0.42) {
        const st = (t - 0.38) / 0.04;
        yOffset = Math.sin(st * Math.PI) * 10; // downward
      }
      // ST segment (0.42 - 0.54)
      else if (t >= 0.42 && t < 0.54) {
        if (hasStDepression) {
          yOffset = 4.5; // ST depression
        } else if (hasStElevation) {
          yOffset = -6; // ST elevation
        } else {
          yOffset = 0;
        }
      }
      // T wave (0.54 - 0.74)
      else if (t >= 0.54 && t < 0.74) {
        const tt = (t - 0.54) / 0.20;
        yOffset = -Math.sin(tt * Math.PI) * (hasStDepression ? 4 : 11);
      } else {
        yOffset = 0;
      }

      // Add slight biological variability noise
      yOffset += (Math.random() - 0.5) * 0.8;

      const currentY = midY + yOffset;
      const curX = xRef.current;

      dataPointsRef.current[curX] = currentY;

      // Draw onto canvas
      ctx.fillStyle = 'rgba(7, 11, 20, 0.12)';
      ctx.fillRect(0, 0, width, height);

      // Draw faint ECG grid
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.15)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw ECG trace
      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.8;
      ctx.beginPath();

      const sweepWidth = 10;
      for (let i = 0; i < width; i++) {
        // Skip current cursor wipe window
        if (Math.abs(i - curX) < sweepWidth && (curX > sweepWidth && curX < width - sweepWidth)) {
          continue;
        }
        const yVal = dataPointsRef.current[i];
        if (i === 0) ctx.moveTo(i, yVal);
        else ctx.lineTo(i, yVal);
      }
      ctx.stroke();

      // Lead cursor sweep dot
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(curX, currentY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      xRef.current = (xRef.current + 2) % width;
      phase += 1;

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [bpm, isBeating, hasStDepression, hasStElevation]);

  return (
    <div className="flex items-center space-x-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
      <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono font-semibold">
        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>Lead II:</span>
        <span className="text-white font-bold">{bpm}</span>
        <span className="text-[10px] text-slate-400">BPM</span>
      </div>

      <div className="relative w-40 h-10 overflow-hidden rounded border border-emerald-950 bg-[#060a12]">
        <canvas ref={canvasRef} width={160} height={40} className="w-full h-full block" />
      </div>

      {hasStDepression && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
          ST Depr
        </span>
      )}
      {hasStElevation && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500">
          STEMI
        </span>
      )}
    </div>
  );
};

