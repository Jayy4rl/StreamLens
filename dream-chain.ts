import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
} from "viem";
import { SDK } from "@somnia-chain/streams";

const dreamChain = defineChain({
  id: 50312,
  name: "Somnia Dream",
  network: "somnia-dream",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
});

// const publicClient = createPublicClient({
//   chain,
//   transport: http(),
// });

// const sdk = new SDK({
//   public: publicClient,
// });

module.exports = { dreamChain };
