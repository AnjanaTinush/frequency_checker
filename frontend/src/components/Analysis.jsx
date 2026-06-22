import { useMemo } from "react";

export default function Analysis({ history, distance, setDistance, objectPresent, setObjectPresent }) {
  // Compute session stats based on telemetry history
  const stats = useMemo(() => {
    if (!history || history.length === 0) {
      return { min: 2.3740, max: 2.4000, avg: 2.4000, current: 2.4000 };
    }
    const current = history[history.length - 1];
    const min = Math.min(...history);
    const max = Math.max(...history);
    const sum = history.reduce((a, b) => a + b, 0);
    const avg = sum / history.length;
    return { min, max, avg, current };
  }, [history]);

  // Generate SVG path coordinate points
  const graphPoints = useMemo(() => {
    if (!history || history.length === 0) return "";
    const width = 600;
    const height = 240;
    const padding = 25;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Define Y scale boundaries. Let's frame around 2.36 to 2.41 GHz
    const yMin = 2.365;
    const yMax = 2.405;
    const yRange = yMax - yMin;

    const points = history.map((val, index) => {
      // X coordinate is distributed across the points buffer length
      const x = padding + (index / (history.length - 1 || 1)) * plotWidth;
      // Y coordinate goes down as frequency goes up (since SVG 0,0 is top-left)
      const ratio = (val - yMin) / yRange;
      const y = padding + plotHeight - ratio * plotHeight;
      return { x, y };
    });

    // Create SVG Path line
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    // Create SVG Path fill (closes the shape at the bottom)
    const fillPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - padding).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - padding).toFixed(1)} Z`
      : "";

    return { linePath, fillPath, points };
  }, [history]);

  // Status mapping
  const dropMHz = (2.4 - stats.current) * 1000;
  const isObstructed = objectPresent;

  return (
    <div className="flex-1 w-full bg-slate-950 px-4 md:px-8 py-6 flex flex-col gap-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-100">Frequency Analysis</h2>
          <p className="text-xs md:text-sm text-slate-400">
            Real-time signal tracking and spectrogram analysis
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${isObstructed ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
          <span className="text-xs font-semibold text-slate-350">
            Telemetry: {isObstructed ? "Obstructed Path" : "Normal Path"}
          </span>
        </div>
      </div>

      {/* Main Grid: Graph + Stats Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Card */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              GHz Frequency Spectrogram
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Showing last {history.length} samples
            </span>
          </div>

          {/* SVG Graph View */}
          <div className="relative w-full aspect-[2.5/1] min-h-[220px] bg-slate-950/80 rounded-xl border border-slate-800 p-2 overflow-hidden">
            <svg
              viewBox="0 0 600 240"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Neon gradient path line */}
                <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#67e8f9" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                {/* Gradient area under the line */}
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="25" y1="25" x2="575" y2="25" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="25" y1="78" x2="575" y2="78" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="25" y1="131" x2="575" y2="131" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="25" y1="184" x2="575" y2="184" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="25" y1="215" x2="575" y2="215" stroke="#334155" />

              {/* Grid values */}
              <text x="10" y="30" fill="#475569" className="text-[9px] font-mono">2.40</text>
              <text x="10" y="83" fill="#475569" className="text-[9px] font-mono">2.39</text>
              <text x="10" y="136" fill="#475569" className="text-[9px] font-mono">2.38</text>
              <text x="10" y="189" fill="#475569" className="text-[9px] font-mono">2.37</text>

              {/* Paths */}
              {graphPoints.fillPath && (
                <path d={graphPoints.fillPath} fill="url(#areaFill)" />
              )}
              {graphPoints.linePath && (
                <path
                  d={graphPoints.linePath}
                  fill="none"
                  stroke="url(#lineGlow)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Pulsing indicator on the latest node point */}
              {graphPoints.points && graphPoints.points.length > 0 && (
                <>
                  <circle
                    cx={graphPoints.points[graphPoints.points.length - 1].x}
                    cy={graphPoints.points[graphPoints.points.length - 1].y}
                    r="6"
                    fill={isObstructed ? "#fbbf24" : "#34d399"}
                    className="animate-ping origin-center"
                    style={{ transformOrigin: `${graphPoints.points[graphPoints.points.length - 1].x}px ${graphPoints.points[graphPoints.points.length - 1].y}px` }}
                  />
                  <circle
                    cx={graphPoints.points[graphPoints.points.length - 1].x}
                    cy={graphPoints.points[graphPoints.points.length - 1].y}
                    r="4"
                    fill={isObstructed ? "#f59e0b" : "#10b981"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Real-time stats column */}
        <div className="flex flex-col gap-4">
          {/* Card: Current Frequency */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current Frequency
            </span>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className={`text-3xl font-mono font-bold tracking-tight ${isObstructed ? "text-amber-400" : "text-sky-400"}`}>
                {stats.current.toFixed(4)}
              </span>
              <span className="text-sm text-slate-500">GHz</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Delta Drop: <span className="font-mono text-slate-400">-{dropMHz.toFixed(2)} MHz</span>
            </p>
          </div>

          {/* Stats Grid: Min / Max */}
          <div className="grid grid-cols-2 gap-4">
            {/* Max Freq */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 shadow-md">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Session Max
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400 mt-1 block">
                {stats.max.toFixed(4)} <span className="text-xs font-sans text-slate-500 font-normal">GHz</span>
              </span>
            </div>

            {/* Min Freq */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 shadow-md">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Session Min
              </span>
              <span className="text-lg font-mono font-bold text-rose-400 mt-1 block">
                {stats.min.toFixed(4)} <span className="text-xs font-sans text-slate-500 font-normal">GHz</span>
              </span>
            </div>
          </div>

          {/* Average */}
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Session Average
              </span>
              <span className="text-base font-mono font-bold text-slate-200 mt-0.5 block">
                {stats.avg.toFixed(4)} GHz
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive controls panel (for ease of testing graph changes directly) */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 md:p-6 mt-2 max-w-4xl mx-auto w-full">
        <h4 className="text-sm font-semibold text-slate-350 mb-4">
          Simulator Controller
        </h4>
        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          {/* distance control */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="dist-analysis" className="text-xs font-semibold text-slate-450 uppercase tracking-wider">
                Node Distance
              </label>
              <span className="text-sm font-mono text-slate-300 font-semibold">{distance.toFixed(1)} m</span>
            </div>
            <input
              id="dist-analysis"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* place object button */}
          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-xs uppercase tracking-wider font-bold px-5 py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-800 border-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            {objectPresent ? "Remove Path Obstruction" : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}
