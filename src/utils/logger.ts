/**
 * Simple logger utility with colored output
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : "";
    return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage("INFO", message, data));
  }

  success(message: string, data?: any): void {
    console.log(
      "\x1b[32m%s\x1b[0m",
      this.formatMessage("SUCCESS", message, data)
    );
  }

  warn(message: string, data?: any): void {
    console.warn(
      "\x1b[33m%s\x1b[0m",
      this.formatMessage("WARN", message, data)
    );
  }

  error(message: string, error?: any): void {
    const errorData =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    console.error(
      "\x1b[31m%s\x1b[0m",
      this.formatMessage("ERROR", message, errorData)
    );
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG === "true") {
      console.debug(this.formatMessage("DEBUG", message, data));
    }
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
