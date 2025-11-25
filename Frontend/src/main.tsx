import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { config } from "./utils/walletConnect";
import ErrorBoundary from "./components/ErrorBoundary";

// Create a query client for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </StrictMode>
);
