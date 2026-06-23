import { useEffect, useMemo, useState } from "react";
import Pusher from "pusher-js";

export default function Rsi({
  history = [],
  distance = 0,
  setDistance,
  objectPresent,
  setObjectPresent,
  isDarkMode,
}) {
  const [liveHistory, setLiveHistory] = useState([]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [latestPusherData, setLatestPusherData] = useState(null);

  useEffect(() => {
    Pusher.logToConsole = true;

    const pusherKey =
      import.meta.env.VITE_PUSHER_KEY || "37eddc60d27348eb95f7";
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || "ap1";

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      forceTLS: true,
    });

    pusher.connection.bind("state_change", (states) => {
      console.log("Pusher connection state:", states);
      setConnectionStatus(states.current);
    });

    pusher.connection.bind("connected", () => {
      console.log("Pusher connected successfully");
    });

    pusher.connection.bind("error", (error) => {
      console.error("Pusher connection error:", error);
      setConnectionStatus("error");
    });

    const channel = pusher.subscribe("wifi-sensing-channel");

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("Subscribed to wifi-sensing-channel");
    });

    channel.bind("pusher:subscription_error", (error) => {
      console.error("Pusher subscription error:", error);
    });

    channel.bind("csi-update", (data) => {
      console.log("Pusher csi-update data:", data);

      setLatestPusherData(data);

      const packet = data?.payload || data?.data || data || {};
      const samples = Array.isArray(packet?.samples)
        ? packet.samples
        : [packet];

      const nextItems = samples
        .filter((sample) => sample?.rssi !== undefined && sample?.rssi !== null)
        .map((sample) => {
          const timeObj = sample?.timestamp
            ? new Date(sample.timestamp)
            : packet?.timestamp
              ? new Date(packet.timestamp)
              : data?.timestamp
                ? new Date(data.timestamp)
                : new Date();

          const timeString = timeObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return {
            rssi: Number(sample.rssi),
            time: timeString,
          };
        });

      if (nextItems.length > 0) {
        setLiveHistory((prev) => {
          const next = [...prev, ...nextItems];
          return next.length > 40 ? next.slice(next.length - 40) : next;
        });
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("wifi-sensing-channel");
      pusher.disconnect();
    };
  }, []);

  const defaultData = useMemo(() => {
    const timeString = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return [
      {
        rssi: 0,
        time: timeString,
      },
    ];
  }, []);

  const displayData =
    isLiveMode && liveHistory.length > 0
      ? liveHistory
      : history && history.length > 0
        ? history
        : defaultData;

  const graphData = useMemo(() => {
    const width = 800;
    const height = 360;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 50;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const values = displayData
      .map((item) => Number(item.rssi ?? 0))
      .filter((value) => Number.isFinite(value));

    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(0, ...values);

    const rawRange = Math.max(10, maxValue - minValue);
    const padding = rawRange * 0.15;

    const niceStep = (range) => {
      if (range <= 10) return 2;
      if (range <= 25) return 5;
      if (range <= 50) return 10;
      if (range <= 100) return 20;
      if (range <= 250) return 50;
      return 100;
    };

    const step = niceStep(rawRange);
    const yMin = Math.floor((minValue - padding) / step) * step;
    const yMax = Math.ceil((maxValue + padding) / step) * step;
    const yRange = yMax - yMin || 1;

    const gridYValues = [];
    for (let value = yMin; value <= yMax; value += step) {
      gridYValues.push(value);
    }

    if (!gridYValues.includes(0)) {
      gridYValues.push(0);
      gridYValues.sort((a, b) => a - b);
    }

    const gridLinesY = gridYValues.map((value) => {
      const ratio = (value - yMin) / yRange;
      const y = paddingTop + plotHeight - ratio * plotHeight;

      return {
        y,
        label: value.toString(),
      };
    });

    const points = displayData.map((item, index) => {
      const x =
        paddingLeft + (index / (displayData.length - 1 || 1)) * plotWidth;
      const rssi = Number(item.rssi ?? 0);
      const ratio = (rssi - yMin) / yRange;
      const y = paddingTop + plotHeight - ratio * plotHeight;

      return {
        x,
        y,
        val: rssi,
        time: item.time,
      };
    });

    const linePath = points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(
            1
          )}`
      )
      .join(" ");

    const gridLinesX = [];
    const interval = Math.max(1, Math.floor(points.length / 5));

    for (let i = 0; i < points.length; i += interval) {
      gridLinesX.push({
        x: points[i].x,
        label: points[i].time,
      });
    }

    if (points.length > 0 && (points.length - 1) % interval !== 0) {
      gridLinesX.push({
        x: points[points.length - 1].x,
        label: points[points.length - 1].time,
      });
    }

    return {
      linePath,
      points,
      gridLinesY,
      gridLinesX,
      plotWidth,
      plotHeight,
    };
  }, [displayData]);

  const chartBg = isDarkMode ? "#020617" : "#f8fafc";
  const gridColor = isDarkMode ? "#1e293b" : "#cbd5e1";
  const axisBorderColor = isDarkMode ? "#334155" : "#94a3b8";
  const textColor = isDarkMode ? "#94a3b8" : "#64748b";
  const axisLabelColor = isDarkMode ? "#e2e8f0" : "#475569";
  const lineColor = isLiveMode
    ? isDarkMode
      ? "#10b981"
      : "#059669"
    : isDarkMode
      ? "#38bdf8"
      : "#2563eb";

  const latestPoint = graphData.points[graphData.points.length - 1];

  return (
    <div className="flex-1 w-full px-4 md:px-8 py-6 flex flex-col gap-6 select-none bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
            RSSI Analysis
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Received Signal Strength Indicator (RSSI) over time
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => setIsLiveMode(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isLiveMode
                ? "bg-emerald-500 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-white animate-pulse"
                  : "bg-amber-300"
              }`}
            />
            LIVE ESP32 STREAM ({connectionStatus})
          </button>

          <button
            type="button"
            onClick={() => setIsLiveMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isLiveMode
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            MANUAL SIMULATOR
          </button>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl relative flex flex-col transition-colors">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 text-center mb-4 flex items-center justify-center gap-2">
          <span>Received Signal Strength Indicator (RSSI) Over Time</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              isLiveMode
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
            }`}
          >
            {isLiveMode ? "Cloud Feed" : "Local Props"}
          </span>
        </h3>

        <div
          className="relative w-full aspect-[2.2/1] min-h-[260px] rounded-xl border p-2 overflow-hidden transition-colors duration-200"
          style={{
            backgroundColor: chartBg,
            borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
          }}
        >
          <svg
            viewBox="0 0 800 360"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {graphData.gridLinesY.map((line, index) => (
              <g key={`y-${index}`}>
                <line
                  x1="60"
                  y1={line.y}
                  x2="770"
                  y2={line.y}
                  stroke={gridColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x="50"
                  y={line.y + 4}
                  textAnchor="end"
                  fill={textColor}
                  className="text-[10px] font-mono"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {graphData.gridLinesX.map((line, index) => (
              <g key={`x-${index}`}>
                <line
                  x1={line.x}
                  y1="40"
                  x2={line.x}
                  y2="310"
                  stroke={gridColor}
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                <text
                  x={line.x}
                  y="330"
                  textAnchor="middle"
                  fill={textColor}
                  className="text-[9px] font-mono"
                >
                  {line.label}
                </text>
              </g>
            ))}

            <text
              transform="rotate(-90 20 175)"
              x="20"
              y="175"
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-bold"
            >
              RSSI Value (dBm)
            </text>

            <text
              x="415"
              y="350"
              textAnchor="middle"
              fill={axisLabelColor}
              className="text-[11px] font-bold"
            >
              Time
            </text>

            <rect
              x="60"
              y="40"
              width={graphData.plotWidth}
              height={graphData.plotHeight}
              fill="none"
              stroke={axisBorderColor}
              strokeWidth="1"
            />

            {graphData.linePath && (
              <path
                d={graphData.linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {latestPoint && (
              <>
                <circle
                  cx={latestPoint.x}
                  cy={latestPoint.y}
                  r="5"
                  fill={lineColor}
                  className="animate-ping origin-center"
                  style={{
                    transformOrigin: `${latestPoint.x}px ${latestPoint.y}px`,
                    animationDuration: "1.5s",
                  }}
                />
                <circle
                  cx={latestPoint.x}
                  cy={latestPoint.y}
                  r="3.5"
                  fill={lineColor}
                  stroke={isDarkMode ? "#020617" : "#ffffff"}
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-md w-full transition-colors">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Latest Pusher Data
          </h4>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Check browser console also
          </span>
        </div>

        <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 text-emerald-300 p-4 text-xs leading-relaxed">
          {latestPusherData
            ? JSON.stringify(latestPusherData, null, 2)
            : "Waiting for Pusher csi-update event..."}
        </pre>
      </div>

      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-md max-w-4xl mx-auto w-full transition-opacity ${
          isLiveMode ? "opacity-40 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Simulator Controls
          </h4>

          {isLiveMode && (
            <span className="text-xs text-amber-500 font-semibold">
              Switch to Manual Simulator to unlock sliders
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-10 w-full">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="dist-rssi"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Transceiver Distance
              </label>

              <span className="text-sm font-mono text-slate-700 dark:text-slate-300 font-bold">
                {Number(distance).toFixed(1)} m
              </span>
            </div>

            <input
              id="dist-rssi"
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={distance}
              onChange={(event) => setDistance(parseFloat(event.target.value))}
              className="w-full accent-blue-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setObjectPresent((value) => !value)}
            className={`shrink-0 text-xs uppercase tracking-wider font-extrabold px-5 py-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
              objectPresent
                ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 text-slate-800 border-slate-300"
            }`}
          >
            {objectPresent
              ? "Remove Path Obstruction"
              : "Simulate Path Obstruction"}
          </button>
        </div>
      </div>
    </div>
  );
}