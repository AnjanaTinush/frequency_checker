import { useState, useEffect, useMemo } from "react";
import Pusher from "pusher-js";

export default function Subcarrier({
  history,
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isDarkMode,
}) {
  // --- LIVE TELEMETRY STATE ---
  const [liveHistory, setLiveHistory] = useState([]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting...");

  // --- SIMULATION STATE (Resilient Fallback) ---
  const [simHistory, setSimHistory] = useState([]);

  // --- INTERACTIVE STRAND HIGHLIGHTER ---
  const [highlightedStrand, setHighlightedStrand] = useState(null);

  // 1. Capture live Vercel/Pusher WebSocket packages
  useEffect(() => {
    const pusher = new Pusher("37eddc60d27348eb95f7", {
      cluster: "ap1",
      forceTLS: true,
    });

    pusher.connection.bind("state_change", (states) => {
      setConnectionStatus(states.current);
    });

    const channel = pusher.subscribe("wifi-sensing-channel");

    channel.bind("csi-update", (data) => {
      if (!isLiveMode) return;

      const payload = data?.payload;
      if (!payload) return;

      const samples = payload.samples || [payload];
      const newestSample = samples[samples.length - 1];

      if (newestSample && newestSample.csi && newestSample.csi.length === 128) {
        const rawIQ = newestSample.csi;
        const calculatedMagnitudes = [];

        // Convert raw I/Q baseband integers into Euclidean Magnitudes
        for (let i = 0; i < rawIQ.length; i += 2) {
          const rI = rawIQ[i];
          const iQ = rawIQ[i + 1];
          calculatedMagnitudes.push(Math.sqrt(rI * rI + iQ * iQ));
        }

        // Slice out 30 active data subcarriers near the center (skipping noisy guard bands and DC null)
        const activeSubcarriers = calculatedMagnitudes.slice(16, 46);

        const timeObj = data.timestamp ? new Date(data.timestamp) : new Date();
        const timeString = timeObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setLiveHistory((prev) => {
          // Maintain a rolling buffer of the last 40 time ticks
          const next = [...prev, { time: timeString, amplitudes: activeSubcarriers }];
          return next.length > 40 ? next.slice(next.length - 40) : next;
        });
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [isLiveMode]);

  // 2. Automated Simulation Generator when switched to Manual Mode
  useEffect(() => {
    if (isLiveMode) return;

    const interval = setInterval(() => {
      const timeString = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const baseSignal = objectPresent ? 22 : 45;
      const noise = objectPresent ? 10 : 4;

      // Generate 30 distinct mock subcarrier wave variations
      const mockAmplitudes = Array.from({ length: 30 }, (_, s) => {
        const strandOffset = Math.sin(s * 0.5) * 15;
        return Math.max(
          5,
          Math.min(115, baseSignal + strandOffset + (Math.random() - 0.5) * noise)
        );
      });

      setSimHistory((prev) => {
        const next = [...prev, { time: timeString, amplitudes: mockAmplitudes }];
        return next.length > 40 ? next.slice(next.length - 40) : next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLiveMode, objectPresent]);

  const defaultHistory = useMemo(() => {
    const timeString = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return [
      {
        time: timeString,
        amplitudes: Array.from({ length: 30 }, () => 0),
      },
    ];
  }, []);

  // Reconcile active history array
  const activeHistory =
    isLiveMode && liveHistory.length > 0
      ? liveHistory
      : simHistory.length > 0
      ? simHistory
      : history && history.length > 0
      ? history
      : defaultHistory;

  // --- SVG GEOMETRY & EXPLICIT AXES ---
  const width = 800;
  const height = 360;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 40;
  const paddingBottom = 65;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const yMin = 0;
  const numSubcarriers = 30;

  const getNiceStep = (range) => {
    if (range <= 10) return 2;
    if (range <= 25) return 5;
    if (range <= 50) return 10;
    if (range <= 100) return 20;
    if (range <= 250) return 50;
    if (range <= 500) return 100;
    if (range <= 1000) return 200;
    return Math.ceil(range / 5 / 100) * 100;
  };

  const { yMax, yRange, yTicks } = useMemo(() => {
    const allValues = activeHistory.flatMap((item) =>
      Array.isArray(item.amplitudes)
        ? item.amplitudes.filter((value) => Number.isFinite(Number(value))).map(Number)
        : []
    );

    const maxValue = Math.max(0, ...allValues);
    const paddedMax = maxValue <= 0 ? 10 : maxValue * 1.15;
    const step = getNiceStep(paddedMax);
    const dynamicMax = Math.max(step, Math.ceil(paddedMax / step) * step);

    const ticks = [];
    for (let value = 0; value <= dynamicMax; value += step) {
      ticks.push(value);
    }

    return {
      yMax: dynamicMax,
      yRange: dynamicMax - yMin || 1,
      yTicks: ticks,
    };
  }, [activeHistory]);

  // Colors for primary featured strands
  const getStrandTheme = (i) => {
    if (i === 0) return { color: isDarkMode ? "#818cf8" : "#4f46e5", name: "Strand #0 (Center)" };
    if (i === 1) return { color: isDarkMode ? "#fb923c" : "#ea580c", name: "Strand #1 (Offset A)" };
    if (i === 2) return { color: isDarkMode ? "#f472b6" : "#db2777", name: "Strand #2 (Offset B)" };
    if (i === 3) return { color: isDarkMode ? "#38bdf8" : "#0284c7", name: "Strand #3 (Offset C)" };

    const hue = (i * 137.5) % 360;
    const sat = isDarkMode ? "65%" : "70%";
    const light = isDarkMode ? "60%" : "45%";
    return { color: `hsl(${hue}, ${sat}, ${light})`, name: `Strand #${i}` };
  };

  // Generate SVG coordinate paths for all 30 lines
  const lineStrands = useMemo(() => {
    if (!activeHistory || activeHistory.length === 0) return [];

    const result = [];
    for (let s = 0; s < numSubcarriers; s++) {
      const theme = getStrandTheme(s);
      const points = activeHistory.map((item, idx) => {
        const x = paddingLeft + (idx / (activeHistory.length - 1 || 1)) * plotWidth;
        const rawAmp =
          item.amplitudes && item.amplitudes[s] !== undefined
            ? Number(item.amplitudes[s])
            : 0;
        const boundedAmp = Math.min(Math.max(yMin, rawAmp), yMax);
        const y = paddingTop + plotHeight - ((boundedAmp - yMin) / yRange) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      result.push({
        id: s,
        name: theme.name,
        color: theme.color,
        path: points.length > 0 ? "M " + points.join(" L ") : "",
        isFeatured: s <= 3,
      });
    }
    return result;
  }, [activeHistory, isDarkMode, plotWidth, plotHeight, yMax, yRange]);

  // Dynamic Y-Axis Ticks
  const yGridLines = useMemo(() => {
    return yTicks.map((val) => {
      const y = paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;
      return { y, label: val.toString() };
    });
  }, [yTicks, paddingTop, plotHeight, yRange]);

  // Explicit X-Axis Ticks (Dynamic historical timestamps)
  const xGridLines = useMemo(() => {
    if (!activeHistory || activeHistory.length === 0) return [];
    const ticks = [];
    const step = Math.max(1, Math.floor((activeHistory.length - 1) / 5));

    for (let i = 0; i < activeHistory.length; i += step) {
      if (activeHistory[i]) {
        const x = paddingLeft + (i / (activeHistory.length - 1 || 1)) * plotWidth;
        ticks.push({ x, label: activeHistory[i].time });
      }
    }
    return ticks;
  }, [activeHistory, paddingLeft, plotWidth]);

  // Theme Colors
  const chartBg = isDarkMode ? "#020617" : "#f8fafc";
  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0";
  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const axisLabelColor = isDarkMode ? "#cbd5e1" : "#475569";

  return (
    <div className="flex-1 w-full px-4 md:px-8 py-6 flex flex-col gap-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Subcarrier Analysis</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Time-series trajectories of 30 isolated OFDM subcarrier frequencies
          </p>
        </div>

        {/* Source Switcher */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setIsLiveMode(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isLiveMode
                ? "bg-emerald-500 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected" ? "bg-white animate-pulse" : "bg-amber-300"
              }`}
            />
            LIVE ESP32 STREAM ({connectionStatus})
          </button>
          <button
            onClick={() => setIsLiveMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isLiveMode
                ? "bg-cyan-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            MANUAL SIMULATOR
          </button>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span>Subcarrier Amplitudes Over Time</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
              30 Active Bins
            </span>
          </h3>

          {/* Interactive Strand Isolator Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">
              Isolate:
            </span>
            {lineStrands
              .filter((s) => s.isFeatured)
              .map((strand) => (
                <button
                  key={strand.id}
                  onMouseEnter={() => setHighlightedStrand(strand.id)}
                  onMouseLeave={() => setHighlightedStrand(null)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 border ${
                    highlightedStrand === strand.id
                      ? "bg-white dark:bg-slate-800 shadow-md scale-105"
                      : "bg-transparent border-transparent opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    borderColor: highlightedStrand === strand.id ? strand.color : "transparent",
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strand.color }} />
                  <span>#{strand.id}</span>
                </button>
              ))}
            <button
              onMouseEnter={() => setHighlightedStrand(-1)}
              onMouseLeave={() => setHighlightedStrand(null)}
              className="px-2 py-1 rounded-lg font-mono text-[10px] text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
            >
              +26 Others
            </button>
          </div>
        </div>

        {/* SVG Canvas Container */}
        <div
          className="relative w-full aspect-[2.2/1] min-h-[280px] rounded-xl border p-2 overflow-hidden shadow-inner transition-colors"
          style={{
            backgroundColor: chartBg,
            borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
          }}
        >
          <svg viewBox="0 0 800 360" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {/* Horizontal Grid lines & Left Y-Axis Labels */}
            {yGridLines.map((line, i) => (
              <g key={`y-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={line.y}
                  x2={width - paddingRight}
                  y2={line.y}
                  stroke={gridColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x={paddingLeft - 8}
                  y={line.y + 3}
                  textAnchor="end"
                  fill={textColor}
                  className="text-[10px] font-mono font-bold select-none"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Vertical Grid lines & Bottom X-Axis Timestamp Strings */}
            {xGridLines.map((line, i) => (
              <g key={`x-${i}`}>
                <line
                  x1={line.x}
                  y1={paddingTop}
                  x2={line.x}
                  y2={paddingTop + plotHeight}
                  stroke={gridColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x={line.x}
                  y={paddingTop + plotHeight + 18}
                  textAnchor="middle"
                  fill={textColor}
                  className="text-[9px] font-mono select-none"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Outer Graph Bounding Box */}
            <rect
              x={paddingLeft}
              y={paddingTop}
              width={plotWidth}
              height={plotHeight}
              fill="none"
              stroke={isDarkMode ? "#334155" : "#cbd5e1"}
              strokeWidth="1.5"
            />

            {/* Y-Axis Label */}
            <text
              transform={`rotate(-90 16 ${paddingTop + plotHeight / 2})`}
              x="16"
              y={paddingTop + plotHeight / 2}
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-extrabold uppercase tracking-wider select-none"
            >
              Magnitude (dBm)
            </text>

            {/* X-Axis Label */}
            <text
              x={paddingLeft + plotWidth / 2}
              y={paddingTop + plotHeight + 38}
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-extrabold uppercase tracking-wider select-none"
            >
              PC System Timestamps (Rolling Window)
            </text>

            {/* Plotted Trajectories for all 30 Subcarriers */}
            {lineStrands.map((strand) => {
              if (!strand.path) return null;

              let isMuted = false;
              let activeWidth = strand.isFeatured ? "2.0" : "1.0";

              if (highlightedStrand !== null) {
                if (highlightedStrand === -1) {
                  isMuted = strand.isFeatured;
                } else {
                  isMuted = highlightedStrand !== strand.id;
                  if (!isMuted) activeWidth = "3.5";
                }
              }

              return (
                <path
                  key={`strand-${strand.id}`}
                  d={strand.path}
                  fill="none"
                  stroke={strand.color}
                  strokeWidth={activeWidth}
                  strokeOpacity={isMuted ? 0.08 : strand.isFeatured ? 0.9 : 0.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-opacity duration-150"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Simulator Controls Card */}
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-md max-w-4xl mx-auto w-full transition-opacity ${
          isLiveMode ? "opacity-30 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Simulator Controls
          </h4>
          {isLiveMode && (
            <span className="text-xs text-amber-500 font-semibold">
              ⚠️ Click 'Manual Simulator' above to unlock sliders
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="dist-subcarrier"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Transceiver Distance
              </label>
              <span className="text-sm font-mono font-bold">{distance.toFixed(1)} m</span>
            </div>
            <input
              id="dist-subcarrier"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-300 text-slate-800 dark:text-white"
            }`}
          >
            {objectPresent ? "Remove Path Obstruction" : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}