/* ==========================================================================
 * Shopify Analytics SDK
 * Version: 1.0.0
 * ==========================================================================
 */

export const SDK_VERSION = "1.0.0";

/* ==========================================================================
 * Types
 * ========================================================================== */

export interface AnalyticsConfig {
  debug?: boolean;
  providers?: Record<string, unknown>;
}

export interface AnalyticsContext {
  browser: string;
  browserVersion: string;

  os: string;
  osVersion: string;

  device: "desktop" | "mobile" | "tablet";

  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  isWebView: boolean;

  language: string;

  timezone: string;

  page: {
    url: string;
    path: string;
    title: string;
    referrer: string;
  };

  timestamp: string;
}

export interface AnalyticsEvent {
  category: string;
  event: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsPayload {
  category: string;
  event: string;
  properties: Record<string, unknown>;
  context: AnalyticsContext;
}

export interface AnalyticsProvider {
  readonly name: string;

  init(config: AnalyticsConfig): void;

  identify?(customer: unknown): void;

  reset?(): void;

  track(payload: AnalyticsPayload): void;
}

/* ==========================================================================
 * Categories
 * ========================================================================== */

export const CATEGORY = Object.freeze({
  AUTH: "authentication",
  PRODUCT: "product",
  COLLECTION: "collection",
  CART: "cart",
  CHECKOUT: "checkout",
  ORDER: "order",
  CUSTOMER: "customer",
  SEARCH: "search",
  PAGE: "page",
  CUSTOM: "custom"
});

/* ==========================================================================
 * Events
 * ========================================================================== */

export const EVENT = Object.freeze({
  LOGIN: "login",
  LOGOUT: "logout",

  PAGE_VIEW: "page_view",

  PRODUCT_VIEW: "product_view",
  COLLECTION_VIEW: "collection_view",

  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  CART_VIEW: "cart_view",

  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",

  PURCHASE: "purchase",

  SEARCH: "search"
});

/* ==========================================================================
 * Login Methods
 * ========================================================================== */

export const LOGIN_METHOD = Object.freeze({
  SHOPIFY: "shopify",
  MULTIPASS: "multipass",
  GOOGLE: "google",
  FACEBOOK: "facebook",
  APPLE: "apple",
  OTP: "otp",
  MAGIC_LINK: "magic_link",
  CUSTOM: "custom"
});

/* ==========================================================================
 * Logger
 * ========================================================================== */

class Logger {

  private enabled = false;

  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  disable(): void {
    this.enabled = false;
  }

  log(...args: unknown[]): void {
    if (!this.enabled) return;
    console.log("[Analytics]", ...args);
  }

  warn(...args: unknown[]): void {
    console.warn("[Analytics]", ...args);
  }

  error(...args: unknown[]): void {
    console.error("[Analytics]", ...args);
  }

}

export const logger = new Logger();

/* ==========================================================================
 * Utils
 * ========================================================================== */

export const Utils = {

  isBrowser(): boolean {
    return typeof window !== "undefined";
  },

  now(): string {
    return new Date().toISOString();
  },

  uuid(): string {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10)
    );
  }

};

/* ==========================================================================
 * SDK State
 * ========================================================================== */

export const state = {

  initialized: false,

  customer: null as unknown,

  sessionId: Utils.uuid(),

  config: {} as AnalyticsConfig

};
/* ==========================================================================
 * Context
 * ========================================================================== */

class Context {

    private get userAgent(): string {
      return typeof navigator !== "undefined"
        ? navigator.userAgent
        : "";
    }
  
    private getBrowser() {
  
      const ua = this.userAgent;
  
      const browsers = [
        { name: "Edge", regex: /Edg\/([\d.]+)/i },
        { name: "Chrome", regex: /Chrome\/([\d.]+)/i },
        { name: "Firefox", regex: /Firefox\/([\d.]+)/i },
        { name: "Safari", regex: /Version\/([\d.]+).*Safari/i }
      ];
  
      for (const browser of browsers) {
  
        const match = ua.match(browser.regex);
  
        if (match) {
  
          return {
  
            name: browser.name,
  
            version: match[1]
  
          };
  
        }
  
      }
  
      return {
  
        name: "Unknown",
  
        version: ""
  
      };
  
    }
  
    private getOS() {
  
      const ua = this.userAgent;
  
      if (/Windows NT/i.test(ua)) {
  
        return {
  
          name: "Windows",
  
          version: ""
  
        };
  
      }
  
      const android = ua.match(/Android ([\d.]+)/i);
  
      if (android) {
  
        return {
  
          name: "Android",
  
          version: android[1]
  
        };
  
      }
  
      const ios = ua.match(/OS ([\d_]+)/i);
  
      if (/iPhone|iPad/i.test(ua) && ios) {
  
        return {
  
          name: "iOS",
  
          version: ios[1].replace(/_/g, ".")
  
        };
  
      }
  
      const mac = ua.match(/Mac OS X ([\d_]+)/i);
  
      if (mac) {
  
        return {
  
          name: "macOS",
  
          version: mac[1].replace(/_/g, ".")
  
        };
  
      }
  
      return {
  
        name: "Unknown",
  
        version: ""
  
      };
  
    }
  
    private getDevice() {
  
      const ua = this.userAgent;
  
      if (/iPad/i.test(ua)) {
  
        return {
  
          device: "tablet" as const,
  
          isMobile: false,
  
          isTablet: true,
  
          isDesktop: false
  
        };
  
      }
  
      if (/Android|iPhone|iPod/i.test(ua)) {
  
        return {
  
          device: "mobile" as const,
  
          isMobile: true,
  
          isTablet: false,
  
          isDesktop: false
  
        };
  
      }
  
      return {
  
        device: "desktop" as const,
  
        isMobile: false,
  
        isTablet: false,
  
        isDesktop: true
  
      };
  
    }
  
    private isWebView() {
  
      return /(wv|FBAN|FBAV|Instagram|Line|Twitter)/i.test(
        this.userAgent
      );
  
    }
  
    private getPage() {
  
      if (!Utils.isBrowser()) {
  
        return {
  
          url: "",
  
          path: "",
  
          title: "",
  
          referrer: ""
  
        };
  
      }
  
      return {
  
        url: window.location.href,
  
        path: window.location.pathname,
  
        title: document.title,
  
        referrer: document.referrer
  
      };
  
    }
  
    collect(): AnalyticsContext {
  
      const browser = this.getBrowser();
  
      const os = this.getOS();
  
      const device = this.getDevice();
  
      const page = this.getPage();
  
      return {
  
        browser: browser.name,
  
        browserVersion: browser.version,
  
        os: os.name,
  
        osVersion: os.version,
  
        device: device.device,
  
        isMobile: device.isMobile,
  
        isTablet: device.isTablet,
  
        isDesktop: device.isDesktop,
  
        isWebView: this.isWebView(),
  
        language:
          typeof navigator !== "undefined"
            ? navigator.language
            : "",
  
        timezone:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone,
  
        page,
  
        timestamp: Utils.now()
  
      };
  
    }
  
  }
  
  export const context = new Context();