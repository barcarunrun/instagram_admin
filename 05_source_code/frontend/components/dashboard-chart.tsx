export function DashboardChart({ points }: { points: Array<{ label: string; scheduled: number; executed: number }> }) {
  return (
    <div>
      <div className="chart-legend" aria-hidden="true">
        <span><span className="legend-dot" style={{ background: "#2d8cff" }} />予約数</span>
        <span><span className="legend-dot" style={{ background: "#1fc77a" }} />実行数</span>
      </div>
      <div className="chart-grid" aria-label="予約数と実行数の7日推移">
        {points.map((point) => (
          <div key={point.label} className="chart-day">
            <div className="chart-bars">
              <div className="chart-bar scheduled" style={{ height: `${point.scheduled * 14}px` }} />
              <div className="chart-bar executed" style={{ height: `${point.executed * 14}px` }} />
            </div>
            <div className="chart-label">{point.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}