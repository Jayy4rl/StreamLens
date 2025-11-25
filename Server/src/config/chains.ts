import { defineChain } from "viem";
import { Address } from "viem";

/**
 * Somnia Mainnet Chain Configuration
 */
export const somniaMainnet = defineChain({
  id: 50312,
  name: "Somnia Mainnet",
  network: "somnia-mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "SOMI",
    symbol: "SOMI",
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet-rpc.somnia.network"],
      webSocket: ["wss://mainnet-ws.somnia.network"],
    },
    public: {
      http: ["https://mainnet-rpc.somnia.network"],
      webSocket: ["wss://mainnet-ws.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://explorer.somnia.network",
    },
  },
  testnet: false,
});

/**
 * Somnia Testnet (Shannon) Chain Configuration
 */
export const somniaTestnet = defineChain({
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
});

/**
 * Contract addresses for different networks
 */
export const STREAMS_CONTRACT_ADDRESSES: Record<number, Address> = {
  50312: "0xC1d833a80469854a7450Dd187224b2ceE5ecE264", // Mainnet
  5031: "0x0000000000000000000000000000000000000000", // Testnet
};

/**
 * Get chain configuration by network name
 */
export function getChain(network: "mainnet" | "testnet") {
  return network === "mainnet" ? somniaMainnet : somniaTestnet;
}

/**
 * Get streams contract address by chain ID
 */
export function getStreamsContractAddress(chainId: number): Address {
  const address = STREAMS_CONTRACT_ADDRESSES[chainId];
  if (!address) {
    throw new Error(
      `No streams contract address found for chain ID ${chainId}`
    );
  }
  return address;
}
