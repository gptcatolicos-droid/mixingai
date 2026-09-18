export interface CoherenceTrack {
  id: string;
  name: string;
  lufs: number;
  outOfRange: boolean;
}

interface AlbumCoherenceChartProps {
  tracks: CoherenceTrack[];
  /** Target band, e.g. [-15, -13] for a -14 LUFS balanced target. */
  targetBand: [number, number];
}

const IN_RANGE_COLOR = '#c67af0'; // brand violet — the album's normal/expected state
const OUT_OF_RANGE_COLOR = '#f7c85c'; // same amber used by .master-status.warning elsewhere

/**
 * LUFS-per-song bar chart with the target loudness band shaded behind it.
 * Whether a bar sits inside the band is legible from its height relative to
 * the band alone — color is a secondary, redundant cue, not the only signal
 * (an out-of-range bar also gets a ⚠ marker), per the dataviz status-color rule.
 */
export default function AlbumCoherenceChart({ tracks, targetBand }: AlbumCoherenceChartProps) {
  if (!tracks.length) return null;

  const width = 720;
  const height = 200;
  const paddingTop = 28;
  const paddingBottom = 34;
  const paddingX = 8;
  const plotHeight = height - paddingTop - paddingBottom;

  const values = tracks.map((track) => track.lufs);
  const [bandLow, bandHigh] = targetBand;
  const domainMin = Math.min(bandLow - 2, ...values) - 1.5;
  const domainMax = Math.max(bandHigh + 2, ...values) + 1.5;
  const domainSpan = Math.max(1, domainMax - domainMin);

  const yFor = (lufs: number) => paddingTop + (1 - (lufs - domainMin) / domainSpan) * plotHeight;
  const baselineY = paddingTop + plotHeight;

  const slot = (width - paddingX * 2) / tracks.length;
  const barWidth = Math.min(24, slot * 0.5);

  const bandY = yFor(bandHigh);
  const bandHeight = yFor(bandLow) - yFor(bandHigh);

  return (
    <figure className="album-coherence-chart" role="group" aria-label="Balance de LUFS entre canciones del álbum">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
        {/* The numeric range is already in the panel's caption above the chart
            (AlbumMasteringPage renders it in .album-coherence-head) — repeating
            it here as SVG text would risk colliding with whichever bar happens
            to be tallest, so the shaded band alone carries it in the chart. */}
        <rect x={paddingX} y={bandY} width={width - paddingX * 2} height={Math.max(1, bandHeight)} fill="rgba(198,122,240,0.12)" stroke="rgba(198,122,240,0.28)" strokeDasharray="3 3" />

        <line x1={paddingX} y1={baselineY} x2={width - paddingX} y2={baselineY} stroke="rgba(255,255,255,.12)" strokeWidth={1} />

        {tracks.map((track, index) => {
          const barX = paddingX + slot * index + (slot - barWidth) / 2;
          const barTop = yFor(track.lufs);
          const barHeight = Math.max(2, baselineY - barTop);
          const color = track.outOfRange ? OUT_OF_RANGE_COLOR : IN_RANGE_COLOR;
          return (
            <g key={track.id}>
              <rect x={barX} y={barTop} width={barWidth} height={barHeight} rx={4} fill={color} opacity={0.92} />
              <text x={barX + barWidth / 2} y={barTop - 8} textAnchor="middle" fontSize="10" fontWeight={700} fill="#d5cbdc">
                {track.lufs.toFixed(1)}
              </text>
              {track.outOfRange && (
                <text x={barX + barWidth / 2} y={barTop - 20} textAnchor="middle" fontSize="10" fill="#f7c85c">⚠</text>
              )}
              <text
                x={barX + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="9"
                fill="#7d7586"
              >
                {track.name.length > 12 ? `${track.name.slice(0, 11)}…` : track.name}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
