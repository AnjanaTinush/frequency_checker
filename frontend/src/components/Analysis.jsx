import { useState } from "react";

const commonReasons = [
  {
    reason: "Physical Obstruction",
    description:
      "Solid objects such as concrete walls, metal structures, furniture and human bodies absorb or reflect RF signals causing attenuation.",
  },
  {
    reason: "Multipath Propagation",
    description:
      "Multiple reflected versions of the transmitted signal arrive at the receiver with different delays, causing destructive interference and fading.",
  },
  {
    reason: "Electromagnetic Interference (EMI)",
    description:
      "Electrical equipment, motors, transformers and electronic devices generate unwanted electromagnetic noise affecting signal quality.",
  },
  {
    reason: "Radio Frequency Interference (RFI)",
    description:
      "Signals from nearby wireless devices operating within similar frequency bands interfere with the intended transmission.",
  },
  {
    reason: "Signal Attenuation",
    description:
      "Natural reduction in signal power due to propagation distance, absorption and transmission medium losses.",
  },
  {
    reason: "Environmental Conditions",
    description:
      "Rain, humidity, fog and atmospheric disturbances can degrade certain wireless frequencies.",
  },
  {
    reason: "Channel Congestion",
    description:
      "Multiple devices sharing the same communication channel increase collisions and packet loss.",
  },
  {
    reason: "Frequency Overlap",
    description:
      "Overlapping frequency channels introduce interference and decrease communication reliability.",
  },
];

const mitigationGroups = [
  {
    id: "broadcasting",
    title: "A. Signal Broadcasting",
    subtitle: "Recommended Engineering Practices",
    accent: "from-cyan-500 to-sky-500",
    border: "border-cyan-500/35",
    text: "text-cyan-500 dark:text-cyan-300",
    items: [
      "Increase transmitter output power within regulatory limits",
      "Optimize antenna height for improved line-of-sight",
      "Employ high-gain directional antennas",
      "Perform antenna impedance matching (50 ohm)",
      "Minimize unnecessary transmission distance",
      "Regular calibration of RF equipment",
    ],
  },
  {
    id: "fm",
    title: "B. FM Signal Transmission",
    subtitle: "Signal Optimization Techniques",
    accent: "from-fuchsia-500 to-purple-500",
    border: "border-fuchsia-500/35",
    text: "text-fuchsia-500 dark:text-fuchsia-300",
    items: [
      "Select interference-free carrier frequency",
      "Install antennas above surrounding obstacles",
      "Use RF Band-Pass Filters",
      "Reduce adjacent channel interference",
      "Use high-quality coaxial transmission lines",
    ],
  },
  {
    id: "wifi",
    title: "C. Wi-Fi Communication",
    subtitle: "Performance Improvement Measures",
    accent: "from-amber-500 to-orange-500",
    border: "border-amber-500/35",
    text: "text-amber-500 dark:text-amber-300",
    items: [
      "Use dual-band or tri-band access points",
      "Position Access Point centrally",
      "Avoid microwave ovens and cordless phones",
      "Minimize wall and metal obstructions",
      "Maintain firmware updates",
      "Reduce network congestion",
      "Install Wi-Fi Repeaters or Mesh Systems",
      "Monitor RSSI and SNR values continuously",
    ],
  },
  {
    id: "bluetooth",
    title: "D. Bluetooth Communication",
    subtitle: "Reliability Enhancement Methods",
    accent: "from-blue-500 to-indigo-500",
    border: "border-blue-500/35",
    text: "text-blue-500 dark:text-blue-300",
    items: [
      "Maintain communication within recommended range",
      "Reduce physical obstructions",
      "Utilize Adaptive Frequency Hopping (AFH)",
      "Maintain direct Line-of-Sight whenever possible",
      "Optimize antenna placement",
    ],
  },
];

const technicalTerms = [
  "RSSI",
  "SNR",
  "BER",
  "PER",
  "Path Loss",
  "Link Budget",
  "RF Attenuation",
  "Multipath Fading",
  "Fresnel Zone",
  "EMI",
  "RFI",
  "VSWR",
  "Antenna Gain",
  "Channel Utilization",
  "Packet Collision",
  "Adaptive Frequency Hopping",
  "OFDM",
  "QoS",
];

export default function Analysis({ distance, objectPresent }) {
  const [openPanels, setOpenPanels] = useState({
    broadcasting: true,
    fm: true,
    wifi: true,
    bluetooth: true,
  });

  const togglePanel = (id) => {
    setOpenPanels((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 px-4 md:px-8 py-6 transition-colors">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="relative px-5 py-5 md:px-7 md:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">
                  Signal Drop Analysis
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
                  Signal Drop Analysis & Prevention
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  This module explains common reasons for wireless signal degradation and the engineering practices used to reduce signal loss.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    objectPresent
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  }`}
                >
                  {objectPresent ? "Signal Drop Detected" : "No Signal Drop"}
                </span>
                {typeof distance === "number" && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    Distance: {distance.toFixed(1)} m
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.25fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
                  Section 1
                </p>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Common Reasons for Signal Drop
                </h3>
              </div>
              <div className="rounded-xl bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-300">
                {commonReasons.length} Reasons
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-[52px_1fr_1.8fr] bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-800">No</div>
                <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-800">Reason</div>
                <div className="px-3 py-3">Technical Description</div>
              </div>

              {commonReasons.map((item, index) => (
                <div
                  key={item.reason}
                  className="grid grid-cols-[52px_1fr_1.8fr] border-t border-slate-200 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"
                >
                  <div className="border-r border-slate-200 px-3 py-3 font-black text-cyan-600 dark:border-slate-800 dark:text-cyan-300">
                    {index + 1}
                  </div>
                  <div className="border-r border-slate-200 px-3 py-3 font-bold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                    {item.reason}
                  </div>
                  <div className="px-3 py-3 leading-5">{item.description}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                Section 2
              </p>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Precaution & Mitigation Techniques
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {mitigationGroups.map((group) => {
                const isOpen = openPanels[group.id];

                return (
                  <div
                    key={group.id}
                    className={`overflow-hidden rounded-2xl border ${group.border} bg-slate-50 dark:bg-slate-950/50`}
                  >
                    <button
                      type="button"
                      onClick={() => togglePanel(group.id)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${group.accent} text-white shadow-lg`}>
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M4.93 12.99a10 10 0 0114.14 0M1.394 9.393a15 15 0 0121.213 0" />
                          </svg>
                        </div>
                        <div>
                          <h4 className={`text-sm font-black ${group.text}`}>{group.title}</h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {group.subtitle}
                          </p>
                        </div>
                      </div>

                      <svg
                        className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
                        <ul className="space-y-2.5">
                          {group.items.map((item) => (
                            <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-600 dark:text-emerald-300">
                                ✓
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">
            Advanced Technical Terms
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {technicalTerms.map((term) => (
              <span
                key={term}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
              >
                {term}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
