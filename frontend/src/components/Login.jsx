import { useState } from "react";

export default function Login({
  onLogin,
  onNavigateToRegister,
  registeredUsers,
  isDarkMode,
  toggleDarkMode,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const validate = () => {
    const tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      tempErrors.email = "Email is required";
    } else if (emailRegex.test(email) === false) {
      tempErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      tempErrors.password = "Password is required";
    } else if (password.length < 4) {
      tempErrors.password = "Password must be at least 4 characters";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError("");
    
    if (!validate()) return;

    const matchedUser = (registeredUsers || []).find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if ((email === "admin@gmail.com" && password === "Test@123") || matchedUser) {
      onLogin();
    } else {
      setSubmitError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-12 relative overflow-hidden select-none transition-colors duration-200">
      
      {/* Theme Toggle Button in Top-Right of page */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
        >
          {isDarkMode ? (
            // Sun Icon
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ) : (
            // Moon Icon
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </button>
      </div>

      {/* Decorative ambient background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/5 dark:bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-4 animate-pulse">
            <svg
              className="w-8 h-8 text-slate-950 font-bold"
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
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-center">
            Signal Quality System
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
            Sign in to access real-time node telemetry
          </p>
        </div>

        {/* Card Panel */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-2xl transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 animate-fadeIn">
                <svg
                  className="w-5 h-5 text-rose-550 dark:text-rose-450 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">{submitError}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 ${
                    errors.email ? "border-rose-500/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-555 dark:text-rose-400 mt-1.5 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-100 pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 ${
                    errors.password ? "border-rose-500/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-555 dark:text-rose-400 mt-1.5 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20"
            >
              Sign In
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-slate-400 dark:text-slate-500">Don't have an account? </span>
            <button
              onClick={onNavigateToRegister}
              className="text-sm font-semibold text-sky-605 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 transition-colors focus:outline-none"
            >
              Register Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
