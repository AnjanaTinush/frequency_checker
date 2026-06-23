import { useMemo } from "react";

export default function Rsi({
  history,
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isDarkMode,
}) {
  // Convert history array to coordinate points for the SVG
  const graphData = useMemo(() => {
    if (!history || history.length === 0) return { linePath: "", points: [], gridLinesY: [], gridLinesX: [] };

    const width = 800;
    const height = 360;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 50;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const yMin = -75;
    const yMax = 0;
    const yRange = yMax - yMin;

    // Map history points
    const points = history.map((item, index) => {
      const x = paddingLeft + (index / (history.length - 1 || 1)) * plotWidth;
      const ratio = (item.rssi - yMin) / yRange;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { x, y, val: item.rssi, time: item.time };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    // Generate Y grid values and positions
    const gridYValues = [-70, -60, -50, -40, -30, -20, -10, 0];
    const gridLinesY = gridYValues.map((val) => {
      const ratio = (val - yMin) / yRange;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { y, label: val.toString() };
    });

    // Generate X grid values and positions (e.g. 5 intervals)
    const gridLinesX = [];
    const interval = Math.max(1, Math.floor(points.length / 5));
    for (let i = 0; i < points.length; i += interval) {
      if (points[i]) {
        gridLinesX.push({
          x: points[i].x,
          label: points[i].time,
        });
      }
    }
    // Make sure we include the last point's time
    if (points.length > 0 && (points.length - 1) % interval !== 0) {
      gridLinesX.push({
        x: points[points.length - 1].x,
        label: points[points.length - 1].time,
      });
    }

    return { linePath, points, gridLinesY, gridLinesX, plotWidth, plotHeight, paddingTop, paddingLeft };
  }, [history]);

  // Theme-specific colors for SVG elements
  const chartBg = isDarkMode ? "#020617" : "#f8fafc";
  const gridColor = isDarkMode ? "#1e293b" : "#cbd5e1";
  const axisBorderColor = isDarkMode ? "#334155" : "#94a3b8";
  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const axisLabelColor = isDarkMode ? "#e2e8f0" : "#475569";
  const lineColor = isDarkMode ? "#38bdf8" : "#2563eb"; // Sky blue vs Royal blue

  return (
    <div className="flex-1 w-full px-4 md:px-8 py-6 flex flex-col gap-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">RSSI Analysis</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-455 mt-1">
          Received Signal Strength Indicator (RSSI) over time
        </p>
      </div>

      {/* Main Graph Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col transition-colors">
        
        {/* Title corresponding to user's second image */}
        <h3 className="text-sm font-semibold text-slate-650 dark:text-slate-350 text-center mb-4">
          Received Signal Strength Indicator (RSSI) Over Time
        </h3>

        {/* SVG Chart Container */}
        <div 
          className="relative w-full aspect-[2.2/1] min-h-[260px] rounded-xl border p-2 overflow-hidden transition-colors duration-200"
          style={{ backgroundColor: chartBg, borderColor: isDarkMode ? "#1e293b" : "#e2e8f0" }}
        >
          <svg
            viewBox="0 0 800 360"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid lines */}
            {graphData.gridLinesY.map((line, i) => (
              <g key={`y-${i}`}>
                <line
                  x1="60"
                  y1={line.y}
                  x2="770"
                  y2={line.y}
                  stroke={gridColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x="50"
                  y={line.y + 4}
                  textAnchor="end"
                  fill={textColor}
                  className="text-[10px] font-mono"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Vertical Grid lines */}
            {graphData.gridLinesX.map((line, i) => (
              <g key={`x-${i}`}>
                <line
                  x1={line.x}
                  y1="40"
                  x2={line.x}
                  y2="310"
                  stroke={gridColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x={line.x}
                  y="330"
                  textAnchor="middle"
                  fill={textColor}
                  className="text-[9px] font-mono"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Y Axis Label */}
            <text
              transform="rotate(-90 20 175)"
              x="20"
              y="175"
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-bold"
            >
              RSSI Value
            </text>

            {/* X Axis Label */}
            <text
              x="415"
              y="350"
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-bold"
            >
              Time
            </text>

            {/* Border lines */}
            <rect
              x="60"
              y="40"
              width={graphData.plotWidth || 710}
              height={graphData.plotHeight || 270}
              fill="none"
              stroke={axisBorderColor}
              strokeWidth="1"
            />

            {/* Plotted RSSI Path (Blue/Sky-blue Curve) */}
            {graphData.linePath && (
              <path
                d={graphData.linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Pulsing end point */}
            {graphData.points.length > 0 && (
              <>
                <circle
                  cx={graphData.points[graphData.points.length - 1].x}
                  cy={graphData.points[graphData.points.length - 1].y}
                  r="5"
                  fill={lineColor}
                  className="animate-ping origin-center"
                  style={{
                    transformOrigin: `${graphData.points[graphData.points.length - 1].x}px ${graphData.points[graphData.points.length - 1].y}px`,
                    animationDuration: "1.5s",
                  }}
                />
                <circle
                  cx={graphData.points[graphData.points.length - 1].x}
                  cy={graphData.points[graphData.points.length - 1].y}
                  r="3.5"
                  fill={lineColor}
                  stroke={isDarkMode ? "#020617" : "#ffffff"}
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Simulator Controls Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl p-5 md:p-6 shadow-md max-w-4xl mx-auto w-full transition-colors">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Simulator Controls
        </h4>
        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          {/* distance control */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="dist-rssi" className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                Transceiver Distance
              </label>
              <span className="text-sm font-mono text-slate-700 dark:text-slate-350 font-bold">{distance.toFixed(1)} m</span>
            </div>
            <input
              id="dist-rssi"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full accent-blue-500 bg-slate-200 dark:bg-slate-955 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* place object button */}
          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-105 dark:hover:bg-slate-700 text-slate-800 border-slate-300"
            }`}
          >
            {objectPresent ? "Remove Path Obstruction" : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}
