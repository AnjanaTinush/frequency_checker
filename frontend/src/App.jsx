import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Detection from "./components/Detection";
import Rsi from "./components/Rsi";
import Subcarrier from "./components/Subcarrier";
import Analysis from "./components/Analysis";

function App() {
  // Routing & Authentication State (persisted in localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });

  const [view, setView] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true" ? "home" : "login";
  });

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("registeredUsers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Theme (default to false / light mode) & Play/Pause State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("isDarkMode");
    return saved !== null ? JSON.parse(saved) : false; // default to false (light mode)
  });
  const [isPaused, setIsPaused] = useState(false);

  // Apply dark mode class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

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
    if (isPaused) return;
    const id = setInterval(() => {
      setFreq((prev) => {
        const diff = targetFreq - prev;
        if (Math.abs(diff) < 0.0001) return targetFreq;
        return prev + diff * 0.15;
      });
    }, 30);
    return () => clearInterval(id);
  }, [targetFreq, isPaused]);

  // Helper to format timestamps for graphs
  const getFormattedTime = (date) => {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // RSSI drops with distance and with object obstruction (~20 dB through a body)
  const rssi = Math.round(
    -30 - 10 * 2.5 * Math.log10(Math.max(distance, 0.1)) - obstruction * 20
  );

  // Prepopulate history buffer with wiggling initial values for a populated graph
  const [historyBuffer, setHistoryBuffer] = useState(() => {
    const data = [];
    const now = new Date();
    for (let i = 50; i >= 0; i--) {
      const timeSecs = new Date(now.getTime() - i * 1500);
      const timeStr = getFormattedTime(timeSecs);

      const simRssi = Math.round(
        -30 - 10 * 2.5 * Math.log10(5) + (Math.random() - 0.5) * 4
      );

      const amplitudes = Array.from({ length: 30 }, (_, s) => {
        if (s === 0) return 50 + (Math.random() - 0.5) * 0.4;
        if (s === 1) return 15 + (Math.random() - 0.5) * 0.2;
        if (s === 2) return 0;
        if (s === 3 || s === 4) return 3 + Math.random() * 5;

        const base_s = 20 + (s % 5) * 2;
        return base_s + (Math.random() - 0.5) * 6;
      });

      data.push({
        time: timeStr,
        rssi: simRssi,
        amplitudes,
      });
    }
    return data;
  });

  // Dynamic updates to history buffers
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const timeStr = getFormattedTime(new Date());
      const noise = (Math.random() - 0.5) * 3;
      const currentRssi = Math.min(0, Math.max(-75, rssi + Math.round(noise)));

      const amplitudes = Array.from({ length: 30 }, (_, s) => {
        if (s === 0) return 50 + (Math.random() - 0.5) * 0.4;
        if (s === 1) return 15 + (Math.random() - 0.5) * 0.2;
        if (s === 2) return 0;
        if (s === 3 || s === 4) return 3 + Math.random() * 5;

        const base_s = 20 + (s % 5) * 2;
        if (objectPresent) {
          return Math.max(1, base_s - 8 + (Math.random() - 0.5) * 8);
        } else {
          const distanceGain = Math.max(0, (30 - distance) / 30) * 45;
          return Math.min(99, base_s + 10 + distanceGain + (Math.random() - 0.5) * 10);
        }
      });

      setHistoryBuffer((prev) => {
        const next = [...prev.slice(1), { time: timeStr, rssi: currentRssi, amplitudes }];
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPaused, rssi, objectPresent, distance]);

  const dropMHz = (BASE_FREQ - freq) * 1000;
  const freqDropped = dropMHz > 0.2;

  let quality = "Excellent";
  let qualityColor = "text-emerald-500 dark:text-emerald-400";
  if (rssi < -80) {
    quality = "Weak";
    qualityColor = "text-rose-500 dark:text-rose-400";
  } else if (rssi < -67) {
    quality = "Fair";
    qualityColor = "text-amber-500 dark:text-amber-400";
  } else if (rssi < -55) {
    quality = "Good";
    qualityColor = "text-sky-500 dark:text-sky-400";
  }

  // Login handler
  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");
    setView("home");
  };

  // Registration handler
  const handleRegisterSuccess = (newUser) => {
    setRegisteredUsers((prev) => {
      const next = [...prev, newUser];
      localStorage.setItem("registeredUsers", JSON.stringify(next));
      return next;
    });
    setView("login");
  };

  // Sign out handler
  const handleSignOut = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("isLoggedIn");
    setView("login");
  };

  // Theme toggler that persists selection
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("isDarkMode", JSON.stringify(next));
      return next;
    });
  };

  // Render Login and Registration Screens when not Authenticated
  if (!isLoggedIn) {
    if (view === "register") {
      return (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateToLogin={() => setView("login")}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      );
    }
    return (
      <Login
        onLogin={handleLogin}
        onNavigateToRegister={() => setView("register")}
        registeredUsers={registeredUsers}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  // Dashboard layout when Authenticated
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-x-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
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
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        isPaused={isPaused}
        togglePlayPause={() => setIsPaused(!isPaused)}
      />

      {/* Main Tab Render Views */}
      <div className="flex-1 flex flex-col">
        {view === "home" ? (
          <Home
            distance={distance}
            setDistance={setDistance}
            objectPresent={objectPresent}
            setObjectPresent={setObjectPresent}
            isPaused={isPaused}
            freq={freq}
            dropMHz={dropMHz}
            freqDropped={freqDropped}
            rssi={rssi}
            quality={quality}
            qualityColor={qualityColor}
          />
        ) : view === "detection" ? (
          <Detection
            rssi={rssi}
            distance={distance}
            setDistance={setDistance}
            objectPresent={objectPresent}
            setObjectPresent={setObjectPresent}
            isPaused={isPaused}
            isDarkMode={isDarkMode}
          />
        ) : view === "rsi" ? (
          <Rsi
            history={historyBuffer}
            distance={distance}
            setDistance={setDistance}
            objectPresent={objectPresent}
            setObjectPresent={setObjectPresent}
            isDarkMode={isDarkMode}
          />
        ) : view === "analysis" ? (
          <Analysis
            distance={distance}
            objectPresent={objectPresent}
          />
        ) : (
          <Subcarrier
            history={historyBuffer}
            distance={distance}
            setDistance={setDistance}
            objectPresent={objectPresent}
            setObjectPresent={setObjectPresent}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
}

export default App;