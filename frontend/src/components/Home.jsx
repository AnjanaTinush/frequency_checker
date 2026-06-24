import { useMemo, useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";

/* --- ESP32 board glyph --- */
function Esp32Board({ label, role, accent }) {
  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2">
      <div className="flex flex-col items-center -mb-1">
        <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${accent}`} />
        <div className="w-0.5 h-4 md:h-6 bg-slate-300 dark:bg-slate-700" />
      </div>
      <div className="relative w-20 h-14 md:w-32 md:h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center">
        <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="w-10 h-6 md:w-14 md:h-9 rounded-md bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <span className="text-[8px] md:text-[10px] font-mono text-slate-400 dark:text-slate-500">ESP32</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
          {role}
        </p>
      </div>
    </div>
  );
}

/* --- Metric tile --- */
function Metric({ label, value, unit, valueClass = "text-slate-800 dark:text-slate-200" }) {
  return (
    <div className="px-4 py-3 md:py-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-inner">
      <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`text-lg md:text-xl font-bold mt-1 font-mono ${valueClass}`}>
        {value}
        {unit && (
          <span className="text-xs font-sans font-normal text-slate-400 dark:text-slate-500"> {unit}</span>
        )}
      </p>
    </div>
  );
}

/* --- Status chip --- */
function StatusChip({ tone, dot, children }) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300 ring-amber-500/20",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-slate-500/20",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-300 ring-sky-500/20",
  };
  const dotTones = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    slate: "bg-slate-400",
    sky: "bg-sky-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${tones[tone]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotTones[tone]} ${tone !== "slate" ? "animate-pulse" : ""}`} />}
      {children}
    </span>
  );
}

