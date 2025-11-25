/**
 * Activity Page Component
 *
 * Displays real-time activity of data stream registrations and usage
 */

import React, { useState } from "react";

interface Activity {
  id: string;
  type: "REGISTER" | "UPDATE" | "USE";
  schemaName: string;
  schemaId: string;
  publisher: string;
  blockNumber: number;
  timestamp: string;
  transactionHash: string;
}

const Activity: React.FC = () => {
  const [activityType, setActivityType] = useState<"REGISTER" | "UPDATE">(
    "REGISTER"
  );
  const [timeRange, setTimeRange] = useState("30D");
  const [chartMode, setChartMode] = useState<"relative" | "absolute">(
    "relative"
  );

  // Placeholder data - will be replaced with real data later
  const activities: Activity[] = [
    {
      id: "1",
      type: "REGISTER",
      schemaName: "UserActivity Stream",
      schemaId: "0x1234...5678",
      publisher: "0xabcd...efgh",
      blockNumber: 234833100,
      timestamp: "2 hours ago",
      transactionHash: "0x9876...5432",
    },
  ];

  const formatAddress = (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
          {/* Activity Type Filter */}
          <div className="mb-8">
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
              <span className="text-sm font-bold uppercase">Type</span>
            </div>
            <div className="space-y-3">
              {["REGISTER", "UPDATE"].map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={activityType === (type as "REGISTER" | "UPDATE")}
                    onChange={(e) =>
                      setActivityType(e.target.value as "REGISTER" | "UPDATE")
                    }
                    className="w-4 h-4 accent-orange-400"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time Range */}
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
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-gray-900 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="1H">Last Hour</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="ALL">All Time</option>
            </select>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-black">
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
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
                Schema Activity
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-900 rounded p-1">
                  <button
                    onClick={() => setChartMode("relative")}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      chartMode === "relative"
                        ? "bg-orange-400 text-black"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    RELATIVE
                  </button>
                  <button
                    onClick={() => setChartMode("absolute")}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      chartMode === "absolute"
                        ? "bg-orange-400 text-black"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    ABSOLUTE
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-gray-900 rounded p-6 mb-6 h-64 flex items-center justify-center border border-gray-800">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-32 h-20 bg-gradient-to-r from-cyan-500 to-transparent opacity-50 rounded"></div>
                  <div className="w-32 h-16 bg-gradient-to-r from-orange-400 to-transparent opacity-50 rounded"></div>
                </div>
                <p className="text-gray-500 text-xs">
                  Activity chart (coming soon)
                </p>
              </div>
            </div>

            {/* Activity Table */}
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
                          <span className="text-gray-400">{activity.type}</span>
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
                        {activity.blockNumber.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 font-mono text-orange-400">
                        {formatAddress(activity.transactionHash)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-500">
                        {activity.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            <div className="mt-8 text-center text-gray-500">
              <p>Real-time activity monitoring coming soon...</p>
            </div>
          </div>
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

export default Activity;
