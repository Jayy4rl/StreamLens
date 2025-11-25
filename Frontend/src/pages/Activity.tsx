/**
 * Activity Page Component
 *
 * Displays real-time activity of data stream registrations
 */

import React, { useState, useEffect, useCallback } from "react";
import { getActivity, getActivityChart } from "../services/api";
import type { Activity, ChartDataPoint } from "../services/api";

const ActivityPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"24H" | "7D" | "30D">("7D");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch activity data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [activityData, chartDataResult] = await Promise.all([
        getActivity({ limit: 15, timeRange }),
        getActivityChart({ timeRange }),
      ]);

      setActivities(activityData);
      setChartData(chartDataResult);
    } catch (err) {
      console.error("Failed to fetch activity:", err);
      setError("Failed to load activity data. Please ensure the API server is running.");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatAddress = (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Simple SVG Line Chart Component
  const LineChart = ({ data }: { data: ChartDataPoint[] }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available for this time range
        </div>
      );
    }

    const width = 800;
    const height = 200;
    const padding = 40;

    // Find min/max values
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const minTime = Math.min(...data.map((d) => d.timestamp));
    const maxTime = Math.max(...data.map((d) => d.timestamp));

    // Scale functions
    const scaleX = (timestamp: number) =>
      padding + ((timestamp - minTime) / (maxTime - minTime)) * (width - 2 * padding);
    const scaleY = (count: number) =>
      height - padding - (count / maxCount) * (height - 2 * padding);

    // Generate path
    const pathData = data
      .map((point, i) => {
        const x = scaleX(point.timestamp);
        const y = scaleY(point.count);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(" ");

    // Generate points for hover
    const points = data.map((point) => ({
      x: scaleX(point.timestamp),
      y: scaleY(point.count),
      count: point.count,
      timestamp: point.timestamp,
    }));

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padding - ratio * (height - 2 * padding);
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9CA3AF"
              >
                {Math.round(maxCount * ratio)}
              </text>
            </g>
          );
        })}

        {/* Chart line */}
        <path
          d={pathData}
          fill="none"
          stroke="#FB923C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#FB923C"
            stroke="#000"
            strokeWidth="2"
            className="hover:r-6 transition-all cursor-pointer"
          >
            <title>
              {point.count} registrations at{" "}
              {new Date(point.timestamp * 1000).toLocaleString()}
            </title>
          </circle>
        ))}

        {/* X-axis labels */}
        <text
          x={padding}
          y={height - 10}
          fontSize="10"
          fill="#9CA3AF"
        >
          {new Date(minTime * 1000).toLocaleDateString()}
        </text>
        <text
          x={width - padding}
          y={height - 10}
          textAnchor="end"
          fontSize="10"
          fill="#9CA3AF"
        >
          {new Date(maxTime * 1000).toLocaleDateString()}
        </text>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a
              href="/"
              className="text-2xl font-bold text-orange-400 hover:text-orange-300"
            >
              STREAMLENS
            </a>
            <nav className="hidden lg:flex gap-6 text-sm">
              <a href="/" className="hover:text-orange-400 transition">
                HOME
              </a>
              <a href="/activity" className="text-orange-400">
                ACTIVITY
              </a>
              <a href="#" className="hover:text-orange-400 transition">
                CREATE
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-gray-900 rounded px-3 py-2 gap-2 items-center">
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search schemas and publishers"
                className="bg-transparent text-xs outline-none w-48 placeholder-gray-600"
              />
              <kbd className="text-xs text-gray-600">⌘ K</kbd>
            </div>
            <button className="bg-orange-400 text-black px-4 py-2 rounded font-bold text-sm hover:bg-orange-500 transition">
              CONNECT WALLET
            </button>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      <div className="bg-red-950 border-b border-red-900 px-6 py-3 flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
        <span>
          You are not connected to Somnia. Switch Network in your wallet to
          continue.
        </span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 border-r border-gray-800 p-6 hidden lg:block bg-gray-950">
          {/* Time Range Filter */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-bold uppercase">Time Range</span>
            </div>
            <div className="space-y-2">
              {[
                { value: "24H", label: "Last 24 Hours" },
                { value: "7D", label: "Last 7 Days" },
                { value: "30D", label: "Last 30 Days" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-800 transition"
                >
                  <input
                    type="radio"
                    name="timeRange"
                    value={option.value}
                    checked={timeRange === option.value}
                    onChange={(e) => setTimeRange(e.target.value as "24H" | "7D" | "30D")}
                    className="w-4 h-4 accent-orange-400"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stats */}
          {!loading && activities.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-sm font-bold uppercase">Stats</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span className="text-gray-400">Total Activity</span>
                  <span className="font-bold">{activities.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span className="text-gray-400">Time Range</span>
                  <span className="font-bold">{timeRange}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-black">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={fetchData}
                className="text-orange-400 hover:text-orange-300 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Activity Chart Section */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Registration Activity
                </h2>

                {/* Chart Container */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                  <div className="h-64">
                    <LineChart data={chartData} />
                  </div>
                  <p className="text-gray-500 text-xs mt-4 text-center">
                    Schema registrations over time ({timeRange})
                  </p>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Recent Activity 
                </h2>

                {activities.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <p className="text-lg mb-2">No activity in this time range</p>
                    <p className="text-sm">Try selecting a different time range</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500">
                          <th className="text-left py-3 px-4 font-bold">ACTION</th>
                          <th className="text-left py-3 px-4 font-bold">SCHEMA</th>
                          <th className="text-left py-3 px-4 font-bold">PUBLISHER</th>
                          <th className="text-right py-3 px-4 font-bold">BLOCK</th>
                          <th className="text-right py-3 px-4 font-bold">TX HASH</th>
                          <th className="text-right py-3 px-4 font-bold">TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((activity) => (
                          <tr
                            key={activity.id}
                            className="border-b border-gray-900 hover:bg-gray-900 transition cursor-pointer"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-3 h-3 text-orange-400"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                <span className="text-gray-400 uppercase">{activity.type}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-semibold">
                                  {activity.schemaName}
                                </div>
                                <div className="text-gray-500 font-mono text-xs">
                                  {formatAddress(activity.schemaId)}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-400">
                              {formatAddress(activity.publisher)}
                            </td>
                            <td className="text-right py-3 px-4">
                              {activity.blockNumber}
                            </td>
                            <td className="text-right py-3 px-4 font-mono text-orange-400">
                              {formatAddress(activity.transactionHash)}
                            </td>
                            <td className="text-right py-3 px-4 text-gray-500">
                              {formatTimestamp(activity.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-xs text-gray-600 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>LIVE DATA ACTIVE</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-gray-400">
            Twitter
          </a>
          <a href="#" className="hover:text-gray-400">
            Discord
          </a>
          <span>StreamLens © 2025</span>
        </div>
      </footer>
    </div>
  );
};

export default ActivityPage;