export default function Home({
  distance,
  setDistance,
  objectPresent,
  setObjectPresent,
  isPaused,
  freq,
  dropMHz,
  freqDropped,
  rssi,
  quality,
  qualityColor,
}) {
  // --- LIVE PUSHER TELEMETRY (same channel/event contract as Detection/Rsi/Subcarrier) ---
  const [liveRssi, setLiveRssi] = useState(null);
  const [liveMotionState, setLiveMotionState] = useState(null);
  const [liveConnectionStatus, setLiveConnectionStatus] = useState("connecting...");
  const [isLiveMode, setIsLiveMode] = useState(true);

  const isPausedRef = useRef(isPaused);
  const isLiveModeRef = useRef(isLiveMode);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isLiveModeRef.current = isLiveMode; }, [isLiveMode]);

  useEffect(() => {
    const pusher = new Pusher("37eddc60d27348eb95f7", {
      cluster: "ap1",
      forceTLS: true,
    });

    pusher.connection.bind("state_change", (states) => {
      setLiveConnectionStatus(states.current);
    });

    pusher.connection.bind("error", () => {
      setLiveConnectionStatus("error");
    });

    const parseMaybeJson = (value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const channel = pusher.subscribe("csi-telemetry");

    channel.bind("live-batch", (data) => {
      if (isPausedRef.current || !isLiveModeRef.current) return;

      const parsedData = parseMaybeJson(data);
      const payload = parseMaybeJson(parsedData?.payload || parsedData?.data || parsedData);
      if (!payload) return;

      const samples =
        payload.samples ||
        payload.frames ||
        payload.readings ||
        (Array.isArray(payload) ? payload : [payload]);

      if (!samples || samples.length === 0) return;

      const newestSample = parseMaybeJson(samples[samples.length - 1]);
      if (!newestSample || typeof newestSample !== "object") return;

      const sampleRssi = newestSample.rssi;
      if (sampleRssi !== undefined && sampleRssi !== null) {
        setLiveRssi(Number(sampleRssi));
      }

      const motion = newestSample.motion || {};
      const motionState =
        motion.motion_state || motion.state || newestSample.motion_state || newestSample.state;
      if (motionState) {
        setLiveMotionState(String(motionState));
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("csi-telemetry");
      pusher.disconnect();
    };
    // Connect once; pause/live-mode are read live via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- SOURCE RESOLUTION (live Pusher data takes over from manual props when available) ---
  const activeRssi = isLiveMode && liveRssi !== null ? liveRssi : rssi;

  const liveObjectPresent = useMemo(() => {
    if (!isLiveMode || !liveMotionState) return null;
    const normalized = liveMotionState.toUpperCase();
    if (normalized.includes("STATIC") || normalized.includes("OBSTACLE")) return true;
    if (normalized.includes("IDLE")) return false;
    return null;
  }, [isLiveMode, liveMotionState]);

  const activeObjectPresent = liveObjectPresent !== null ? liveObjectPresent : objectPresent;

  const pulseColor = activeObjectPresent ? "bg-amber-400" : "bg-sky-400";
  const pulseGlow = activeObjectPresent
    ? "0 0 10px 3px rgba(251,191,36,0.8)"
    : "0 0 10px 3px rgba(56,189,248,0.8)";

  const linkTone = useMemo(() => {
    if (isPaused) return "slate";
    return activeObjectPresent ? "amber" : "emerald";
  }, [isPaused, activeObjectPresent]);

  return (
    <div className="flex-1 flex flex-col animate-fadeIn">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-6 flex flex-col gap-6">
        {/* --- Hero / status header --- */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="px-5 py-5 md:px-7 md:py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
                Live Link Monitor
              </p>
              <h2 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Signal Quality Measurement System
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Real-time visualization of the transmitter–receiver link, signal quality and the effect of
                obstructions on the propagation path.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsLiveMode(true)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition-all ${
                  isLiveMode
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20"
                    : "bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-slate-500/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    liveConnectionStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                  }`}
                />
                Live ESP32 ({liveConnectionStatus})
              </button>
              <button
                onClick={() => setIsLiveMode(false)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition-all ${
                  !isLiveMode
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 ring-sky-500/20"
                    : "bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-slate-500/20"
                }`}
              >
                Manual
              </button>
              <StatusChip tone={isPaused ? "slate" : "emerald"} dot>
                {isPaused ? "Stream Paused" : "Streaming Live"}
              </StatusChip>
              <StatusChip tone={activeObjectPresent ? "amber" : "sky"} dot={activeObjectPresent}>
                {activeObjectPresent ? "Path Obstructed" : "Clear Line-of-Sight"}
              </StatusChip>
            </div>
          </div>
        </div>

        {/* --- Link visualizer card --- */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950 shadow-sm">
          <main className="relative flex items-center justify-between min-h-[260px] md:min-h-[340px] px-4 md:px-[5vw] py-10">
            {/* transmitter + animated rings */}
            <div className="relative z-10">
              <div className="absolute left-1/2 top-2 md:top-3 -translate-x-1/2 pointer-events-none">
                {!isPaused &&
                  [0, 0.6, 1.2].map((delay, i) => (
                    <span
                      key={i}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                        activeObjectPresent ? "border-amber-500/70" : "border-sky-500/70"
                      }`}
                      style={{
                        width: "90px",
                        height: "90px",
                        animation: `pulseRing 1.8s ease-out ${delay}s infinite`,
                      }}
                    />
                  ))}
              </div>
              <Esp32Board label="B" role="Transmitter" accent="bg-sky-400" />
            </div>

            {/* connection line + distance + obstacle */}
            <div className="flex-1 mx-3 md:mx-8 relative">
              <div className="relative h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-visible transition-colors">
                {!isPaused && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${pulseColor}`}
                    style={{
                      animation: "travel 2.2s linear infinite",
                      boxShadow: pulseGlow,
                      opacity: activeObjectPresent ? 0.5 : 1,
                    }}
                  />
                )}
              </div>

              {/* distance badge */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-12">
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg transition-colors">
                  <span className="text-xs md:text-sm font-mono font-bold text-sky-600 dark:text-sky-400">
                    {distance.toFixed(1)} m
                  </span>
                </div>
              </div>

              {/* obstacle in the path */}
              {activeObjectPresent && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/35 flex items-center justify-center shadow-lg shadow-amber-500/5">
                    <span className="text-[9px] md:text-[10px] font-bold text-amber-500 dark:text-amber-400 tracking-wider">
                      OBSTACLE
                    </span>
                  </div>
                  <span className="mt-1.5 text-[9px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-widest">
                    blocking path
                  </span>
                </div>
              )}
            </div>

            {/* receiver */}
            <div className="relative z-10">
              <Esp32Board label="A" role="Receiver" accent="bg-emerald-400" />
            </div>
          </main>
        </div>

        {/* --- Live metrics strip --- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <Metric label="RSSI" value={activeRssi} unit="dBm" />
          <Metric label="Frequency" value={freq} unit="MHz" />
          <Metric
            label="Freq Drop"
            value={freqDropped ? `-${dropMHz}` : "0"}
            unit="MHz"
            valueClass={freqDropped ? "text-amber-500 dark:text-amber-400" : undefined}
          />
          <Metric label="Link Quality" value={quality} valueClass={qualityColor} />
        </div>

        {/* --- Controls --- */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm px-4 md:px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Link Controls</h4>
            <span className="text-xs font-mono text-slate-400">
              {isLiveMode ? "Live ESP32 telemetry" : "Simulated environment"}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
            {/* distance control */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="dist"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  Transceiver Distance
                </label>
                <span className="text-sm font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {distance.toFixed(1)} m
                </span>
              </div>
              <input
                id="dist"
                type="range"
                min="0.5"
                max="30"
                step="0.5"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
                className="w-full accent-sky-500 bg-slate-200 dark:bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* obstacle toggle */}
            <button
              onClick={() => setObjectPresent((v) => !v)}
              disabled={isLiveMode && liveObjectPresent !== null}
              className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                isLiveMode && liveObjectPresent !== null ? "opacity-50 cursor-not-allowed" : ""
              } ${
                activeObjectPresent
                  ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-200 border-transparent text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {activeObjectPresent ? "Remove obstacle" : "Place obstacle"}
            </button>
          </div>
          {isLiveMode && liveObjectPresent !== null && (
            <p className="mt-3 text-[11px] font-semibold text-amber-500">
              Obstacle state is being driven by live ESP32 telemetry. Switch to Manual to override.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}