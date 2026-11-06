'use client';

import { useEffect, useRef, useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';

const MIN_STROKES = 12;

// Mission 137 — signer au doigt, sur la tablette ou le téléphone du conseiller (signature
// électronique simple, décision de Jean-Guy, 06/11) ; à la souris sur un ordinateur. Le tracé
// devient une image PNG (`toDataURL`), relue au serveur par ses octets.
export function SignaturePad({
  label,
  onChange,
  testId,
}: {
  label: string;
  onChange: (dataUrl: string | null) => void;
  testId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  // Une signature est un tracé : une simple touche ne signe pas.
  const strokes = useRef(0);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111827';
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 stage:text-white/80">{label}</span>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        data-testid={testId}
        aria-label={label}
        className="h-36 w-full max-w-xl touch-none rounded-xl border-2 border-dashed border-zinc-300 bg-white"
        onPointerDown={(event) => {
          const context = canvasRef.current?.getContext('2d');
          if (!context) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = true;
          const { x, y } = point(event);
          context.beginPath();
          context.moveTo(x, y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = canvasRef.current?.getContext('2d');
          if (!context) return;
          const { x, y } = point(event);
          context.lineTo(x, y);
          context.stroke();
          strokes.current += 1;
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          if (strokes.current < MIN_STROKES) return;
          setSigned(true);
          onChange(canvasRef.current?.toDataURL('image/png') ?? null);
        }}
      />
      {signed ? (
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          onClick={() => {
            const canvas = canvasRef.current;
            canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
            strokes.current = 0;
            setSigned(false);
            onChange(null);
          }}
        >
          Effacer et signer de nouveau
        </button>
      ) : null}
    </div>
  );
}
