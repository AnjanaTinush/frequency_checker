import { useMemo } from "react";

export default function Subcarrier({
  history,
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isDarkMode,
}) {
  // Convert subcarrier history to SVG paths
  const graphData = useMemo(() => {
    if (!history || history.length === 0) {
      return { lines: [], gridLinesY: [], gridLinesX: [], plotWidth: 710, plotHeight: 270 };
    }

    const width = 800;
    const height = 360;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 50;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const yMin = 0;
    const yMax = 100;
    const yRange = yMax - yMin;

    const numSubcarriers = 30;
    const lines = [];

    // Predefine colors for the specific lines to match the image, depending on theme
    const getStrokeColor = (i) => {
      if (i === 0) return isDarkMode ? "#818cf8" : "#4f46e5"; // Indigo/blue (glowing in dark)
      if (i === 1) return isDarkMode ? "#fb923c" : "#e05600"; // Orange
      if (i === 2) return isDarkMode ? "#f472b6" : "#be185d"; // Pink
      if (i === 3 || i === 4) return isDarkMode ? "#64748b" : "#94a3b8"; // Grey
      
      // Generate pastel colors for the bundle
      const hue = (i * 137.5) % 360;
      const saturation = isDarkMode ? "65%" : "70%";
      const lightness = isDarkMode ? "60%" : "45%";
      const opacity = isDarkMode ? "0.6" : "0.7";
      return `hsla(${hue}, ${saturation}, ${lightness}, ${opacity})`;
    };

    const getStrokeWidth = (i) => {
      if (i <= 4) return "1.5";
      return "1.0";
    };

    // Calculate paths for each of the 30 subcarriers
    for (let s = 0; s < numSubcarriers; s++) {
      const points = history.map((item, index) => {
        const x = paddingLeft + (index / (history.length - 1 || 1)) * plotWidth;
        const amp = item.amplitudes[s] !== undefined ? item.amplitudes[s] : 20;
        const ratio = (amp - yMin) / yRange;
        const y = paddingTop + plotHeight - ratio * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const path = points.length > 0 ? "M " + points.join(" L ") : "";
      lines.push({
        path,
        color: getStrokeColor(s),
        strokeWidth: getStrokeWidth(s),
      });
    }

    // Y Axis Grid lines
    const gridYValues = [0, 20, 40, 60, 80, 100];
    const gridLinesY = gridYValues.map((val) => {
      const ratio = (val - yMin) / yRange;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { y, label: val.toString() };
    });

    // X Axis Grid lines (based on history length)
    const gridLinesX = [];
    const interval = Math.max(1, Math.floor(history.length / 5));
    for (let i = 0; i < history.length; i += interval) {
      if (history[i]) {
        const x = paddingLeft + (i / (history.length - 1 || 1)) * plotWidth;
        gridLinesX.push({
          x,
          label: history[i].time,
        });
      }
    }
    // Make sure we include the last point's time
    if (history.length > 0 && (history.length - 1) % interval !== 0) {
      const x = paddingLeft + plotWidth;
      gridLinesX.push({
        x,
        label: history[history.length - 1].time,
      });
    }

    return { lines, gridLinesY, gridLinesX, plotWidth, plotHeight, paddingTop, paddingLeft };
  }, [history, isDarkMode]);

  // Theme-specific colors for SVG elements
  const chartBg = isDarkMode ? "#020617" : "#f8fafc";
  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0";
  const axisBorderColor = isDarkMode ? "#334155" : "#cbd5e1";
  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const axisLabelColor = isDarkMode ? "#cbd5e1" : "#475569";

  return (
    <div className="flex-1 w-full px-4 md:px-8 py-6 flex flex-col gap-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Subcarrier Analysis</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-455 mt-1">
          Amplitude spectrum of individual OFDM subcarriers over time
        </p>
      </div>

      {/* Main Graph Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col transition-colors">
        
        {/* Title corresponding to user's third image */}
        <h3 className="text-sm font-semibold text-slate-650 dark:text-slate-350 text-center mb-4">
          Subcarrier Amplitudes Over Time
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
              Amplitude
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

            {/* Plotted Paths for 30 Subcarriers */}
            {graphData.lines.map((line, i) => (
              line.path && (
                <path
                  key={`line-${i}`}
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            ))}
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
              <label htmlFor="dist-subcarrier" className="text-xs font-semibold text-slate-500 dark:text-slate-455 uppercase tracking-wider">
                Transceiver Distance
              </label>
              <span className="text-sm font-mono text-slate-700 dark:text-slate-350 font-bold">{distance.toFixed(1)} m</span>
            </div>
            <input
              id="dist-subcarrier"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-955 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* place object button */}
          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-slate-955 shadow-lg shadow-amber-500/20"
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
