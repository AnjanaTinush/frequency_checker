import { useState, useEffect, useMemo } from "react";
import Pusher from "pusher-js";

export default function Detection({
  rssi,
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isPaused,
  isDarkMode,
}) {
  // --- LIVE TELEMETRY STATE ---
  const [liveAmplitudes, setLiveAmplitudes] = useState([]);
  const [livePktNum, setLivePktNum] = useState(0);
  const [liveRssi, setLiveRssi] = useState(0);
  const [liveAgc, setLiveAgc] = useState(0);
  const [liveTime, setLiveTime] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting...");

  // --- SIMULATION STATE ---
  const [simPacketNum, setSimPacketNum] = useState(299);
  const [simAmplitudes, setSimAmplitudes] = useState([]);
  const [simTime, setSimTime] = useState("");

  // --- INSPECTION & TABLE STATE ---
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showDataMatrix, setShowDataMatrix] = useState(false);

  // 1. Pusher WebSocket Ingestion
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
      if (isPaused || !isLiveMode) return;
      const payload = data?.payload;
      if (!payload) return;

      const samples = payload.samples || [payload];
      const newestSample = samples[samples.length - 1];

      if (newestSample && newestSample.csi && newestSample.csi.length === 128) {
        const rawIQ = newestSample.csi;
        const magnitudes = [];

        for (let i = 0; i < rawIQ.length; i += 2) {
          const rI = rawIQ[i];
          const iQ = rawIQ[i + 1];
          magnitudes.push(Math.sqrt(rI * rI + iQ * iQ));
        }

        setLiveAmplitudes(magnitudes);
        if (newestSample.pkt !== undefined) setLivePktNum(newestSample.pkt);
        if (newestSample.rssi !== undefined) setLiveRssi(newestSample.rssi);
        if (newestSample.agc !== undefined) setLiveAgc(newestSample.agc);

        // Capture exact packet arrival timestamp
        const timeObj = data.timestamp ? new Date(data.timestamp) : new Date();
        setLiveTime(timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [isPaused, isLiveMode]);

  // 2. Manual Simulation Generator
  useEffect(() => {
    if (isPaused || isLiveMode) return;
    const interval = setInterval(() => {
      setSimPacketNum((prev) => prev + 1);
      setSimTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 200);
    return () => clearInterval(interval);
  }, [isPaused, isLiveMode]);

  useEffect(() => {
    const generateSimAmps = () => {
      const baseSignal = objectPresent ? 15 : 28;
      const noiseLevel = objectPresent ? 5 : 3;

      return Array.from({ length: 64 }, (_, i) => {
        const idx = i - 32;
        if (idx === 0) return (objectPresent ? 65 : 85) + (Math.random() - 0.5) * 2;
        if (idx <= -28 || idx >= 28) return 5 + Math.random() * 4;
        const curve = Math.max(0, 1 - Math.abs(idx) / 28);
        return Math.max(2, baseSignal + curve * 8 + (Math.random() - 0.5) * noiseLevel);
      });
    };

    if (simAmplitudes.length === 0) setSimAmplitudes(generateSimAmps());
    if (isPaused || isLiveMode) return;

    const interval = setInterval(() => setSimAmplitudes(generateSimAmps()), 120);
    return () => clearInterval(interval);
  }, [isPaused, objectPresent, isLiveMode, simAmplitudes.length]);

  // --- SOURCE RESOLUTION ---
  const activeAmplitudes = isLiveMode && liveAmplitudes.length > 0 ? liveAmplitudes : simAmplitudes;
  const activePktNum = isLiveMode ? livePktNum : simPacketNum;
  const activeRssi = isLiveMode ? liveRssi : rssi;
  const activeTime = (isLiveMode && liveTime ? liveTime : simTime) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const activeAgc = useMemo(() => {
    if (isLiveMode && liveAgc !== 0) return liveAgc;
    return Math.min(-40, Math.max(-120, Math.round(-96 - Math.round((rssi + 45) * 0.8))));
  }, [isLiveMode, liveAgc, rssi]);

  // --- SVG AXIS & LAYOUT CONFIGURATION ---
  const width = 800;
  const height = 360;
  const paddingLeft = 65; // Expanded to fit "100" and "120" labels perfectly
  const paddingRight = 25;
  const paddingTop = 40;
  const paddingBottom = 65; // Expanded to fit X-axis ticks + bottom timestamp banner

  const plotWidth = width - paddingLeft - paddingRight; // 710px
  const plotHeight = height - paddingTop - paddingBottom; // 255px
  const magnitudeCeiling = 120; // Fixed Y ceiling

  // Explicit Y-Axis Ticks (0 to 120)
  const yTicks = [0, 20, 40, 60, 80, 100, 120];
  const yGridLines = useMemo(() => {
    return yTicks.map((val) => {
      const y = paddingTop + plotHeight - (val / magnitudeCeiling) * plotHeight;
      return { y, label: val.toString() };
    });
  }, [paddingTop, plotHeight]);

  // Explicit X-Axis Ticks (Subcarrier Indices across the 64 Bins)
  const xTicks = [
    { bin: 0, label: "-32" },
    { bin: 8, label: "-24" },
    { bin: 16, label: "-16" },
    { bin: 24, label: "-8" },
    { bin: 32, label: "0 (DC)" },
    { bin: 40, label: "+8" },
    { bin: 48, label: "+16" },
    { bin: 56, label: "+24" },
    { bin: 63, label: "+31" },
  ];
  const xGridLines = useMemo(() => {
    return xTicks.map((t) => {
      const x = paddingLeft + (t.bin / 63) * plotWidth;
      return { x, label: t.label, isDC: t.bin === 32 };
    });
  }, [paddingLeft, plotWidth]);

  // Map waveform points coordinates
  const pointsCoordinates = useMemo(() => {
    if (!activeAmplitudes || activeAmplitudes.length === 0) return [];
    return activeAmplitudes.map((amp, index) => {
      const x = paddingLeft + (index / (activeAmplitudes.length - 1 || 1)) * plotWidth;
      const boundedAmp = Math.min(Math.max(0, amp), magnitudeCeiling);
      const y = paddingTop + plotHeight - (boundedAmp / magnitudeCeiling) * plotHeight;
      return { x, y, magnitude: amp, subcarrierIndex: index - 32, arrayBin: index };
    });
  }, [activeAmplitudes, paddingLeft, paddingTop, plotWidth, plotHeight]);

  const svgPath = useMemo(() => {
    return pointsCoordinates.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [pointsCoordinates]);

  // Mouse hover crosshair detection
  const handleCanvasMouseMove = (e) => {
    if (pointsCoordinates.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const scaleFactor = width / rect.width;
    const svgX = clickX * scaleFactor;

    let closest = pointsCoordinates[0];
    let minDist = Infinity;
    pointsCoordinates.forEach((p) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });
    setHoveredPoint(closest);
  };

  // Colors
  const chartBg = isDarkMode ? "#020617" : "#f8fafc";
  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0";
  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const axisLabelColor = isDarkMode ? "#e2e8f0" : "#475569";
  const guardBandFill = isDarkMode ? "#5c151c" : "#fee2e2";
  const guardBandStroke = isDarkMode ? "#6b1c24" : "#fca5a5";
  const dcNullColor = isDarkMode ? "#ef4444" : "#dc2626";
  const amplitudeCurveColor = isLiveMode ? (isDarkMode ? "#10b981" : "#059669") : (isDarkMode ? "#22d3ee" : "#0891b2");

  return (
    <div className="flex-1 w-full px-4 md:px-8 py-6 flex flex-col gap-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Detection Analysis</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">OFDM Packet Amplitude Spectrum Analysis</p>
        </div>

        {/* Source Switcher */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setIsLiveMode(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isLiveMode ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-white animate-pulse' : 'bg-amber-300'}`} />
            LIVE ESP32 STREAM ({connectionStatus})
          </button>
          <button
            onClick={() => setIsLiveMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isLiveMode ? "bg-cyan-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            MANUAL SIMULATOR
          </button>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isLiveMode ? "Hardware OFDM Subcarrier Frequency Plot" : "Simulated Frequency Plot"}
          </span>
          <span className="text-xs text-slate-400">💡 Standard chart axes activated below</span>
        </div>

        {/* SVG Canvas Container */}
        <div 
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="relative w-full aspect-[2.2/1] min-h-[280px] rounded-xl border p-2 overflow-hidden shadow-inner cursor-crosshair transition-colors"
          style={{ backgroundColor: chartBg, borderColor: isDarkMode ? "#1e293b" : "#e2e8f0" }}
        >
          {/* Top-Left Data HUD */}
          <div className={`absolute top-4 left-4 z-10 border rounded-lg p-2.5 font-mono text-[10px] md:text-xs shadow-md ${
            isDarkMode ? "bg-[#020617]/95 border-emerald-400/30 text-emerald-400" : "bg-white/95 border-slate-200 text-slate-800"
          }`}>
            <div className="grid grid-cols-[80px_1fr] gap-x-1">
              <span>PACKET :</span> <span>#{activePktNum}</span>
              <span>RSSI   :</span> <span>{activeRssi} dBm</span>
              <span>LNA AGC:</span> <span>{activeAgc} dB</span>
            </div>
          </div>

          {/* Dynamic Hover Reticle Tooltip */}
          {hoveredPoint && (
            <div className={`absolute bottom-12 right-4 z-20 border rounded-xl p-3 font-mono text-xs shadow-2xl animate-scaleUp pointer-events-none ${
              isDarkMode ? "bg-slate-900/95 border-emerald-500 text-emerald-300" : "bg-white/95 text-emerald-700 border-slate-300"
            }`}>
              <div className="font-bold text-[10px] text-slate-400 border-b border-slate-700/50 pb-1 mb-1.5 uppercase">
                Crosshair Inspector
              </div>
              <div>Subcarrier : <strong className="text-slate-900 dark:text-white">Index {hoveredPoint.subcarrierIndex > 0 ? `+${hoveredPoint.subcarrierIndex}` : hoveredPoint.subcarrierIndex}</strong></div>
              <div>Magnitude  : <strong className="text-slate-900 dark:text-white">{hoveredPoint.magnitude.toFixed(2)}</strong></div>
            </div>
          )}

          <svg viewBox="0 0 800 360" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            
            {/* Horizontal Grid Lines & Left Y-AXIS NUMBERS (0 to 120) */}
            {yGridLines.map((line, i) => (
              <g key={`y-${i}`}>
                <line x1={paddingLeft} y1={line.y} x2={width - paddingRight} y2={line.y} stroke={gridColor} strokeWidth="0.8" strokeDasharray="4,4" />
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

            {/* Vertical Grid Lines & Bottom X-AXIS SUBCARRIER LABELS */}
            {xGridLines.map((line, i) => (
              <g key={`x-${i}`}>
                <line
                  x1={line.x}
                  y1={paddingTop}
                  x2={line.x}
                  y2={paddingTop + plotHeight}
                  stroke={line.isDC ? dcNullColor : gridColor}
                  strokeWidth={line.isDC ? "1.5" : "0.8"}
                  strokeDasharray={line.isDC ? "3,3" : "4,4"}
                />
                <text
                  x={line.x}
                  y={paddingTop + plotHeight + 16}
                  textAnchor="middle"
                  fill={line.isDC ? (isDarkMode ? "#fbbf24" : "#d97706") : textColor}
                  className={`text-[9px] font-mono select-none ${line.isDC ? 'font-extrabold' : ''}`}
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* Shaded Physical Guard Bands */}
            <rect x={paddingLeft} y={paddingTop} width={(3.75 / 63) * plotWidth} height={plotHeight} fill={guardBandFill} fillOpacity={0.3} stroke={guardBandStroke} />
            <rect x={paddingLeft + (59.25 / 63) * plotWidth} y={paddingTop} width={(3.75 / 63) * plotWidth} height={plotHeight} fill={guardBandFill} fillOpacity={0.3} stroke={guardBandStroke} />

            {/* Main Outer Graph Perimeter Border */}
            <rect x={paddingLeft} y={paddingTop} width={plotWidth} height={plotHeight} fill="none" stroke={isDarkMode ? "#334155" : "#cbd5e1"} strokeWidth="1.5" />

            {/* Y-AXIS TITLE */}
            <text
              transform={`rotate(-90 16 ${paddingTop + plotHeight / 2})`}
              x="16"
              y={paddingTop + plotHeight / 2}
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-extrabold tracking-wider uppercase select-none"
            >
              Magnitude (0 - 120)
            </text>

            {/* X-AXIS TITLE & LIVE TIMESTAMP BANNER */}
            <text
              x={paddingLeft + plotWidth / 2}
              y={paddingTop + plotHeight + 35}
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-extrabold tracking-wider select-none"
            >
              Subcarrier Frequency Index &nbsp;&nbsp;|&nbsp;&nbsp; <tspan className="text-emerald-600 dark:text-emerald-400 font-mono">LIVE TIMESTAMP: {activeTime}</tspan>
            </text>

            {/* Hover Crosshair Reticle */}
            {hoveredPoint && (
              <>
                <line x1={hoveredPoint.x} y1={paddingTop} x2={hoveredPoint.x} y2={paddingTop + plotHeight} stroke={isDarkMode ? "#34d399" : "#059669"} strokeWidth="1" strokeDasharray="2,2" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill={isDarkMode ? "#10b981" : "#059669"} stroke="#ffffff" strokeWidth="2" />
              </>
            )}

            {/* Baseband Waveform Path */}
            {svgPath && <path d={svgPath} fill="none" stroke={amplitudeCurveColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </div>
      </div>

      {/* Raw Matrix Data Table Toggle */}
      <div className="w-full flex flex-col items-center gap-3">
        <button
          onClick={() => setShowDataMatrix(!showDataMatrix)}
          className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold hover:border-emerald-500 transition-all shadow-sm flex items-center gap-2"
        >
          <span>{showDataMatrix ? "▼ Hide X/Y Data Matrix" : "▶ Inspect Raw X/Y Data Matrix"}</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">64 Bins</span>
        </button>

        {showDataMatrix && (
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs animate-fadeIn">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Active Axis Matrix (Packet #{activePktNum})</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">X = Subcarrier Index | Y = Calculated Mag $\sqrt(I^2+Q^2)$</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 max-h-80 overflow-y-auto p-1">
              {activeAmplitudes.map((val, idx) => {
                const sub = idx - 32;
                let bgPill = "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800";
                if (sub <= -28 || sub >= 28) bgPill = "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400";
                if (sub === 0) bgPill = "bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-600 font-bold";

                return (
                  <div key={idx} className={`p-2 rounded-xl border flex flex-col items-center justify-center text-[11px] ${bgPill}`}>
                    <span className="text-[9px] text-slate-400 mb-0.5">X: {sub > 0 ? `+${sub}` : sub}</span>
                    <span className="font-mono font-bold">{val ? val.toFixed(1) : "0.0"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Simulator Controls Card */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-md max-w-4xl mx-auto w-full transition-opacity ${
        isLiveMode ? 'opacity-30 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Simulator Controls</h4>
          {isLiveMode && <span className="text-xs text-amber-500 font-semibold">⚠️ Click 'Manual Simulator' above to unlock sliders</span>}
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="dist-detection" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transceiver Distance</label>
              <span className="text-sm font-mono font-bold">{distance.toFixed(1)} m</span>
            </div>
            <input id="dist-detection" type="range" min="0.5" max="30" step="0.5" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value))} className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer" />
          </div>

          <button onClick={() => setObjectPresent((v) => !v)} className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all ${objectPresent ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-300 text-slate-800 dark:text-white"}`}>
            {objectPresent ? "Remove Path Obstruction" : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}