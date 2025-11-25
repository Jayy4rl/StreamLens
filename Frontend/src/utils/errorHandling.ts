/**
 * Error Handling Utilities
 *
 * Centralized error handling and user-friendly error messages
 */

export interface ErrorDetails {
  message: string;
  title?: string;
  code?: string;
  retry?: boolean;
  action?: string;
}

/**
 * Parse and format wallet/transaction errors
 */
export function parseWalletError(error: unknown): ErrorDetails {
  if (!error) {
    return {
      message: "An unknown error occurred",
      title: "Error",
    };
  }

  const errorString = error instanceof Error ? error.message : String(error);
  const lowerError = errorString.toLowerCase();

  // User rejected transaction
  if (
    lowerError.includes("user rejected") ||
    lowerError.includes("user denied") ||
    lowerError.includes("user cancelled")
  ) {
    return {
      message: "Transaction was cancelled by user",
      title: "Transaction Cancelled",
      code: "USER_REJECTED",
      retry: true,
    };
  }

  // Insufficient funds
  if (
    lowerError.includes("insufficient funds") ||
    lowerError.includes("insufficient balance")
  ) {
    return {
      message:
        "Insufficient funds to complete transaction. Please add funds to your wallet.",
      title: "Insufficient Funds",
      code: "INSUFFICIENT_FUNDS",
      action: "Get testnet tokens from a faucet",
    };
  }

  // Network/RPC errors
  if (
    lowerError.includes("network") ||
    lowerError.includes("rpc") ||
    lowerError.includes("connection")
  ) {
    return {
      message:
        "Unable to connect to the network. Please check your internet connection.",
      title: "Network Error",
      code: "NETWORK_ERROR",
      retry: true,
    };
  }

  // Wrong network
  if (lowerError.includes("chain") || lowerError.includes("network mismatch")) {
    return {
      message:
        "Please switch to Somnia Testnet (Chain ID: 5031) in your wallet.",
      title: "Wrong Network",
      code: "WRONG_NETWORK",
      action: "Switch network in wallet",
    };
  }

  // Gas estimation failed
  if (lowerError.includes("gas") || lowerError.includes("out of gas")) {
    return {
      message:
        "Transaction may fail. Insufficient gas or transaction would revert.",
      title: "Gas Estimation Failed",
      code: "GAS_ERROR",
      retry: true,
    };
  }

  // Smart contract revert
  if (
    lowerError.includes("revert") ||
    lowerError.includes("execution reverted")
  ) {
    // Try to extract revert reason
    const revertMatch = errorString.match(/revert (.+)/i);
    const reason = revertMatch ? revertMatch[1] : "Unknown reason";

    return {
      message: `Transaction would fail: ${reason}`,
      title: "Transaction Will Fail",
      code: "CONTRACT_REVERT",
      retry: false,
    };
  }

  // Wallet not connected
  if (
    lowerError.includes("not connected") ||
    lowerError.includes("no wallet")
  ) {
    return {
      message: "Please connect your wallet to continue",
      title: "Wallet Not Connected",
      code: "NOT_CONNECTED",
      action: "Connect wallet",
    };
  }

  // Timeout
  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return {
      message: "Request timed out. Please try again.",
      title: "Timeout",
      code: "TIMEOUT",
      retry: true,
    };
  }

  // Default error
  return {
    message: errorString,
    title: "Error",
    code: "UNKNOWN_ERROR",
    retry: true,
  };
}

/**
 * Parse API errors
 */
export function parseApiError(error: unknown): ErrorDetails {
  if (!error) {
    return {
      message: "An unknown API error occurred",
      title: "API Error",
    };
  }

  // Axios error
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: { status?: number; data?: { message?: string } };
    };

    const status = axiosError.response?.status;
    const message = axiosError.response?.data?.message;

    switch (status) {
      case 400:
        return {
          message: message || "Invalid request. Please check your input.",
          title: "Bad Request",
          code: "BAD_REQUEST",
        };
      case 404:
        return {
          message: message || "Resource not found.",
          title: "Not Found",
          code: "NOT_FOUND",
        };
      case 500:
        return {
          message: message || "Server error. Please try again later.",
          title: "Server Error",
          code: "SERVER_ERROR",
          retry: true,
        };
      case 503:
        return {
          message: "Service temporarily unavailable. Please try again.",
          title: "Service Unavailable",
          code: "SERVICE_UNAVAILABLE",
          retry: true,
        };
      default:
        return {
          message: message || `Request failed with status ${status}`,
          title: "API Error",
          code: "API_ERROR",
          retry: true,
        };
    }
  }

  // Network error (no response)
  if (typeof error === "object" && error !== null && "request" in error) {
    return {
      message: "Unable to reach the server. Please check your connection.",
      title: "Connection Error",
      code: "CONNECTION_ERROR",
      retry: true,
    };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    message: errorMessage,
    title: "API Error",
    code: "API_ERROR",
    retry: true,
  };
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: unknown, context?: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : "";

  if (error instanceof Error) {
    return `${timestamp} ${contextStr}${error.name}: ${
      error.message
    }\n${error.stack || ""}`;
  }

  return `${timestamp} ${contextStr}${String(error)}`;
}

/**
 * Log error to console (can be extended to send to logging service)
 */
export function logError(error: unknown, context?: string) {
  const formattedError = formatErrorForLog(error, context);
  console.error(formattedError);

  // TODO: Send to logging service (e.g., Sentry, LogRocket)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToLoggingService(formattedError);
  // }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const details = parseWalletError(error);
  return (
    details.retry ||
    details.code === "NETWORK_ERROR" ||
    details.code === "TIMEOUT"
  );
}
