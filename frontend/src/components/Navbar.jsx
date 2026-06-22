import { useState } from "react";

export default function Navbar({ activeView, onViewChange, onSignOut }) {
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
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
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
            <h1 className="text-sm md:text-base font-bold text-slate-100 leading-none">
              Signal Quality Measurement System
            </h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Telemetry Dashboard
            </span>
          </div>
        </div>

        {/* Navigation Section Links */}
        <nav className="flex items-center bg-slate-950/60 p-1 border border-slate-850 rounded-xl">
          <button
            onClick={() => onViewChange("home")}
            className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              activeView === "home"
                ? "bg-slate-800 text-sky-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onViewChange("analysis")}
            className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              activeView === "analysis"
                ? "bg-slate-800 text-sky-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            Analysis
          </button>
        </nav>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOutClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 hover:border-transparent transition-all duration-250 active:scale-[0.98]"
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
      </header>

      {/* Custom Logout Confirmation Dialog/Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur overlay */}
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleCancelSignOut}
          />

          {/* Modal Content */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-scaleUp z-10">
            {/* Warning Icon */}
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

            <h3 className="text-lg md:text-xl font-bold text-slate-100 text-center mb-2">
              Confirm Sign Out
            </h3>
            <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
              Are you sure you want to end your current session? You will need to log in again to access the telemetry data.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCancelSignOut}
                className="flex-1 order-2 sm:order-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors duration-200 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="flex-1 order-1 sm:order-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-slate-950 font-bold text-sm transition-all duration-200 transform active:scale-[0.98] shadow-lg shadow-rose-500/10"
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
