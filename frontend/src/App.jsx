import { useState, useEffect } from "react";

// ESP32 WiFi ranging visualizer — responsive, full screen
// Two ESP32 nodes with an animated WiFi signal. Placing an object between them
// obstructs the path, simulating a frequency drop (shown with decimals).

function Esp32Board({ label, role, accent }) {
  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2">
      <div className="flex flex-col items-center -mb-1">
        <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${accent}`} />
        <div className="w-0.5 h-4 md:h-6 bg-slate-500" />
      </div>
      <div className="relative w-20 h-14 md:w-32 md:h-20 rounded-md bg-slate-800 border border-slate-600 shadow-lg flex items-center justify-center">
        <div className="absolute inset-0 m-1.5 md:m-2 rounded-sm border border-slate-700" />
        <div className="absolute top-1 left-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-600" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-600" />
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-600" />
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-600" />
        <div className="w-10 h-6 md:w-14 md:h-9 rounded-sm bg-slate-900 flex items-center justify-center">
          <span className="text-[8px] md:text-[10px] font-mono text-slate-400">ESP32</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs md:text-sm font-semibold text-slate-100">{label}</p>
        <p className="text-[9px] md:text-[11px] uppercase tracking-wider text-slate-500">{role}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, valueClass = "text-slate-800" }) {
  return (
    <div className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-slate-50 border border-slate-200">
      <p className="text-[11px] md:text-xs text-slate-500">{label}</p>
      <p className={`text-lg md:text-2xl font-semibold ${valueClass}`}>
        {value}
        {unit && <span className="text-xs md:text-base font-sans font-normal text-slate-400"> {unit}</span>}
      </p>
    </div>
  );
}

function App() {
  const [distance, setDistance] = useState(5);
  const [objectPresent, setObjectPresent] = useState(false);

  const BASE_FREQ = 2.4; // GHz
  const MAX_DROP = 0.026; // GHz simulated drop when an object blocks the path
  const obstruction = objectPresent ? 1 : 0;
  const targetFreq = BASE_FREQ - obstruction * MAX_DROP;

  // smoothly animate the displayed frequency toward the target
  const [freq, setFreq] = useState(BASE_FREQ);
  useEffect(() => {
    const id = setInterval(() => {
      setFreq((prev) => {
        const diff = targetFreq - prev;
        if (Math.abs(diff) < 0.0001) return targetFreq;
        return prev + diff * 0.15;
      });
    }, 30);
    return () => clearInterval(id);
  }, [targetFreq]);

  const dropMHz = (BASE_FREQ - freq) * 1000;
  const freqDropped = dropMHz > 0.2;

  // RSSI drops with distance and with object obstruction (~20 dB through a body)
  const rssi = Math.round(
    -30 - 10 * 2.5 * Math.log10(Math.max(distance, 0.1)) - obstruction * 20
  );

  let quality = "Excellent";
  let qualityColor = "text-emerald-500";
  if (rssi < -80) {
    quality = "Weak";
    qualityColor = "text-rose-500";
  } else if (rssi < -67) {
    quality = "Fair";
    qualityColor = "text-amber-500";
  } else if (rssi < -55) {
    quality = "Good";
    qualityColor = "text-sky-500";
  }

  const pulseColor = objectPresent ? "bg-amber-300" : "bg-sky-300";
  const pulseGlow = objectPresent
    ? "0 0 10px 3px rgba(252,211,77,0.8)"
    : "0 0 10px 3px rgba(125,211,252,0.8)";

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-900 font-sans overflow-x-hidden">
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes travel {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>

      {/* header */}
      <header className="shrink-0 px-5 md:px-8 py-4 md:py-5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base md:text-xl font-bold text-slate-800">WiFi ranging monitor</h1>
          <p className="text-xs md:text-sm text-slate-500">Live signal between two ESP32 nodes</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-emerald-600 shrink-0">
          <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500" />
          Linked
        </span>
      </header>

      {/* visualization fills remaining space */}
      <main className="flex-1 min-h-[260px] md:min-h-[340px] relative flex items-center justify-between px-4 md:px-[6vw] py-6 bg-slate-900">
        {/* transmitter with animated rings */}
        <div className="relative z-10">
          <div className="absolute left-1/2 top-2 md:top-3 -translate-x-1/2 pointer-events-none">
            {[0, 0.6, 1.2].map((delay, i) => (
              <span
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  objectPresent ? "border-amber-400/70" : "border-sky-400"
                }`}
                style={{
                  width: "90px",
                  height: "90px",
                  animation: `pulseRing 1.8s ease-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
          <Esp32Board label="ESP32 #1" role="Transmitter" accent="bg-sky-400" />
        </div>

        {/* connection line + distance + object */}
        <div className="flex-1 mx-3 md:mx-8 relative">
          <div className="relative h-0.5 bg-slate-700 rounded-full overflow-visible">
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${pulseColor}`}
              style={{
                animation: "travel 2.2s linear infinite",
                boxShadow: pulseGlow,
                opacity: objectPresent ? 0.5 : 1,
              }}
            />
          </div>

          {/* distance badge */}
          <div className="absolute left-1/2 -translate-x-1/2  md:-top-28">
            <div className="px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-slate-800 border border-slate-600">
              <span className="text-sm md:text-base font-mono font-semibold text-sky-300">
                {distance.toFixed(1)} m
              </span>
            </div>
          </div>

          {/* the object sitting in the signal path */}
          {objectPresent && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-amber-500/90 border border-amber-300 flex items-center justify-center">
                <span className="text-[9px] md:text-[10px] font-semibold text-amber-950">OBJECT</span>
              </div>
              <span className="mt-1 text-[10px] md:text-[11px] text-amber-300">blocking path</span>
            </div>
          )}
        </div>

        {/* receiver */}
        <div className="relative z-10">
          <Esp32Board label="ESP32 #2" role="Receiver" accent="bg-emerald-400" />
        </div>
      </main>

      {/* footer: readouts + controls */}
      <footer className="shrink-0 bg-white border-t border-slate-200">
        {/* responsive metric grid: 2 cols on mobile, 5 on desktop */}
        <div className="px-4 md:px-8 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Metric label="Distance" value={distance.toFixed(1)} unit="m" />
          <Metric
            label="Frequency"
            value={freq.toFixed(4)}
            unit="GHz"
            valueClass={`font-mono ${freqDropped ? "text-amber-500" : "text-slate-800"}`}
          />
          <Metric
            label="Frequency drop"
            value={`-${dropMHz.toFixed(2)}`}
            unit="MHz"
            valueClass={`font-mono ${freqDropped ? "text-amber-500" : "text-slate-400"}`}
          />
          <Metric label="Est. RSSI" value={rssi} unit="dBm" />
          <Metric label="Link quality" value={quality} valueClass={qualityColor} />
        </div>

        <div className="px-4 md:px-8 py-5 border-t border-slate-200 flex flex-col md:flex-row md:items-end gap-5 md:gap-10 max-w-4xl mx-auto w-full">
          {/* distance control */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="dist" className="text-sm font-medium text-slate-700">
                Distance between devices
              </label>
              <span className="text-sm font-mono text-slate-500">{distance.toFixed(1)} m</span>
            </div>
            <input
              id="dist"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
              className="w-full accent-sky-500"
            />
          </div>

          {/* place object button */}
          <button
            onClick={() => setObjectPresent((v) => !v)}
            className={`shrink-0 text-sm font-medium px-5 py-2.5 rounded-lg border transition-colors ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
                : "bg-slate-800 border-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {objectPresent ? "Remove object" : "Place object"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;