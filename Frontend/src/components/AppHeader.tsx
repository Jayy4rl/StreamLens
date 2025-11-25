/**
 * App Header Component
 *
 * Reusable header with navigation and wallet connection
 * Used across all pages for consistent UX
 */

import React, { useState, useRef, useEffect } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { web3Modal } from "../utils/walletConnect";

interface AppHeaderProps {
  currentPage?: "home" | "activity" | "create";
}

const AppHeader: React.FC<AppHeaderProps> = ({ currentPage = "home" }) => {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleConnect = () => {
    // Only open modal if not connected
    if (!isConnected) {
      web3Modal.open();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  const handleSwitchNetwork = () => {
    if (switchChain) {
      switchChain({ chainId: 5031 }); // Somnia Testnet
    }
    setShowDropdown(false);
  };

  const formatAddress = (addr: string): string => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <header className="border-b border-gray-800 bg-black sticky top-0 z-50">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a
            href="/"
            className="text-2xl font-bold text-orange-400 hover:text-orange-300 transition"
          >
            STREAMLENS
          </a>
          <nav className="hidden lg:flex gap-6 text-sm">
            <a
              href="/"
              className={`${
                currentPage === "home"
                  ? "text-orange-400"
                  : "hover:text-orange-400"
              } transition`}
            >
              HOME
            </a>
            <a
              href="/activity"
              className={`${
                currentPage === "activity"
                  ? "text-orange-400"
                  : "hover:text-orange-400"
              } transition`}
            >
              ACTIVITY
            </a>
            <a
              href="/create"
              className={`${
                currentPage === "create"
                  ? "text-orange-400"
                  : "hover:text-orange-400"
              } transition`}
            >
              CREATE
            </a>
          </nav>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-sm">
                <div className="text-gray-400 text-xs">Connected</div>
                <div className="font-mono">{formatAddress(address!)}</div>
              </div>
              <div className="flex items-center gap-2">
                {chain && (
                  <div className="hidden sm:flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded text-xs">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        chain.id === 5031 ? "bg-green-400" : "bg-yellow-400"
                      }`}
                    ></div>
                    <span>{chain.name}</span>
                  </div>
                )}

                {/* Wallet Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="bg-gray-800 text-white px-4 py-2 rounded font-bold text-sm hover:bg-gray-700 transition flex items-center gap-2"
                    title="Wallet options"
                  >
                    <span className="hidden sm:inline">WALLET</span>
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded shadow-xl z-50">
                      <div className="p-3 border-b border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">
                          CONNECTED ADDRESS
                        </div>
                        <div className="text-sm font-mono">
                          {formatAddress(address!)}
                        </div>
                      </div>

                      {/* Switch Network Option (if not on correct network) */}
                      {chain?.id !== 5031 && (
                        <button
                          onClick={handleSwitchNetwork}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 transition flex items-center gap-3"
                        >
                          <svg
                            className="w-4 h-4 text-yellow-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                          <div>
                            <div className="font-bold text-yellow-400">
                              Switch to Testnet
                            </div>
                            <div className="text-xs text-gray-400">
                              Chain ID: 5031
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Copy Address */}
                      <button
                        onClick={() => {
                          if (address) {
                            navigator.clipboard.writeText(address);
                            setShowDropdown(false);
                          }
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 transition flex items-center gap-3"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <div>
                          <div className="font-bold">Copy Address</div>
                          <div className="text-xs text-gray-400">
                            Copy to clipboard
                          </div>
                        </div>
                      </button>

                      {/* Disconnect Option */}
                      <button
                        onClick={handleDisconnect}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 transition flex items-center gap-3 border-t border-gray-800"
                      >
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <div>
                          <div className="font-bold text-red-400">
                            Disconnect
                          </div>
                          <div className="text-xs text-gray-400">
                            Sign out of wallet
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-orange-400 text-black px-4 py-2 rounded font-bold text-sm hover:bg-orange-500 transition"
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden border-t border-gray-800 px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <a
            href="/"
            className={`${
              currentPage === "home"
                ? "text-orange-400"
                : "hover:text-orange-400"
            } transition`}
          >
            HOME
          </a>
          <a
            href="/activity"
            className={`${
              currentPage === "activity"
                ? "text-orange-400"
                : "hover:text-orange-400"
            } transition`}
          >
            ACTIVITY
          </a>
          <a
            href="/create"
            className={`${
              currentPage === "create"
                ? "text-orange-400"
                : "hover:text-orange-400"
            } transition`}
          >
            CREATE
          </a>
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
