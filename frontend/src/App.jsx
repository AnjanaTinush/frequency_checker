import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Navbar from "./components/Navbar";
import Analysis from "./components/Analysis";

function Esp32Board({ label, role, accent }) {
  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2">
      <div className="flex flex-col items-center -mb-1">
        <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${accent}`} />
        <div className="w-0.5 h-4 md:h-6 bg-slate-700" />
      </div>
      <div className="relative w-20 h-14 md:w-32 md:h-20 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center">
        <div className="absolute inset-0 m-1 rounded-lg border border-slate-800/60" />
        <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-800" />
        <div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-800" />
        <div className="w-10 h-6 md:w-14 md:h-9 rounded-md bg-slate-950 flex items-center justify-center">
          <span className="text-[8px] md:text-[10px] font-mono text-slate-500">ESP32</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs md:text-sm font-bold text-slate-200">{label}</p>
        <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{role}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, unit, valueClass = "text-slate-200" }) {
  return (
    <div className="px-4 py-3 md:py-3.5 rounded-xl bg-slate-950/60 border border-slate-850 shadow-inner">
      <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg md:text-xl font-bold mt-1 font-mono ${valueClass}`}>
        {value}
        {unit && <span className="text-xs font-sans font-normal text-slate-500"> {unit}</span>}
      </p>
    </div>
  );
}

function App() {
  // Routing & Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState("login");
  const [registeredUsers, setRegisteredUsers] = useState([]);

  // Telemetry Simulator State
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

  // Frequency history buffer for live graphs
  const [frequencyHistory, setFrequencyHistory] = useState(
    Array(50).fill(2.4)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFrequencyHistory((prev) => {
        const next = [...prev.slice(1), freq];
        return next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [freq]);

  const dropMHz = (BASE_FREQ - freq) * 1000;
  const freqDropped = dropMHz > 0.2;

  // RSSI drops with distance and with object obstruction (~20 dB through a body)
  const rssi = Math.round(
    -30 - 10 * 2.5 * Math.log10(Math.max(distance, 0.1)) - obstruction * 20
  );

  let quality = "Excellent";
  let qualityColor = "text-emerald-400";
  if (rssi < -80) {
    quality = "Weak";
    qualityColor = "text-rose-450";
  } else if (rssi < -67) {
    quality = "Fair";
    qualityColor = "text-amber-400";
  } else if (rssi < -55) {
    quality = "Good";
    qualityColor = "text-sky-400";
  }

  const pulseColor = objectPresent ? "bg-amber-400" : "bg-sky-400";
  const pulseGlow = objectPresent
    ? "0 0 10px 3px rgba(251,191,36,0.8)"
    : "0 0 10px 3px rgba(56,189,248,0.8)";

  // Registration handler
  const handleRegisterSuccess = (newUser) => {
    setRegisteredUsers((prev) => [...prev, newUser]);
    setView("login");
  };

  // Sign out handler
  const handleSignOut = () => {
    setIsLoggedIn(false);
    setView("login");
  };

  // Render Login and Registration Screens when not Authenticated
  if (!isLoggedIn) {
    if (view === "register") {
      return (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateToLogin={() => setView("login")}
        />
      );
    }
    return (
      <Login
        onLogin={() => {
          setIsLoggedIn(true);
          setView("home");
        }}
        onNavigateToRegister={() => setView("register")}
        registeredUsers={registeredUsers}
      />
    );
  }

  // Dashboard layout when Authenticated
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 font-sans overflow-x-hidden text-slate-100">
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.2s ease-out forwards;
        }
      `}</style>

      {/* Shared Navbar */}
      <Navbar
        activeView={view}
        onViewChange={setView}
        onSignOut={handleSignOut}
      />

      {/* Main Tab Render Views */}
      <div className="flex-1 flex flex-col">
        {view === "home" ? (
          <div className="flex-1 flex flex-col animate-fadeIn">
            {/* telemetry visualizer path */}
            <main className="flex-1 min-h-[280px] md:min-h-[360px] relative flex items-center justify-between px-4 md:px-[6vw] py-8 bg-slate-950">
              {/* transmitter with animated rings */}
              <div className="relative z-10">
                <div className="absolute left-1/2 top-2 md:top-3 -translate-x-1/2 pointer-events-none">
                  {[0, 0.6, 1.2].map((delay, i) => (
                    <span
                      key={i}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                        objectPresent ? "border-amber-550/70" : "border-sky-500/70"
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
                <div className="relative h-0.5 bg-slate-800 rounded-full overflow-visible">
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${pulseColor}`}
                    style={{
                      animation: "travel 2.2s linear infinite",
                      boxShadow: pulseGlow,
                      opacity: objectPresent ? 0.5 : 1,
                    }}
                  />
                </div>

                {/* distance badge */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-12">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-850 shadow-lg">
                    <span className="text-xs md:text-sm font-mono font-bold text-sky-450">
                      {distance.toFixed(1)} m
                    </span>
                  </div>
                </div>

                {/* the object sitting in the signal path */}
                {objectPresent && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center shadow-lg shadow-amber-550/5">
                      <span className="text-[9px] md:text-[10px] font-bold text-amber-400 tracking-wider">OBSTACLE</span>
                    </div>
                    <span className="mt-1.5 text-[9px] font-semibold text-amber-400 uppercase tracking-widest">blocking path</span>
                  </div>
                )}
              </div>

              {/* receiver */}
              <div className="relative z-10">
                <Esp32Board label="ESP32 #2" role="Receiver" accent="bg-emerald-400" />
              </div>
            </main>

            {/* telemetry stats & controller */}
            <footer className="shrink-0 bg-slate-900/40 border-t border-slate-900 pb-8">
              {/* responsive metric grid */}
              <div className="px-4 md:px-8 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-7xl mx-auto w-full">
                <Metric label="Distance" value={distance.toFixed(1)} unit="m" />
                <Metric
                  label="Frequency"
                  value={freq.toFixed(4)}
                  unit="GHz"
                  valueClass={`font-mono ${freqDropped ? "text-amber-450" : "text-sky-450"}`}
                />
                <Metric
                  label="Frequency drop"
                  value={`-${dropMHz.toFixed(2)}`}
                  unit="MHz"
                  valueClass={`font-mono ${freqDropped ? "text-amber-450" : "text-slate-500"}`}
                />
                <Metric label="Est. RSSI" value={rssi} unit="dBm" />
                <Metric label="Link quality" value={quality} valueClass={qualityColor} />
              </div>

              <div className="px-4 md:px-8 py-5 border-t border-slate-900 flex flex-col md:flex-row md:items-end gap-5 md:gap-10 max-w-4xl mx-auto w-full">
                {/* distance control */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="dist" className="text-xs font-semibold text-slate-450 uppercase tracking-wider">
                      Transceiver Distance
                    </label>
                    <span className="text-sm font-mono text-slate-300 font-semibold">{distance.toFixed(1)} m</span>
                  </div>
                  <input
                    id="dist"
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
                      ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-550/20"
                      : "bg-slate-800 border-slate-800 text-slate-105 hover:bg-slate-700"
                  }`}
                >
                  {objectPresent ? "Remove obstacle" : "Place obstacle"}
                </button>
              </div>
            </footer>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-fadeIn">
            <Analysis
              history={frequencyHistory}
              distance={distance}
              setDistance={setDistance}
              objectPresent={objectPresent}
              setObjectPresent={setObjectPresent}
            />
          </div>
        )}
      </div>
      </div>
  );
}

export default App;