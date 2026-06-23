import { useState } from "react";

export default function Register({
  onRegisterSuccess,
  onNavigateToLogin,
  isDarkMode,
  toggleDarkMode,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");

  const validate = () => {
    const tempErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/; // standard 10 digit number

    if (!name.trim()) {
      tempErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      tempErrors.name = "Name must be at least 2 characters";
    }

    if (!email) {
      tempErrors.email = "Email is required";
    } else if (emailRegex.test(email) === false) {
      tempErrors.email = "Please enter a valid email address";
    }

    if (!phone) {
      tempErrors.phone = "Phone number is required";
    } else if (phoneRegex.test(phone.replace(/[-+\s()]/g, "")) === false) {
      tempErrors.phone = "Phone number must be a 10-digit number";
    }

    if (!password) {
      tempErrors.password = "Password is required";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMsg("");

    if (!validate()) return;

    setSuccessMsg("Registration successful! Redirecting to login...");
    setTimeout(() => {
      onRegisterSuccess({ name, email, phone, password });
    }, 2000);
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
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/5 dark:bg-sky-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-400 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-pulse">
            <svg
              className="w-8 h-8 text-slate-950"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-center">
            Create Account
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
            Register to join the Signal Measurement network
          </p>
        </div>

        {/* Card Panel */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-2xl transition-colors">
          <form onSubmit={handleSubmit} className="space-y-5">
            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 animate-fadeIn">
                <svg
                  className="w-5 h-5 text-emerald-600 dark:text-emerald-450 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{successMsg}</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-100 pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 ${
                    errors.name ? "border-rose-500/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-rose-555 dark:text-rose-400 mt-1 font-medium">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-100 pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 ${
                    errors.email ? "border-rose-500/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-555 dark:text-rose-400 mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <input
                  id="phone"
                  type="text"
                  placeholder="1234567890"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-100 pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 ${
                    errors.phone ? "border-rose-500/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-rose-555 dark:text-rose-400 mt-1 font-medium">{errors.phone}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                  placeholder="•••••••• (Min 6 chars)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-100 pl-11 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-650 ${
                    errors.password ? "border-rose-500/50" : "border-slate-200 dark:border-slate-800"
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-555 dark:text-rose-400 mt-1 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-slate-950 font-bold rounded-xl transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
            >
              Sign Up
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-5 text-center">
            <span className="text-sm text-slate-400 dark:text-slate-500">Already have an account? </span>
            <button
              onClick={onNavigateToLogin}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-555 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors focus:outline-none"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
