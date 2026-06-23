import { useState, useEffect, useMemo } from "react";

export default function Detection({
  rssi,
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isPaused,
  isDarkMode,
}) {
  const [packetNum, setPacketNum] = useState(299);
  const [subcarrierAmplitudes, setSubcarrierAmplitudes] = useState([]);

  // Increment packet number over time when not paused
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setPacketNum((prev) => prev + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Generate wiggling subcarrier amplitudes
  useEffect(() => {
    const generateAmplitudes = () => {
      const baseSignal = objectPresent ? 15 : 28;
      const noiseLevel = objectPresent ? 5 : 3;

      return Array.from({ length: 65 }, (_, i) => {
        const idx = i - 32;
        const isGuard = idx <= -28 || idx >= 28;
        const isCenter = idx === 0;

        if (isCenter) {
          const peakVal = objectPresent ? 65 : 85;
          return peakVal + (Math.random() - 0.5) * 2;
        }

        if (isGuard) {
          return 5 + Math.random() * 4;
        }

        const distFromCenter = Math.abs(idx);
        const curveFactor = Math.max(0, 1 - distFromCenter / 28);
        const baseVal = baseSignal + curveFactor * 8;
        
        return Math.max(2, baseVal + (Math.random() - 0.5) * noiseLevel);
      });
    };

    if (subcarrierAmplitudes.length === 0) {
      setSubcarrierAmplitudes(generateAmplitudes());
    }

    if (isPaused) return;

    const interval = setInterval(() => {
      setSubcarrierAmplitudes(generateAmplitudes());
    }, 120);

    return () => clearInterval(interval);
  }, [isPaused, objectPresent, subcarrierAmplitudes.length]);

  const svgPath = useMemo(() => {
    if (subcarrierAmplitudes.length === 0) return "";
    const width = 800;
    const height = 360;
    const paddingX = 50;
    const paddingY = 40;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;

    const points = subcarrierAmplitudes.map((amp, index) => {
      const x = paddingX + (index / 64) * plotWidth;
      const y = paddingY + plotHeight - (amp / 100) * plotHeight;
      return { x, y };
    });

    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
  }, [subcarrierAmplitudes]);

  const lnaAgc = useMemo(() => {
    const baseAgc = -96;
    const variance = Math.sin(packetNum * 0.1) * 1.5;
    const rssiOffset = Math.round((rssi + 45) * 0.8);
    return Math.min(-40, Math.max(-120, Math.round(baseAgc - rssiOffset + variance)));
  }, [rssi, packetNum]);

  // Theme-specific colors for SVG elements
  const chartBg = isDarkMode ? "#020617" : "#f8fafc";
  const gridColor = isDarkMode ? "#1e293b" : "#e2e8f0";
  const guardBandFill = isDarkMode ? "#5c151c" : "#fee2e2";
  const guardBandStroke = isDarkMode ? "#6b1c24" : "#fca5a5";
  const guardBandOpacity = isDarkMode ? 0.25 : 0.55;
  const dcNullColor = isDarkMode ? "#ef4444" : "#dc2626";
  const amplitudeCurveColor = isDarkMode ? "#22d3ee" : "#0891b2";

  return (
    <div className="flex-1 w-full px-4 md:px-8 py-6 flex flex-col gap-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Detection Analysis</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-450 mt-1">
          OFDM Packet Amplitude Spectrum Analysis
        </p>
      </div>

      {/* Main Graph Card */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col transition-colors">
        
        {/* Graph title / description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Real-time OFDM Subcarrier Amplitude Spectrum
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${objectPresent ? "bg-amber-450 animate-ping" : "bg-emerald-500 dark:bg-emerald-400 animate-pulse"}`} />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {objectPresent ? "Obstruction Detected" : "Signal Path Clear"}
            </span>
          </div>
        </div>

        {/* The Graph Canvas (Responsive SVG) */}
        <div 
          className="relative w-full aspect-[2.2/1] min-h-[260px] rounded-xl border p-2 overflow-hidden shadow-inner transition-colors duration-205"
          style={{ backgroundColor: chartBg, borderColor: isDarkMode ? "#1e293b" : "#e2e8f0" }}
        >
          
          {/* Overlay Box (Top-Left) */}
          <div 
            className={`absolute top-4 left-4 z-10 border rounded-lg p-2.5 font-mono text-[10px] md:text-xs shadow-md transition-all duration-200 ${
              isDarkMode 
                ? "bg-[#020617]/95 border-emerald-400/30 text-emerald-400" 
                : "bg-white/95 border-slate-200 text-slate-800"
            }`}
          >
            <div className="grid grid-cols-[80px_1fr] gap-x-1">
              <span>PACKET :</span> <span>#{packetNum}</span>
              <span>RSSI   :</span> <span>{rssi} dBm</span>
              <span>LNA AGC:</span> <span>{lnaAgc}</span>
            </div>
          </div>

          {/* Legend Box (Top-Right) */}
          <div 
            className={`absolute top-4 right-4 z-10 border rounded-lg p-2 font-mono text-[9px] md:text-[10px] flex flex-col gap-1.5 shadow-md transition-all duration-200 ${
              isDarkMode 
                ? "bg-[#020617]/95 border-slate-800 text-slate-350" 
                : "bg-white/95 border-slate-200 text-slate-650"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: amplitudeCurveColor }} />
              <span>OFDM Amplitude √(|² + Q²)</span>
            </div>
            <div className="flex items-center gap-2">
              <span 
                className="w-4 h-3 inline-block border" 
                style={{ 
                  backgroundColor: guardBandFill, 
                  borderColor: guardBandStroke,
                }} 
              />
              <span>Guard Bands (Noise)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 border-t border-dashed inline-block" style={{ borderColor: dcNullColor }} />
              <span>DC Center Null</span>
            </div>
          </div>

          {/* SVG Elements */}
          <svg
            viewBox="0 0 800 360"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Grid Lines */}
            {/* Horizontal Grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
              <line
                key={i}
                x1="50"
                y1={40 + ratio * 280}
                x2="750"
                y2={40 + ratio * 280}
                stroke={gridColor}
                strokeWidth="0.8"
                strokeDasharray="4,4"
              />
            ))}
            
            {/* Vertical Grid lines */}
            {[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((ratio, i) => (
              <line
                key={i}
                x1={50 + ratio * 700}
                y1="40"
                x2={50 + ratio * 700}
                y2="320"
                stroke={gridColor}
                strokeWidth="0.8"
                strokeDasharray="4,4"
              />
            ))}

            {/* Guard Bands (Shaded Areas) */}
            <rect
              x="50"
              y="40"
              width="43.75"
              height="280"
              fill={guardBandFill}
              fillOpacity={guardBandOpacity}
              stroke={guardBandStroke}
              strokeWidth="1"
            />
            <rect
              x="706.25"
              y="40"
              width="43.75"
              height="280"
              fill={guardBandFill}
              fillOpacity={guardBandOpacity}
              stroke={guardBandStroke}
              strokeWidth="1"
            />

            {/* DC Center Null (Vertical dashed line at index 32) */}
            <line
              x1="400"
              y1="40"
              x2="400"
              y2="320"
              stroke={dcNullColor}
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />

            {/* Solid Cyan Amplitude curve */}
            {svgPath && (
              <path
                d={svgPath}
                fill="none"
                stroke={amplitudeCurveColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Simulator Controls Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-md max-w-4xl mx-auto w-full transition-colors">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4">
          Simulator Controls
        </h4>
        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          {/* distance control */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="dist-detection" className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                Transceiver Distance
              </label>
              <span className="text-sm font-mono text-slate-700 dark:text-slate-350 font-bold">{distance.toFixed(1)} m</span>
            </div>
            <input
              id="dist-detection"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-200 dark:bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* place object button */}
          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 text-slate-800 border-slate-300"
            }`}
          >
            {objectPresent ? "Remove Path Obstruction" : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}
