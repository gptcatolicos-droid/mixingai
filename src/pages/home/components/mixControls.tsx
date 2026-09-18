import { useCallback, useEffect, useRef } from 'react';

/**
 * Rotary knob — drag vertically to change value, matching the mockup's dial
 * controls (Presencia/Compresión/Reverb/Panorama). Reused by the Mixer's
 * per-stem panel today; Mastering can reuse it later for the same look.
 */
export function Knob({
  value, min, max, onChange, label, valueLabel, color = '#EF4AA8', size = 52,
}: {
  value: number; min: number; max: number; onChange: (v: number) => void;
  label: string; valueLabel: string; color?: string; size?: number;
}) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // 270° sweep, starting at -135° (bottom-left) through 135° (bottom-right).
  const angle = -135 + pct * 270;
  const radius = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  const arcEnd = {
    x: cx + radius * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((angle - 90) * Math.PI / 180),
  };
  const largeArc = pct * 270 > 180 ? 1 : 0;
  const arcStart = {
    x: cx + radius * Math.cos((-135 - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((-135 - 90) * Math.PI / 180),
  };

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    dragging.current = true;
    startY.current = event.clientY;
    startValue.current = value;
    (event.target as Element).setPointerCapture(event.pointerId);
  }, [value]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - event.clientY) / 120; // 120px drag = full range
      const next = Math.max(min, Math.min(max, startValue.current + delta * (max - min)));
      onChangeRef.current(next);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [min, max]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
      <svg width={size} height={size} onPointerDown={onPointerDown} style={{ cursor: 'ns-resize', touchAction: 'none' }}>
        <path d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 1 1 ${cx + radius * Math.cos((135 - 90) * Math.PI / 180)} ${cy + radius * Math.sin((135 - 90) * Math.PI / 180)}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} strokeLinecap="round" />
        <path d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={radius - 9} fill="var(--panel-2)" stroke="var(--border-strong)" />
        <line x1={cx} y1={cy} x2={cx + (radius - 12) * Math.cos((angle - 90) * Math.PI / 180)} y2={cy + (radius - 12) * Math.sin((angle - 90) * Math.PI / 180)} stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>{valueLabel}</div>
      </div>
    </div>
  );
}

export interface EQBandValue { id: 'low' | 'mid' | 'high'; freqLabel: string; value: number; }

/**
 * Draggable 3-point EQ curve (low-shelf / mid-peak / high-shelf), matching
 * the mockup's "EQ paramétrica" panel. Real ±12dB range, same as the actual
 * BiquadFilterNodes it drives — nothing here is decorative.
 */
export function EQCurve({ bands, onChange, color = '#EF4AA8', readOnly = false }: { bands: EQBandValue[]; onChange?: (id: EQBandValue['id'], value: number) => void; color?: string; readOnly?: boolean }) {
  const width = 640, height = 160, midY = height / 2;
  const dbToY = (db: number) => midY - (db / 12) * (midY - 14);
  const xFor = (index: number) => 40 + (index / (bands.length - 1)) * (width - 80);

  const dragging = useRef<EQBandValue['id'] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const applyFromClientY = useCallback((clientY: number, id: EQBandValue['id']) => {
    if (readOnly || !onChange) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaledY = ((clientY - rect.top) / rect.height) * height;
    const db = Math.max(-12, Math.min(12, -((scaledY - midY) / (midY - 14)) * 12));
    onChange(id, Math.round(db * 10) / 10);
  }, [readOnly, onChange]);

  useEffect(() => {
    if (readOnly) return;
    const onMove = (event: PointerEvent) => { if (dragging.current) applyFromClientY(event.clientY, dragging.current); };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [applyFromClientY, readOnly]);

  const points = bands.map((band, index) => `${xFor(index)},${dbToY(band.value)}`).join(' ');

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ touchAction: 'none' }}>
      <line x1={40} y1={midY} x2={width - 40} y2={midY} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
      {bands.map((band, index) => (
        <g key={band.id} onPointerDown={readOnly ? undefined : (e) => { dragging.current = band.id; (e.target as Element).setPointerCapture(e.pointerId); }} style={{ cursor: readOnly ? 'default' : 'ns-resize' }}>
          <circle cx={xFor(index)} cy={dbToY(band.value)} r={9} fill={color} stroke="#fff" strokeWidth={1.5} />
          <text x={xFor(index)} y={height - 4} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{band.freqLabel}</text>
          <text x={xFor(index)} y={dbToY(band.value) - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-primary)">{band.value > 0 ? '+' : ''}{band.value.toFixed(1)}</text>
        </g>
      ))}
    </svg>
  );
}
