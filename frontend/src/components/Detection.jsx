import { useState, useEffect, useMemo, useRef } from "react";
import Pusher from "pusher-js";

export default function Detection({
  rssi = 0,
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isPaused,
  isDarkMode,
}) {
  const zeroAmplitudes = useMemo(() => Array.from({ length: 64 }, () => 0), []);

  // --- IN-MEMORY RAM DATABASE (Capped at 1,000 frames) ---
  const [historyBuffer, setHistoryBuffer] = useState([]);

  // --- LIVE TELEMETRY STATE ---
  const [liveAmplitudes, setLiveAmplitudes] = useState(zeroAmplitudes);
  const [livePktNum, setLivePktNum] = useState(0);
  const [liveRssi, setLiveRssi] = useState(0);
  const [liveAgc, setLiveAgc] = useState(0);
  const [liveTime, setLiveTime] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting...");

  // --- LIVE MOTION HEURISTICS STATE ---
  const [liveMae, setLiveMae] = useState(0);
  const [liveVariance, setLiveVariance] = useState(0);
  const [liveMotionState, setLiveMotionState] = useState("IDLE");

  // --- SIMULATION STATE ---
  const [simPacketNum, setSimPacketNum] = useState(0);
  const [simAmplitudes, setSimAmplitudes] = useState(zeroAmplitudes);
  const [simTime, setSimTime] = useState("");
  const [simMae, setSimMae] = useState(1.2);
  const [simVariance, setSimVariance] = useState(2.4);
  const [simMotionState, setSimMotionState] = useState("IDLE");

  // --- INSPECTION STATE ---
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showDataMatrix, setShowDataMatrix] = useState(false);

  // --- LIVE FLAGS AS REFS (so the Pusher socket is built ONCE and never
  //     gates on a stale closure when pause/mode toggles) ---
  const isPausedRef = useRef(isPaused);
  const isLiveModeRef = useRef(isLiveMode);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isLiveModeRef.current = isLiveMode; }, [isLiveMode]);

  // 1. Pusher WebSocket Ingestion (Batched JSON Unpacker)
  useEffect(() => {
    Pusher.logToConsole = true;

    const parseMaybeJson = (value) => {
      if (typeof value !== "string") return value;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const normalizeCsi = (value) => {
      if (!value) return [];

      if (Array.isArray(value)) {
        return value.map(Number).filter((number) => Number.isFinite(number));
      }

      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map(Number).filter((number) => Number.isFinite(number));
          }
        } catch {
          return value
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((number) => Number.isFinite(number));
        }
      }

      return [];
    };

    // Resample any array down/up to exactly `size` bins (linear interpolation).
    const resampleTo = (arr, size) => {
      if (arr.length === size) return arr;
      if (arr.length === 0) return Array.from({ length: size }, () => 0);
      if (arr.length === 1) return Array.from({ length: size }, () => arr[0]);

      const out = new Array(size);
      for (let i = 0; i < size; i++) {
        const idx = (i / (size - 1)) * (arr.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        const frac = idx - lo;
        out[i] = arr[lo] * (1 - frac) + arr[hi] * frac;
      }
      return out;
    };

    // ROBUST: accept ANY CSI length.
    //  - length 64  -> treat as amplitudes directly
    //  - even length -> treat as interleaved I/Q pairs -> magnitudes
    //  - anything else -> use as-is
    // Then force exactly 64 bins so the chart always renders.
    const toAmplitudes = (csiValues) => {
      if (!Array.isArray(csiValues) || csiValues.length === 0) return [];

      let amps;
      if (csiValues.length === 64) {
        amps = csiValues.slice();
      } else if (csiValues.length % 2 === 0) {
        amps = [];
        for (let i = 0; i < csiValues.length; i += 2) {
          const rI = csiValues[i];
          const iQ = csiValues[i + 1];
          amps.push(Math.sqrt(rI * rI + iQ * iQ));
        }
      } else {
        amps = csiValues.slice();
      }

      return resampleTo(amps, 64);
    };

    const pusher = new Pusher("37eddc60d27348eb95f7", {
      cluster: "ap1",
      forceTLS: true,
    });

    pusher.connection.bind("state_change", (states) => {
      console.log("[Pusher State]", states);
      setConnectionStatus(states.current);
    });

    pusher.connection.bind("error", (error) => {
      console.error("[Pusher Error]", error);
      setConnectionStatus("error");
    });

    const channel = pusher.subscribe("csi-telemetry");

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("[Pusher] Subscribed to csi-telemetry");
    });

    channel.bind("pusher:subscription_error", (error) => {
      console.error("[Pusher] Subscription error", error);
      setConnectionStatus("subscription_error");
    });

    channel.bind_global((eventName, data) => {
      console.log("[Pusher Event]", eventName, data);

      if (!String(eventName).startsWith("pusher:") && eventName !== "live-batch") {
        handleCsiPayload(data, eventName);
      }
    });

    function handleCsiPayload(data, eventName = "live-batch") {
      if (isPausedRef.current || !isLiveModeRef.current) return;

      const parsedData = parseMaybeJson(data);
      const payload = parseMaybeJson(
        parsedData?.payload || parsedData?.data || parsedData,
      );

      if (!payload) return;

      console.log("[CSI Payload Received]", eventName, payload);

      const incomingSamples =
        payload.samples ||
        payload.frames ||
        payload.readings ||
        (Array.isArray(payload) ? payload : [payload]);

      if (incomingSamples.length === 0) return;

      let latestAmps = zeroAmplitudes;
      let latestPkt = 0;
      let latestRssi = 0;
      let latestAgc = 0;
      let latestMae = 0;
      let latestVar = 0;
      let latestState = "IDLE";
      const unpackedEntries = [];

      incomingSamples.forEach((rawSample) => {
        const sample = parseMaybeJson(rawSample);
        if (!sample || typeof sample !== "object") return;

        const csiValues = normalizeCsi(
          sample.csi ||
            sample.csi_data ||
            sample.raw_csi ||
            sample.amplitudes,
        );

        const magnitudes = toAmplitudes(csiValues);

        if (magnitudes.length !== 64) {
          console.warn("[Pusher] Invalid CSI data skipped:", sample);
          return;
        }

        latestAmps = magnitudes;
        latestPkt =
          sample.packet_num ??
          sample.pkt ??
          sample.packet ??
          sample.packet_no ??
          latestPkt;
        latestRssi = sample.rssi ?? latestRssi;
        latestAgc = sample.agc ?? latestAgc;

        const motion = sample.motion || {};
        const calcMae =
          sample.mae ??
          sample.motion_score ??
          motion.motion_score ??
          latestMae;
        const calcVar =
          sample.variance ??
          sample.var ??
          motion.variance ??
          motion.motion_variance ??
          calcMae ??
          latestVar;
        const calcState =
          motion.motion_state ||
          motion.state ||
          sample.motion_state ||
          sample.state ||
          (calcVar > 15
            ? "MOTION_DETECTED"
            : calcMae > 5
              ? "STATIC_OBSTACLE"
              : "IDLE");

        latestMae = calcMae;
        latestVar = calcVar;
        latestState = calcState;

        const timeObj = sample.timestamp
          ? new Date(sample.timestamp)
          : payload.timestamp
            ? new Date(payload.timestamp)
            : new Date();
        const timeFormatted = timeObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        unpackedEntries.push({
          timestamp: timeFormatted,
          pkt: latestPkt,
          rssi: latestRssi,
          agc: latestAgc,
          mae: Number(calcMae).toFixed(1),
          variance: Number(calcVar).toFixed(1),
          state: calcState,
        });
      });

      if (unpackedEntries.length === 0) return;

      setLiveAmplitudes(latestAmps);
      setLivePktNum(latestPkt);
      setLiveRssi(latestRssi);
      setLiveAgc(latestAgc);
      setLiveMae(latestMae);
      setLiveVariance(latestVar);
      setLiveMotionState(latestState);
      setLiveTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      // Slide the RAM buffer
      setHistoryBuffer((prev) => [...prev, ...unpackedEntries].slice(-1000));
    }

    channel.bind("live-batch", handleCsiPayload);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("csi-telemetry");
      pusher.disconnect();
    };
    // Connect ONCE on mount. Pause/mode are read live via refs above,
    // so we no longer rebuild the socket on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Manual Simulation Generator
  useEffect(() => {
    if (isPaused || isLiveMode) return;
    const interval = setInterval(() => {
      setSimPacketNum((prev) => prev + 1);
      const sTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setSimTime(sTime);

      const isMotion = Math.random() > 0.7;
      const derivedState = objectPresent ? "STATIC_OBSTACLE" : isMotion ? "MOTION_DETECTED" : "IDLE";
      const derivedMae = objectPresent ? (12.4 + Math.random() * 2) : (1.1 + Math.random());
      const derivedVar = isMotion ? (38.5 + Math.random() * 25) : (2.1 + Math.random());

      setSimMae(derivedMae);
      setSimVariance(derivedVar);
      setSimMotionState(derivedState);

      setHistoryBuffer((prev) => [...prev, {
        timestamp: sTime,
        pkt: simPacketNum + 1,
        rssi: rssi,
        agc: -96,
        mae: derivedMae.toFixed(1),
        variance: derivedVar.toFixed(1),
        state: derivedState,
      }].slice(-1000));

    }, 200);
    return () => clearInterval(interval);
  }, [isPaused, isLiveMode, objectPresent, simPacketNum, rssi]);

  useEffect(() => {
    const generateSimAmps = () => {
      const baseSignal = objectPresent ? 15 : 28;
      const noiseLevel = simMotionState === "MOTION_DETECTED" ? 14 : objectPresent ? 5 : 3;

      return Array.from({ length: 64 }, (_, i) => {
        const idx = i - 32;
        if (idx === 0) return (objectPresent ? 65 : 85) + (Math.random() - 0.5) * 2;
        if (idx <= -28 || idx >= 28) return 5 + Math.random() * 4;
        const curve = Math.max(0, 1 - Math.abs(idx) / 28);
        return Math.max(2, baseSignal + curve * 8 + (Math.random() - 0.5) * noiseLevel);
      });
    };

    if (isPaused || isLiveMode) return;
    const interval = setInterval(() => setSimAmplitudes(generateSimAmps()), 120);
    return () => clearInterval(interval);
  }, [isPaused, objectPresent, isLiveMode, simMotionState]);

  // --- SOURCE RESOLUTION ---
  const activeAmplitudes = isLiveMode ? liveAmplitudes : simAmplitudes;
  const activePktNum = isLiveMode ? livePktNum : simPacketNum;
  const activeRssi = isLiveMode ? liveRssi : rssi;
  const activeMae = isLiveMode ? liveMae : simMae;
  const activeVariance = isLiveMode ? liveVariance : simVariance;
  const activeMotionState = isLiveMode ? liveMotionState : simMotionState;
  const activeTime = (isLiveMode && liveTime ? liveTime : simTime) || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatMotionState = (state) => String(state || "IDLE").replace(/_/g, " ");

  const getMotionStateType = (state) => {
    const normalizedState = String(state || "").toUpperCase();

    if (normalizedState.includes("MOTION")) return "motion";
    if (
      normalizedState.includes("STATIC") ||
      normalizedState.includes("OBSTACLE")
    ) {
      return "obstacle";
    }

    return "idle";
  };

  const activeMotionStateType = getMotionStateType(activeMotionState);

  const activeAgc = useMemo(() => {
    if (isLiveMode) return liveAgc;
    return Math.min(-40, Math.max(-120, Math.round(-96 - Math.round((rssi + 45) * 0.8))));
  }, [isLiveMode, liveAgc, rssi]);

  // --- REPORT GENERATOR (Native Browser Print PDF) ---
  const generatePDFReport = () => {
    const printWindow = window.open("", "_blank");
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Wi-Fi CSI Spatial Telemetry Report</title>
          <style>
            body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding: 30px; color: #0f172a; font-size: 12px; }
            .header { border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0 0 5px 0; font-size: 20px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta-box font { font-size: 10px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold; }
            .meta-box val { font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; font-size: 11px; }
            th { background-color: #f1f5f9; font-weight: bold; color: #475569; }
            .idle { color: #059669; font-weight: 600; }
            .motion { color: #dc2626; font-weight: 800; }
            .obstacle { color: #7c3aed; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Wi-Fi CSI Spatial Intelligence Report</h1>
            <span style="color: #64748b;">Generated natively from edge RAM cache &bull; ${new Date().toLocaleString()}</span>
          </div>
          <div class="meta-grid">
            <div class="meta-box"><font>Frames Retained</font><val>${historyBuffer.length} pkts</val></div>
            <div class="meta-box"><font>Session Start</font><val>${historyBuffer[0]?.timestamp || "N/A"}</val></div>
            <div class="meta-box"><font>Latest Signal (RSSI)</font><val>${activeRssi} dBm</val></div>
            <div class="meta-box"><font>Current State</font><val class="${activeMotionStateType}">${formatMotionState(activeMotionState)}</val></div>
          </div>
          <h3>Telemetry Audit Log (Latest 250 captures)</h3>
          <table>
            <thead>
              <tr><th>Timestamp</th><th>Packet #</th><th>RSSI</th><th>LNA Gain</th><th>Baseline Shift (MAE)</th><th>Volatility (&sigma;&sup2;)</th><th>Classification</th></tr>
            </thead>
            <tbody>
              ${historyBuffer.slice(-250).reverse().map((h) => `
                <tr>
                  <td>${h.timestamp}</td>
                  <td>#${h.pkt}</td>
                  <td>${h.rssi} dBm</td>
                  <td>${h.agc} dB</td>
                  <td>${h.mae}</td>
                  <td>${h.variance}</td>
                  <td class="${getMotionStateType(h.state)}">${formatMotionState(h.state)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- SVG AXIS & LAYOUT CONFIGURATION ---
  const width = 800;
  const height = 360;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 40;
  const paddingBottom = 65;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const magnitudeCeiling = useMemo(() => {
    const maxValue = Math.max(...activeAmplitudes.map((value) => Number(value) || 0), 0);
    if (maxValue <= 0) return 10;
    const padded = maxValue * 1.2;
    const step = padded <= 50 ? 10 : padded <= 150 ? 20 : 50;
    return Math.ceil(padded / step) * step;
  }, [activeAmplitudes]);

  const yTicks = useMemo(() => {
    const tickCount = 6;
    return Array.from({ length: tickCount + 1 }, (_, index) => Math.round((magnitudeCeiling / tickCount) * index));
  }, [magnitudeCeiling]);

  const yGridLines = useMemo(() => {
    return yTicks.map((val) => {
      const y = paddingTop + plotHeight - (val / magnitudeCeiling) * plotHeight;
      return { y, label: val.toString() };
    });
  }, [yTicks, paddingTop, plotHeight, magnitudeCeiling]);

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
    return xTicks.map((t) => ({ x: paddingLeft + (t.bin / 63) * plotWidth, label: t.label, isDC: t.bin === 32 }));
  }, [paddingLeft, plotWidth]);

  const pointsCoordinates = useMemo(() => {
    if (!activeAmplitudes || activeAmplitudes.length === 0) return [];
    return activeAmplitudes.map((amp, index) => {
      const x = paddingLeft + (index / (activeAmplitudes.length - 1 || 1)) * plotWidth;
      const boundedAmp = Math.min(Math.max(0, Number(amp) || 0), magnitudeCeiling);
      const y = paddingTop + plotHeight - (boundedAmp / magnitudeCeiling) * plotHeight;
      return { x, y, magnitude: Number(amp) || 0, subcarrierIndex: index - 32, arrayBin: index };
    });
  }, [activeAmplitudes, paddingLeft, paddingTop, plotWidth, plotHeight, magnitudeCeiling]);

  const svgPath = useMemo(() => {
    return pointsCoordinates.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [pointsCoordinates]);

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
      if (dist < minDist) { minDist = dist; closest = p; }
    });
    setHoveredPoint(closest);
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Detection Analysis</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">OFDM Packet Amplitude Spectrum &amp; Presence Heuristics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setIsLiveMode(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isLiveMode ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-white animate-pulse" : "bg-amber-300"}`} />
            LIVE STREAM ({connectionStatus})
          </button>

          <button
            onClick={() => setIsLiveMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isLiveMode ? "bg-cyan-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            MANUAL SIMULATOR
          </button>

          <button
            onClick={generatePDFReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-md hover:bg-rose-500 transition-all active:scale-95 ml-1"
          >
            📄 GENERATE PDF REPORT
          </button>
        </div>
      </div>

      {/* --- UPPER DECK: SUBCARRIER SPECTRUM PLOT --- */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isLiveMode ? "Hardware OFDM Subcarrier Frequency Plot" : "Simulated Frequency Plot"}
          </span>
          <span className="text-xs text-slate-400">Standard chart axes activated below</span>
        </div>

        <div
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="relative w-full aspect-[2.2/1] min-h-[280px] rounded-xl border p-2 overflow-hidden shadow-inner cursor-crosshair transition-colors"
          style={{ backgroundColor: chartBg, borderColor: isDarkMode ? "#1e293b" : "#e2e8f0" }}
        >
          <div className={`absolute top-4 left-4 z-10 border rounded-lg p-2.5 font-mono text-[10px] md:text-xs shadow-md ${
            isDarkMode ? "bg-[#020617]/95 border-emerald-400/30 text-emerald-400" : "bg-white/95 border-slate-200 text-slate-800"
          }`}>
            <div className="grid grid-cols-[80px_1fr] gap-x-1">
              <span>PACKET :</span> <span>#{activePktNum}</span>
              <span>RSSI :</span> <span>{activeRssi} dBm</span>
              <span>LNA AGC:</span> <span>{activeAgc} dB</span>
            </div>
          </div>

          {hoveredPoint && (
            <div className={`absolute bottom-12 right-4 z-20 border rounded-xl p-3 font-mono text-xs shadow-2xl pointer-events-none ${
              isDarkMode ? "bg-slate-900/95 border-emerald-500 text-emerald-300" : "bg-white/95 text-emerald-700 border-slate-300"
            }`}>
              <div className="font-bold text-[10px] text-slate-400 border-b border-slate-700/50 pb-1 mb-1.5 uppercase">Crosshair Inspector</div>
              <div>Subcarrier: <strong className="text-slate-900 dark:text-white">Index {hoveredPoint.subcarrierIndex > 0 ? `+${hoveredPoint.subcarrierIndex}` : hoveredPoint.subcarrierIndex}</strong></div>
              <div>Magnitude: <strong className="text-slate-900 dark:text-white">{hoveredPoint.magnitude.toFixed(2)}</strong></div>
            </div>
          )}

          <svg viewBox="0 0 800 360" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {yGridLines.map((line, i) => (
              <g key={`y-${i}`}>
                <line x1={paddingLeft} y1={line.y} x2={width - paddingRight} y2={line.y} stroke={gridColor} strokeWidth="0.8" strokeDasharray="4,4" />
                <text x={paddingLeft - 8} y={line.y + 3} textAnchor="end" fill={textColor} className="text-[10px] font-mono font-bold select-none">{line.label}</text>
              </g>
            ))}

            {xGridLines.map((line, i) => (
              <g key={`x-${i}`}>
                <line x1={line.x} y1={paddingTop} x2={line.x} y2={paddingTop + plotHeight} stroke={line.isDC ? dcNullColor : gridColor} strokeWidth={line.isDC ? "1.5" : "0.8"} strokeDasharray={line.isDC ? "3,3" : "4,4"} />
                <text x={line.x} y={paddingTop + plotHeight + 16} textAnchor="middle" fill={line.isDC ? (isDarkMode ? "#fbbf24" : "#d97706") : textColor} className={`text-[9px] font-mono select-none ${line.isDC ? "font-extrabold" : ""}`}>{line.label}</text>
              </g>
            ))}

            <rect x={paddingLeft} y={paddingTop} width={(3.75 / 63) * plotWidth} height={plotHeight} fill={guardBandFill} fillOpacity={0.3} stroke={guardBandStroke} />
            <rect x={paddingLeft + (59.25 / 63) * plotWidth} y={paddingTop} width={(3.75 / 63) * plotWidth} height={plotHeight} fill={guardBandFill} fillOpacity={0.3} stroke={guardBandStroke} />
            <rect x={paddingLeft} y={paddingTop} width={plotWidth} height={plotHeight} fill="none" stroke={isDarkMode ? "#334155" : "#cbd5e1"} strokeWidth="1.5" />
            <text transform={`rotate(-90 16 ${paddingTop + plotHeight / 2})`} x="16" y={paddingTop + plotHeight / 2} textAnchor="middle" fill={axisLabelColor} className="text-[11px] font-extrabold tracking-wider uppercase select-none">Magnitude 0 - {magnitudeCeiling}</text>
            <text x={paddingLeft + plotWidth / 2} y={paddingTop + plotHeight + 35} textAnchor="middle" fill={axisLabelColor} className="text-[11px] font-extrabold tracking-wider select-none">
              Subcarrier Frequency Index &nbsp;&nbsp;|&nbsp;&nbsp;<tspan className="text-emerald-600 dark:text-emerald-400 font-mono">LIVE TIMESTAMP: {activeTime}</tspan>
            </text>

            {hoveredPoint && (
              <>
                <line x1={hoveredPoint.x} y1={paddingTop} x2={hoveredPoint.x} y2={paddingTop + plotHeight} stroke={isDarkMode ? "#34d399" : "#059669"} strokeWidth="1" strokeDasharray="2,2" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill={isDarkMode ? "#10b981" : "#059669"} stroke="#ffffff" strokeWidth="2" />
              </>
            )}

            {svgPath && <path d={svgPath} fill="none" stroke={amplitudeCurveColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </div>
      </div>

      {/* --- LOWER DECK: HEURISTIC TELEMETRY & CLASSIFICATION HUD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {/* HUD 1: Decision Tree State */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classified Occupancy</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Decision Tree</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className={`w-4 h-4 rounded-full shrink-0 ${
              activeMotionStateType === "motion" ? "bg-red-500 animate-ping" : activeMotionStateType === "obstacle" ? "bg-purple-500" : "bg-emerald-500"
            }`} />
            <span className={`text-lg font-black tracking-tight ${
              activeMotionStateType === "motion" ? "text-red-600 dark:text-red-400 font-mono animate-pulse" : activeMotionStateType === "obstacle" ? "text-purple-600 dark:text-purple-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {formatMotionState(activeMotionState)}
            </span>
          </div>
        </div>

        {/* HUD 2: Mean Absolute Error */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baseline Shift (MAE)</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Static Geometry</span>
          </div>
          <div className="flex items-baseline justify-between mt-3 font-mono">
            <span className="text-2xl font-extrabold">{Number(activeMae).toFixed(1)}</span>
            <span className="text-xs text-slate-400">Trigger: &gt;5.0</span>
          </div>
        </div>

        {/* HUD 3: Temporal Volatility */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Temporal Volatility (&sigma;&sup2;)</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Active Multipath</span>
          </div>
          <div className="flex items-baseline justify-between mt-3 font-mono">
            <span className="text-2xl font-extrabold">{Number(activeVariance).toFixed(1)}</span>
            <span className="text-xs text-slate-400">Trigger: &gt;15.0</span>
          </div>
        </div>
      </div>

      {/* --- RAM ACTIVITY STRIP (The 60-Event Sliding Sparkline) --- */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Historical Activity Buffer (Last 60 Captures)</span>
          <span className="text-[10px] font-mono text-slate-400">{historyBuffer.length} / 1000 Frames Cached in RAM</span>
        </div>
        <div className="w-full h-8 bg-slate-100 dark:bg-slate-950 rounded-lg p-1 flex items-center gap-[2px] overflow-hidden border border-slate-200 dark:border-slate-800">
          {historyBuffer.length === 0 ? (
            <div className="w-full text-center text-[10px] font-mono text-slate-400">Awaiting first frame ingestion...</div>
          ) : (
            historyBuffer.slice(-60).map((item, idx) => (
              <div
                key={idx}
                title={`Pkt #${item.pkt} @ ${item.timestamp} | State: ${item.state} | MAE: ${item.mae} | Var: ${item.variance}`}
                className={`flex-1 h-full rounded-[2px] transition-all hover:opacity-75 cursor-pointer ${
                  getMotionStateType(item.state) === "motion" ? "bg-red-500 shadow-sm animate-pulse" : getMotionStateType(item.state) === "obstacle" ? "bg-purple-500" : "bg-emerald-500/40"
                }`}
              />
            ))
          )}
        </div>
      </div>

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
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Active Axis Matrix Packet #{activePktNum}</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">X = Subcarrier Index | Y = Calculated Mag</span>
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
                    <span className="font-mono font-bold">{val ? Number(val).toFixed(1) : "0.0"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-md max-w-4xl mx-auto w-full transition-opacity ${isLiveMode ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Simulator Controls</h4>
          {isLiveMode && <span className="text-xs text-amber-500 font-semibold">Click Manual Simulator above to unlock sliders</span>}
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="dist-detection" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transceiver Distance</label>
              <span className="text-sm font-mono font-bold">{Number(distance || 0).toFixed(1)} m</span>
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

          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all ${
              objectPresent ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-300 text-slate-800 dark:text-white"
            }`}
          >
            {objectPresent ? "Remove Path Obstruction" : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}