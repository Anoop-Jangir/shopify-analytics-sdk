var Analytics = (function(exports) {
  "use strict";
  const CATEGORY = {
    AUTH: "authentication",
    PRODUCT: "product",
    CART: "cart",
    CHECKOUT: "checkout",
    PAGE: "page",
    SEARCH: "search",
    CUSTOMER: "customer",
    CUSTOM: "custom"
  };
  const EVENT = {
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
  };
  class Logger {
    constructor() {
      this.enabled = false;
    }
    enable(value) {
      this.enabled = value;
    }
    log(...args) {
      if (!this.enabled) return;
      console.log("[Analytics]", ...args);
    }
    warn(...args) {
      console.warn("[Analytics]", ...args);
    }
    error(...args) {
      console.error("[Analytics]", ...args);
    }
  }
  class Context {
    constructor() {
      this.ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    }
    browser() {
      if (/Edg\/([\d.]+)/i.test(this.ua)) {
        return {
          browser: "Edge",
          browserVersion: RegExp.$1
        };
      }
      if (/Chrome\/([\d.]+)/i.test(this.ua)) {
        return {
          browser: "Chrome",
          browserVersion: RegExp.$1
        };
      }
      if (/Firefox\/([\d.]+)/i.test(this.ua)) {
        return {
          browser: "Firefox",
          browserVersion: RegExp.$1
        };
      }
      if (/Version\/([\d.]+).*Safari/i.test(this.ua)) {
        return {
          browser: "Safari",
          browserVersion: RegExp.$1
        };
      }
      return {
        browser: "Unknown",
        browserVersion: ""
      };
    }
    os() {
      if (/Windows/i.test(this.ua))
        return {
          os: "Windows",
          osVersion: ""
        };
      if (/Android ([\d.]+)/i.test(this.ua))
        return {
          os: "Android",
          osVersion: RegExp.$1
        };
      if (/iPhone|iPad/i.test(this.ua))
        return {
          os: "iOS",
          osVersion: ""
        };
      if (/Mac/i.test(this.ua))
        return {
          os: "macOS",
          osVersion: ""
        };
      return {
        os: "Unknown",
        osVersion: ""
      };
    }
    device() {
      if (/iPad/i.test(this.ua)) {
        return {
          device: "tablet",
          isMobile: false,
          isTablet: true,
          isDesktop: false
        };
      }
      if (/Android|iPhone/i.test(this.ua)) {
        return {
          device: "mobile",
          isMobile: true,
          isTablet: false,
          isDesktop: false
        };
      }
      return {
        device: "desktop",
        isMobile: false,
        isTablet: false,
        isDesktop: true
      };
    }
    isWebView() {
      return /(wv|FBAN|FBAV|Instagram)/i.test(this.ua);
    }
    collect() {
      const browser = this.browser();
      const os = this.os();
      const device = this.device();
      return {
        browser: browser.browser,
        browserVersion: browser.browserVersion,
        os: os.os,
        osVersion: os.osVersion,
        device: device.device,
        isMobile: device.isMobile,
        isTablet: device.isTablet,
        isDesktop: device.isDesktop,
        isWebView: this.isWebView(),
        language: typeof navigator !== "undefined" ? navigator.language : "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page: {
          url: typeof location !== "undefined" ? location.href : "",
          path: typeof location !== "undefined" ? location.pathname : "",
          title: typeof document !== "undefined" ? document.title : "",
          referrer: typeof document !== "undefined" ? document.referrer : ""
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  const context = new Context();
  const logger = new Logger();
  class ProviderManager {
    constructor() {
      this.providers = /* @__PURE__ */ new Map();
    }
    register(provider) {
      this.providers.set(provider.name, provider);
    }
    init(config) {
      this.providers.forEach((provider) => {
        provider.init(config);
      });
    }
    identify(customer) {
      this.providers.forEach((provider) => {
        provider.identify?.(customer);
      });
    }
    reset() {
      this.providers.forEach((provider) => {
        provider.reset?.();
      });
    }
    track(payload) {
      this.providers.forEach((provider) => {
        provider.track(payload);
      });
    }
    has(name) {
      return this.providers.has(name);
    }
    get(name) {
      return this.providers.get(name);
    }
    all() {
      return Array.from(this.providers.values());
    }
  }
  class Validator {
    validate(event) {
      if (!event.category) {
        throw new Error("Analytics: category is required.");
      }
      if (!event.event) {
        throw new Error("Analytics: event is required.");
      }
    }
  }
  class AnalyticsSDK {
    constructor() {
      this.providers = new ProviderManager();
      this.validator = new Validator();
      this.customer = null;
      this.config = {};
      this.version = "1.0.0";
      this.CATEGORY = CATEGORY;
      this.EVENT = EVENT;
    }
    init(config = {}) {
      this.config = config;
      logger.enable(Boolean(config.debug));
      this.providers.init(config);
      logger.log("Analytics initialized");
      return this;
    }
    registerProvider(provider) {
      this.providers.register(provider);
      provider.init(this.config);
      logger.log(`Provider registered: ${provider.name}`);
      return this;
    }
    identify(customer) {
      this.customer = customer;
      this.providers.identify(customer);
      return this;
    }
    reset() {
      this.customer = null;
      this.providers.reset();
      return this;
    }
    getCustomer() {
      return this.customer;
    }
    getContext() {
      return context.collect();
    }
    getConfig() {
      return this.config;
    }
    track(event) {
      this.validator.validate(event);
      const payload = {
        category: event.category,
        event: event.event,
        properties: {
          ...event.properties ?? {}
        },
        context: this.getContext()
      };
      logger.log(payload);
      this.providers.track(payload);
    }
  }
  const Analytics2 = new AnalyticsSDK();
  exports.CATEGORY = CATEGORY;
  exports.EVENT = EVENT;
  exports.default = Analytics2;
  Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
  return exports;
})({});
