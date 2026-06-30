/**
 * Logger Utility
 */

export class Logger {
  private debug: boolean;
  private prefix: string;

  constructor(prefix: string, debug: boolean = false) {
    this.prefix = prefix;
    this.debug = debug;
  }

  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  log(...args: unknown[]): void {
    if (this.debug) {
      console.log(`[${this.prefix}]`, ...args);
    }
  }

  warn(...args: unknown[]): void {
    console.warn(`[${this.prefix} Warning]`, ...args);
  }

  error(...args: unknown[]): void {
    console.error(`[${this.prefix} Error]`, ...args);
  }
}
