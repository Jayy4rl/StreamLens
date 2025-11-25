/**
 * Wallet Connection Configuration
 *
 * Configures wagmi and Web3Modal for wallet connections
 * Supports MetaMask, WalletConnect, and other injected wallets
 */

import { createConfig, http } from "wagmi";
import { walletConnect, injected } from "wagmi/connectors";
import { createWeb3Modal } from "@web3modal/wagmi";

// Somnia Testnet Chain Configuration
export const somniaTestnet = {
  id: 5031,
  name: "Somnia Testnet",
  network: "somnia-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "STT",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.somnia.network"],
      webSocket: ["wss://testnet-ws.somnia.network"],
    },
    public: {
      http: ["https://testnet-rpc.somnia.network"],
      webSocket: ["wss://testnet-ws.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Testnet Explorer",
      url: "https://testnet.somnia.network",
    },
  },
  testnet: true,
} as const;

// WalletConnect Project ID - You need to get this from https://cloud.walletconnect.com
const projectId = "YOUR_PROJECT_ID_HERE"; // TODO: Replace with actual project ID

// Wagmi configuration
export const config = createConfig({
  chains: [somniaTestnet],
  connectors: [
    // Injected wallet (MetaMask, Phantom, etc.) - supports all browser wallets
    injected({
      shimDisconnect: true,
    }),
    // WalletConnect for mobile wallets
    walletConnect({
      projectId,
      metadata: {
        name: "StreamLens",
        description: "Somnia Data Streams Explorer",
        url: "https://streamlens.app", // Update with your domain
        icons: ["https://streamlens.app/icon.png"], // Update with your icon
      },
      showQrModal: false, // We'll use Web3Modal
    }),
  ],
  transports: {
    [somniaTestnet.id]: http(),
  },
});

// Create Web3Modal instance
export const web3Modal = createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#fb923c", // Orange-400 to match your theme
    "--w3m-border-radius-master": "4px",
  },
});
