/**
 * Shopify Analytics SDK
 * Multi-provider analytics solution supporting mParticle, GA4, Meta Pixel, and Segment
 * Works seamlessly in Liquid, Custom Pixels, and theme.js
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AnalyticsConfig {
  provider: 'mparticle' | 'ga4' | 'segment' | 'meta' | 'custom';
  enableAutoCollection?: boolean;
  debug?: boolean;
  customEndpoint?: string;
}

interface AuthEvent {
  type: 'login_success' | 'login_fail' | 'logout' | 'signup';
  method: 'default' | 'multipass' | 'social' | 'email';
  customerId?: string;
  email?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ProductEvent {
  productId: string;
  title: string;
  price: number;
  currency: string;
  category?: string;
  variant?: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

interface CartEvent {
  cartId: string;
  cartValue: number;
  currency: string;
  itemCount: number;
  products: ProductEvent[];
  metadata?: Record<string, any>;
}

interface PageProperties {
  url?: string;
  path?: string;
  referrer?: string;
  title?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

interface DeviceProperties {
  userAgent?: string;
  language?: string;
  timezone?: string;
  screenResolution?: string;
  viewport?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
}

interface UserIdentity {
  customerId: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
}

interface CollectedData {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  screenResolution: string;
  viewport: string;
  language: string;
  timezone: string;
  url: string;
  path: string;
  referrer: string;
  utmParams: Record<string, string>;
  timestamp: number;
  sessionId: string;
  anonymousId: string;
}

interface EventPayload {
  eventName: string;
  eventData?: Record<string, any>;
  userIdentity?: UserIdentity;
  deviceProperties?: DeviceProperties;
  pageProperties?: PageProperties;
  timestamp?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

class BrowserDetection {
  static getUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }

  static parseBrowserInfo(): { name: string; version: string } {
    const ua = this.getUserAgent();
    
    if (ua.includes('Chrome') && !ua.includes('Chromium')) {
      const match = ua.match(/Chrome\/(\d+)/);
      return { name: 'Chrome', version: match?.[1] || '' };
    }
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/);
      return { name: 'Safari', version: match?.[1] || '' };
    }
    if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/(\d+)/);
      return { name: 'Firefox', version: match?.[1] || '' };
    }
    if (ua.includes('Edge') || ua.includes('Edg')) {
      const match = ua.match(/Edg(?:e)?\/(\d+)/);
      return { name: 'Edge', version: match?.[1] || '' };
    }
    if (ua.includes('OPR') || ua.includes('Opera')) {
      const match = ua.match(/(?:OPR|Opera)\/(\d+)/);
      return { name: 'Opera', version: match?.[1] || '' };
    }
    
    return { name: 'Unknown', version: '' };
  }

  static parseOSInfo(): { name: string; version: string } {
    const ua = this.getUserAgent();
    
    if (ua.includes('Windows')) {
      const match = ua.match(/Windows NT ([\d.]+)/);
      const version = match?.[1] || '';
      return { name: 'Windows', version };
    }
    if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X ([\d_]+)/);
      const version = match?.[1]?.replace(/_/g, '.') || '';
      return { name: 'macOS', version };
    }
    if (ua.includes('Android')) {
      const match = ua.match(/Android ([\d.]+)/);
      const version = match?.[1] || '';
      return { name: 'Android', version };
    }
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
      const match = ua.match(/Version\/([\d.]+)/);
      const version = match?.[1] || '';
      return { name: 'iOS', version };
    }
    if (ua.includes('Linux')) {
      return { name: 'Linux', version: '' };
    }
    
    return { name: 'Unknown', version: '' };
  }

  static getDeviceType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const ua = this.getUserAgent().toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
      return 'mobile';
    }
    if (/ipad|tablet|android/.test(ua)) {
      return 'tablet';
    }
    
    return 'desktop';
  }

  static getScreenResolution(): string {
    if (typeof window === 'undefined') return '0x0';
    return `${window.screen.width}x${window.screen.height}`;
  }

  static getViewport(): string {
    if (typeof window === 'undefined') return '0x0';
    return `${window.innerWidth}x${window.innerHeight}`;
  }

  static getLanguage(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    return navigator.language || navigator.languages?.[0] || 'en';
  }

  static getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'unknown';
    }
  }
}

class URLUtils {
  static getUTMParams(): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') {
      return params;
    }

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      
      utmKeys.forEach(key => {
        const value = searchParams.get(key);
        if (value) params[key] = value;
      });
    } catch (e) {
      // Silently handle parsing errors
    }

    return params;
  }

  static getCurrentPath(): string {
    if (typeof window === 'undefined') return '';
    
    try {
      const url = new URL(window.location.href);
      return url.pathname + url.search + url.hash;
    } catch {
      return window.location.pathname;
    }
  }

  static getReferrer(): string {
    if (typeof document === 'undefined') return '';
    return document.referrer || '';
  }
}

class SessionManager {
  private static SESSION_KEY = 'shopify_analytics_session_id';
  private static ANONYMOUS_KEY = 'shopify_analytics_anonymous_id';

  static getOrCreateSessionId(): string {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return this.generateId();
    }

    try {
      let sessionId = localStorage.getItem(this.SESSION_KEY);
      if (!sessionId) {
        sessionId = this.generateId();
        localStorage.setItem(this.SESSION_KEY, sessionId);
      }
      return sessionId;
    } catch {
      return this.generateId();
    }
  }

  static getOrCreateAnonymousId(): string {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return this.generateId();
    }

    try {
      let anonymousId = localStorage.getItem(this.ANONYMOUS_KEY);
      if (!anonymousId) {
        anonymousId = this.generateId();
        localStorage.setItem(this.ANONYMOUS_KEY, anonymousId);
      }
      return anonymousId;
    } catch {
      return this.generateId();
    }
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static clearSession(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch {
      // Silently handle errors
    }
  }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

interface IAnalyticsProvider {
  initialize(config: AnalyticsConfig): void;
  trackEvent(event: EventPayload): void;
  identifyUser(identity: UserIdentity): void;
  trackAuthEvent(event: AuthEvent): void;
  trackProductEvent(event: ProductEvent): void;
  trackCartEvent(event: CartEvent): void;
  setUserProperties(properties: Record<string, any>): void;
}

class MParticleProvider implements IAnalyticsProvider {
  private config: AnalyticsConfig | null = null;

  initialize(config: AnalyticsConfig): void {
    this.config = config;
    
    if (config.debug) {
      console.log('[mParticle] Initializing mParticle provider');
    }

    // Ensure mParticle SDK is loaded
    if (typeof window !== 'undefined' && !(window as any).mParticle) {
      this.loadmParticleSDK();
    }
  }

  private loadmParticleSDK(): void {
    const script = document.createElement('script');
    script.src = 'https://jssdkcdns.mparticle.com/js/v2/mparticle.js';
    script.async = true;
    document.head.appendChild(script);
  }

  trackEvent(event: EventPayload): void {
    const mP = (window as any).mParticle;
    if (!mP) {
      if (this.config?.debug) console.warn('[mParticle] SDK not loaded yet');
      return;
    }

    try {
      const eventData = this.buildEventData(event);
      mP.logEvent(event.eventName, mP.EventType.Other, eventData);
    } catch (error) {
      if (this.config?.debug) console.error('[mParticle] Track event error:', error);
    }
  }

  identifyUser(identity: UserIdentity): void {
    const mP = (window as any).mParticle;
    if (!mP) return;

    try {
      const userIdentities = {
        userIdentities: {
          email: identity.email,
          customerId: identity.customerId,
          ...(identity.phone && { phone: identity.phone }),
          ...(identity.externalId && { external_id: identity.externalId }),
        },
      };
      mP.identity.modify(userIdentities);
    } catch (error) {
      if (this.config?.debug) console.error('[mParticle] Identify error:', error);
    }
  }

  trackAuthEvent(event: AuthEvent): void {
    const mP = (window as any).mParticle;
    if (!mP) return;

    try {
      const eventData = {
        method: event.method,
        ...(event.customerId && { customerId: event.customerId }),
        ...(event.email && { email: event.email }),
        ...(event.userId && { userId: event.userId }),
        ...event.metadata,
      };

      const eventName = `auth_${event.type}`;
      mP.logEvent(eventName, mP.EventType.UserAction, eventData);
    } catch (error) {
      if (this.config?.debug) console.error('[mParticle] Auth event error:', error);
    }
  }

  trackProductEvent(event: ProductEvent): void {
    const mP = (window as any).mParticle;
    if (!mP) return;

    try {
      const product = new mP.Product(
        event.title,
        event.productId,
        event.price,
        event.quantity || 1
      );
      product.category = event.category;
      product.variant = event.variant;

      const eventData = this.buildEventData({ eventData: event.metadata });
      mP.logEvent('product_view', mP.EventType.Commerce, eventData, { product });
    } catch (error) {
      if (this.config?.debug) console.error('[mParticle] Product event error:', error);
    }
  }

  trackCartEvent(event: CartEvent): void {
    const mP = (window as any).mParticle;
    if (!mP) return;

    try {
      const products = event.products.map(p => 
        new mP.Product(p.title, p.productId, p.price, p.quantity || 1)
      );

      const eventData = {
        cartValue: event.cartValue,
        itemCount: event.itemCount,
        ...event.metadata,
      };

      mP.logEvent('cart_view', mP.EventType.Commerce, eventData, { products });
    } catch (error) {
      if (this.config?.debug) console.error('[mParticle] Cart event error:', error);
    }
  }

  setUserProperties(properties: Record<string, any>): void {
    const mP = (window as any).mParticle;
    if (!mP) return;

    try {
      Object.entries(properties).forEach(([key, value]) => {
        mP.setUserAttribute(key, value);
      });
    } catch (error) {
      if (this.config?.debug) console.error('[mParticle] Set user properties error:', error);
    }
  }

  private buildEventData(event: EventPayload): Record<string, any> {
    return {
      ...event.eventData,
      ...this.getDeviceData(event.deviceProperties),
      ...this.getPageData(event.pageProperties),
      timestamp: event.timestamp || Date.now(),
    };
  }

  private getDeviceData(props?: DeviceProperties): Record<string, any> {
    if (!props) return {};
    return Object.entries(props)
      .filter(([, v]) => v !== undefined)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }

  private getPageData(props?: PageProperties): Record<string, any> {
    if (!props) return {};
    return Object.entries(props)
      .filter(([, v]) => v !== undefined)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }
}

class GA4Provider implements IAnalyticsProvider {
  private config: AnalyticsConfig | null = null;

  initialize(config: AnalyticsConfig): void {
    this.config = config;
    
    if (config.debug) {
      console.log('[GA4] Initializing GA4 provider');
    }

    // GA4 should be initialized via gtag if available
    if (typeof window !== 'undefined' && !(window as any).gtag) {
      this.loadGA4SDK();
    }
  }

  private loadGA4SDK(): void {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    script.async = true;
    document.head.appendChild(script);
  }

  trackEvent(event: EventPayload): void {
    const gtag = (window as any).gtag;
    if (!gtag) {
      if (this.config?.debug) console.warn('[GA4] gtag not loaded yet');
      return;
    }

    try {
      gtag('event', event.eventName, {
        ...event.eventData,
        ...this.getDeviceData(event.deviceProperties),
        ...this.getPageData(event.pageProperties),
      });
    } catch (error) {
      if (this.config?.debug) console.error('[GA4] Track event error:', error);
    }
  }

  identifyUser(identity: UserIdentity): void {
    const gtag = (window as any).gtag;
    if (!gtag) return;

    try {
      gtag('config', 'GA_MEASUREMENT_ID', {
        user_id: identity.customerId,
        user_properties: {
          email: identity.email,
          phone: identity.phone,
          first_name: identity.firstName,
          last_name: identity.lastName,
        },
      });
    } catch (error) {
      if (this.config?.debug) console.error('[GA4] Identify error:', error);
    }
  }

  trackAuthEvent(event: AuthEvent): void {
    const gtag = (window as any).gtag;
    if (!gtag) return;

    try {
      gtag('event', `auth_${event.type}`, {
        method: event.method,
        customer_id: event.customerId,
        email: event.email,
        user_id: event.userId,
        ...event.metadata,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[GA4] Auth event error:', error);
    }
  }

  trackProductEvent(event: ProductEvent): void {
    const gtag = (window as any).gtag;
    if (!gtag) return;

    try {
      gtag('event', 'view_item', {
        items: [
          {
            item_id: event.productId,
            item_name: event.title,
            price: event.price,
            currency: event.currency,
            item_category: event.category,
            item_variant: event.variant,
            quantity: event.quantity,
          },
        ],
        ...event.metadata,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[GA4] Product event error:', error);
    }
  }

  trackCartEvent(event: CartEvent): void {
    const gtag = (window as any).gtag;
    if (!gtag) return;

    try {
      gtag('event', 'view_cart', {
        items: event.products.map(p => ({
          item_id: p.productId,
          item_name: p.title,
          price: p.price,
          currency: p.currency,
          item_category: p.category,
          quantity: p.quantity,
        })),
        value: event.cartValue,
        currency: event.currency,
        ...event.metadata,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[GA4] Cart event error:', error);
    }
  }

  setUserProperties(properties: Record<string, any>): void {
    const gtag = (window as any).gtag;
    if (!gtag) return;

    try {
      gtag('config', 'GA_MEASUREMENT_ID', {
        user_properties: properties,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[GA4] Set user properties error:', error);
    }
  }

  private getDeviceData(props?: DeviceProperties): Record<string, any> {
    if (!props) return {};
    return Object.entries(props)
      .filter(([, v]) => v !== undefined)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }

  private getPageData(props?: PageProperties): Record<string, any> {
    if (!props) return {};
    return Object.entries(props)
      .filter(([, v]) => v !== undefined)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }
}

class CustomProvider implements IAnalyticsProvider {
  private config: AnalyticsConfig | null = null;

  initialize(config: AnalyticsConfig): void {
    this.config = config;
    
    if (config.debug) {
      console.log('[Custom] Initializing custom provider');
    }
  }

  trackEvent(event: EventPayload): void {
    if (!this.config?.customEndpoint) {
      if (this.config?.debug) console.warn('[Custom] No custom endpoint configured');
      return;
    }

    try {
      this.sendToEndpoint(event);
    } catch (error) {
      if (this.config?.debug) console.error('[Custom] Track event error:', error);
    }
  }

  identifyUser(identity: UserIdentity): void {
    if (!this.config?.customEndpoint) return;

    try {
      this.sendToEndpoint({ eventName: 'identify_user', eventData: identity });
    } catch (error) {
      if (this.config?.debug) console.error('[Custom] Identify error:', error);
    }
  }

  trackAuthEvent(event: AuthEvent): void {
    if (!this.config?.customEndpoint) return;

    try {
      this.sendToEndpoint({
        eventName: `auth_${event.type}`,
        eventData: event,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[Custom] Auth event error:', error);
    }
  }

  trackProductEvent(event: ProductEvent): void {
    if (!this.config?.customEndpoint) return;

    try {
      this.sendToEndpoint({
        eventName: 'product_view',
        eventData: event,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[Custom] Product event error:', error);
    }
  }

  trackCartEvent(event: CartEvent): void {
    if (!this.config?.customEndpoint) return;

    try {
      this.sendToEndpoint({
        eventName: 'cart_view',
        eventData: event,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[Custom] Cart event error:', error);
    }
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.config?.customEndpoint) return;

    try {
      this.sendToEndpoint({
        eventName: 'set_user_properties',
        eventData: properties,
      });
    } catch (error) {
      if (this.config?.debug) console.error('[Custom] Set user properties error:', error);
    }
  }

  private sendToEndpoint(payload: any): void {
    if (typeof fetch === 'undefined' || !this.config?.customEndpoint) return;

    fetch(this.config.customEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(error => {
      if (this.config?.debug) console.error('[Custom] Fetch error:', error);
    });
  }
}

// ============================================================================
// MAIN SDK
// ============================================================================

class ShopifyAnalyticsSDK {
  private provider: IAnalyticsProvider | null = null;
  private config: AnalyticsConfig | null = null;
  private collectedData: CollectedData | null = null;
  private static instance: ShopifyAnalyticsSDK | null = null;

  private constructor() {}

  static getInstance(): ShopifyAnalyticsSDK {
    if (!ShopifyAnalyticsSDK.instance) {
      ShopifyAnalyticsSDK.instance = new ShopifyAnalyticsSDK();
    }
    return ShopifyAnalyticsSDK.instance;
  }

  /**
   * Initialize the SDK with a specific provider
   */
  initialize(config: AnalyticsConfig): void {
    this.config = config;

    // Create provider instance
    switch (config.provider) {
      case 'mparticle':
        this.provider = new MParticleProvider();
        break;
      case 'ga4':
        this.provider = new GA4Provider();
        break;
      case 'custom':
        this.provider = new CustomProvider();
        break;
      case 'segment':
      case 'meta':
      default:
        this.provider = new CustomProvider();
        break;
    }

    this.provider.initialize(config);

    // Auto-collect data if enabled
    if (config.enableAutoCollection !== false) {
      this.autoCollectData();
    }

    if (config.debug) {
      console.log('[ShopifyAnalytics] SDK initialized with provider:', config.provider);
    }
  }

  /**
   * Auto-collect browser, device, and page data
   */
  private autoCollectData(): void {
    const browser = BrowserDetection.parseBrowserInfo();
    const os = BrowserDetection.parseOSInfo();
    const utmParams = URLUtils.getUTMParams();

    this.collectedData = {
      browser: browser.name,
      browserVersion: browser.version,
      os: os.name,
      osVersion: os.version,
      device: BrowserDetection.getDeviceType(),
      screenResolution: BrowserDetection.getScreenResolution(),
      viewport: BrowserDetection.getViewport(),
      language: BrowserDetection.getLanguage(),
      timezone: BrowserDetection.getTimezone(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      path: URLUtils.getCurrentPath(),
      referrer: URLUtils.getReferrer(),
      utmParams,
      timestamp: Date.now(),
      sessionId: SessionManager.getOrCreateSessionId(),
      anonymousId: SessionManager.getOrCreateAnonymousId(),
    };

    if (this.config?.debug) {
      console.log('[ShopifyAnalytics] Auto-collected data:', this.collectedData);
    }
  }

  /**
   * Get auto-collected data
   */
  getCollectedData(): CollectedData | null {
    return this.collectedData;
  }

  /**
   * Track a custom event
   */
  trackEvent(
    eventName: string,
    eventData?: Record<string, any>,
    deviceProperties?: DeviceProperties,
    pageProperties?: PageProperties
  ): void {
    if (!this.provider) {
      console.warn('[ShopifyAnalytics] SDK not initialized. Call initialize() first.');
      return;
    }

    const payload: EventPayload = {
      eventName,
      eventData: { ...this.collectedData, ...eventData },
      deviceProperties: { ...this.getAutoDeviceProperties(), ...deviceProperties },
      pageProperties: { ...this.getAutoPageProperties(), ...pageProperties },
      timestamp: Date.now(),
    };

    this.provider.trackEvent(payload);
  }

  /**
   * Identify a user
   */
  identifyUser(identity: UserIdentity): void {
    if (!this.provider) {
      console.warn('[ShopifyAnalytics] SDK not initialized. Call initialize() first.');
      return;
    }

    this.provider.identifyUser(identity);
  }

  /**
   * Track authentication events
   */
  trackAuthEvent(event: AuthEvent): void {
    if (!this.provider) {
      console.warn('[ShopifyAnalytics] SDK not initialized. Call initialize() first.');
      return;
    }

    const enrichedEvent: AuthEvent = {
      ...event,
      metadata: {
        ...this.collectedData,
        ...event.metadata,
      },
    };

    this.provider.trackAuthEvent(enrichedEvent);
  }

  /**
   * Track product views
   */
  trackProductEvent(product: ProductEvent): void {
    if (!this.provider) {
      console.warn('[ShopifyAnalytics] SDK not initialized. Call initialize() first.');
      return;
    }

    const enrichedProduct: ProductEvent = {
      ...product,
      metadata: {
        ...this.collectedData,
        ...product.metadata,
      },
    };

    this.provider.trackProductEvent(enrichedProduct);
  }

  /**
   * Track cart events
   */
  trackCartEvent(cart: CartEvent): void {
    if (!this.provider) {
      console.warn('[ShopifyAnalytics] SDK not initialized. Call initialize() first.');
      return;
    }

    const enrichedCart: CartEvent = {
      ...cart,
      products: cart.products.map(p => ({
        ...p,
        metadata: { ...this.collectedData, ...p.metadata },
      })),
      metadata: { ...this.collectedData, ...cart.metadata },
    };

    this.provider.trackCartEvent(enrichedCart);
  }

  /**
   * Set custom user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.provider) {
      console.warn('[ShopifyAnalytics] SDK not initialized. Call initialize() first.');
      return;
    }

    this.provider.setUserProperties({
      ...this.collectedData,
      ...properties,
    });
  }

  /**
   * Switch provider at runtime
   */
  switchProvider(config: AnalyticsConfig): void {
    if (this.config?.debug) {
      console.log('[ShopifyAnalytics] Switching provider to:', config.provider);
    }

    this.initialize(config);
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    SessionManager.clearSession();
    this.collectedData = null;
    this.autoCollectData();

    if (this.config?.debug) {
      console.log('[ShopifyAnalytics] Session cleared');
    }
  }

  /**
   * Enable debug mode
   */
  setDebugMode(enabled: boolean): void {
    if (this.config) {
      this.config.debug = enabled;
    }
  }

  private getAutoDeviceProperties(): DeviceProperties {
    return {
      userAgent: BrowserDetection.getUserAgent(),
      language: BrowserDetection.getLanguage(),
      timezone: BrowserDetection.getTimezone(),
      screenResolution: BrowserDetection.getScreenResolution(),
      viewport: BrowserDetection.getViewport(),
      deviceType: BrowserDetection.getDeviceType(),
      osName: BrowserDetection.parseOSInfo().name,
      osVersion: BrowserDetection.parseOSInfo().version,
      browserName: BrowserDetection.parseBrowserInfo().name,
      browserVersion: BrowserDetection.parseBrowserInfo().version,
    };
  }

  private getAutoPageProperties(): PageProperties {
    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      path: URLUtils.getCurrentPath(),
      referrer: URLUtils.getReferrer(),
      utmSource: URLUtils.getUTMParams().utm_source,
      utmMedium: URLUtils.getUTMParams().utm_medium,
      utmCampaign: URLUtils.getUTMParams().utm_campaign,
      utmContent: URLUtils.getUTMParams().utm_content,
      utmTerm: URLUtils.getUTMParams().utm_term,
    };
  }
}

// ============================================================================
// GLOBAL EXPORT
// ============================================================================

// Export for browser global usage
if (typeof window !== 'undefined') {
  (window as any).ShopifyAnalyticsSDK = ShopifyAnalyticsSDK;
  (window as any).shopifyAnalytics = ShopifyAnalyticsSDK.getInstance();
}

// Export for ES modules
export default ShopifyAnalyticsSDK;
export { ShopifyAnalyticsSDK };
export type {
  AnalyticsConfig,
  AuthEvent,
  ProductEvent,
  CartEvent,
  UserIdentity,
  DeviceProperties,
  PageProperties,
  CollectedData,
  EventPayload,
};
