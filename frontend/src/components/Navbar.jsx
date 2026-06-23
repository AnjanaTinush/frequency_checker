import { useState } from "react";

export default function Navbar({
  activeView,
  onViewChange,
  onSignOut,
  isDarkMode,
  toggleDarkMode,
  isPaused,
  togglePlayPause,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSignOutClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSignOut = () => {
    setShowConfirmModal(false);
    onSignOut();
  };

  const handleCancelSignOut = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-md shadow-sky-500/10">
            <svg
              className="w-5 h-5 text-slate-950"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold leading-none">
              Signal Quality Measurement System
            </h1>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Telemetry Dashboard
            </span>
          </div>
        </div>

        {/* Navigation Section Links */}
        <nav className="flex items-center bg-slate-100 dark:bg-slate-950/60 p-1 border border-slate-200 dark:border-slate-850 rounded-xl transition-colors">
          <button
            onClick={() => onViewChange("home")}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              activeView === "home"
                ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-250 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onViewChange("detection")}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              activeView === "detection"
                ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-250 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            Detection
          </button>
          <button
            onClick={() => onViewChange("rsi")}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              activeView === "rsi"
                ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-250 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            RSSI
          </button>
          <button
            onClick={() => onViewChange("subcarrier")}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              activeView === "subcarrier"
                ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-250 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
            }`}
          >
            Subcarrier
          </button>
        </nav>

        {/* Action Controls Section */}
        <div className="flex items-center gap-2">
          {/* Play / Pause Toggle Button */}
          <button
            onClick={togglePlayPause}
            title={isPaused ? "Play Simulation" : "Pause Simulation"}
            className={`p-2 rounded-lg border transition-all active:scale-95 flex items-center justify-center ${
              isPaused
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-450 hover:bg-amber-500/20"
            }`}
          >
            {isPaused ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>

          {/* Theme Toggle Button (Light/Dark Mode) */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-lg border border-slate-250 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all duration-200 active:scale-95 flex items-center justify-center"
          >
            {isDarkMode ? (
              // Sun Icon
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ) : (
              // Moon Icon
              <svg className="w-4 h-4 text-indigo-650" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOutClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-slate-950 hover:border-transparent transition-all duration-250 active:scale-[0.98]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Custom Logout Confirmation Dialog/Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleCancelSignOut}
          />

          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-scaleUp z-10 text-slate-900 dark:text-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500 mb-5 mx-auto">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <h3 className="text-lg md:text-xl font-bold text-center mb-2">
              Confirm Sign Out
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Are you sure you want to end your current session? You will need to log in again to access the telemetry data.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCancelSignOut}
                className="flex-1 order-2 sm:order-1 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="flex-1 order-1 sm:order-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-650 hover:from-rose-600 hover:to-red-700 text-white font-bold text-sm transition-all duration-200 transform active:scale-[0.98] shadow-lg shadow-rose-500/10"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
