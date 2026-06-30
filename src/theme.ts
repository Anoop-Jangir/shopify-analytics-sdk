/**
 * Shopify Analytics SDK - Theme Integration
 * Supports mParticle, GA4, Meta Pixel, and Segment
 * Single file for inclusion in theme.js
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContextData {
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
  utmParameters: UTMParams;
  timestamp: number;
  sessionId: string;
  anonymousId: string;
}

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface UserIdentity {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  customAttributes?: Record<string, unknown>;
}

interface EventData {
  name: string;
  type: 'custom' | 'commerce' | 'page';
  properties: Record<string, unknown>;
  context?: Partial<ContextData>;
  userId?: string;
}

interface AnalyticsConfig {
  provider: 'mparticle' | 'ga4' | 'meta' | 'segment';
  mparticleKey?: string;
  ga4Id?: string;
  metaPixelId?: string;
  segmentKey?: string;
  debug?: boolean;
}

interface CommerceData {
  productId?: string;
  productName?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  cartValue?: number;
  cartItems?: number;
}

// ============================================================================
// CONTEXT COLLECTOR
// ============================================================================

class ContextCollector {
  private static instance: ContextCollector;
  private sessionId: string;
  private anonymousId: string;

  private constructor() {
    this.sessionId = this.generateId('session');
    this.anonymousId = this.generateId('anon');
  }

  static getInstance(): ContextCollector {
    if (!ContextCollector.instance) {
      ContextCollector.instance = new ContextCollector();
    }
    return ContextCollector.instance;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseUTMParameters(): UTMParams {
    const params: UTMParams = {};
    const urlParams = new URLSearchParams(window.location.search);

    const utmKeys = ['source', 'medium', 'campaign', 'content', 'term'] as const;
    utmKeys.forEach((key) => {
      const value = urlParams.get(`utm_${key}`);
      if (value) {
        params[key] = value;
      }
    });

    return params;
  }

  private getUserAgent() {
    const ua = navigator.userAgent;
    const browserMatch =
      ua.match(/(?:Chrome|Safari|Firefox|Edge|Opera)\/(\d+)/i) || [];
    const osMatch =
      ua.match(/(?:Windows|Mac|Linux|Android|iOS)(?:\s|\/|;)(\d+)?/i) || [];

    return {
      browser: browserMatch[0]?.split('/')[0] || 'Unknown',
      browserVersion: browserMatch[1] || 'Unknown',
      os: osMatch[0]?.split(/[\s\/;]/)[0] || 'Unknown',
      osVersion: osMatch[1] || 'Unknown',
      device: /Mobile|Tablet|iPad|iPhone/.test(ua) ? 'Mobile' : 'Desktop',
    };
  }

  collect(): ContextData {
    const ua = this.getUserAgent();

    return {
      ...ua,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language || 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || 'Direct',
      utmParameters: this.parseUTMParameters(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
    };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getAnonymousId(): string {
    return this.anonymousId;
  }
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

interface IProvider {
  identify(identity: UserIdentity): void;
  track(event: EventData): void;
  commerce(event: EventData, data: CommerceData): void;
  page(eventName: string, properties?: Record<string, unknown>): void;
}

// ============================================================================
// MPARTICLE PROVIDER
// ============================================================================

class MParticleProvider implements IProvider {
  private window: any = globalThis as any;
  private debug: boolean;
  private contextCollector: ContextCollector;

  constructor(apiKey: string, debug = false) {
    this.debug = debug;
    this.contextCollector = ContextCollector.getInstance();
    this.loadSDK(apiKey);
  }

  private loadSDK(apiKey: string): void {
    if (this.window.mParticle) {
      this.log('mParticle already loaded');
      return;
    }

    const config: any = {
      isDevelopmentMode: this.debug,
    };

    this.window.mParticle = {
      config: config,
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://cdn-api.mparticle.com/JS/${apiKey}/mparticle.js`;
    script.onload = () => this.log('mParticle SDK loaded');
    script.onerror = () => this.error('Failed to load mParticle SDK');
    document.head.appendChild(script);
  }

  identify(identity: UserIdentity): void {
    try {
      if (!this.window.mParticle?.Identity) {
        this.log('mParticle Identity not ready');
        return;
      }

      const identityRequest: any = {
        userIdentities: {
          customerid: identity.id,
          email: identity.email,
        },
      };

      if (identity.firstName || identity.lastName) {
        identityRequest.userAttributes = {
          $FirstName: identity.firstName,
          $LastName: identity.lastName,
        };
      }

      if (identity.phone) {
        identityRequest.userAttributes = {
          ...identityRequest.userAttributes,
          $Phone: identity.phone,
        };
      }

      if (identity.customAttributes) {
        identityRequest.userAttributes = {
          ...identityRequest.userAttributes,
          ...identity.customAttributes,
        };
      }

      this.window.mParticle.Identity.login(identityRequest);
      this.log('User identified', identity);
    } catch (error) {
      this.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      if (!this.window.mParticle?.logEvent) {
        this.log('mParticle logEvent not ready');
        return;
      }

      const attributes = {
        ...event.properties,
        ...event.context,
      };

      this.window.mParticle.logEvent(
        event.name,
        this.window.mParticle.EventType.Custom,
        attributes
      );

      this.log('Event tracked', event.name);
    } catch (error) {
      this.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      if (!this.window.mParticle?.eCommerce) {
        this.log('mParticle eCommerce not ready');
        return;
      }

      const product = new this.window.mParticle.Product(
        data.productName || 'Unknown',
        data.productId || 'unknown',
        data.price || 0,
        data.quantity || 1
      );

      const transactionAttributes: any = {
        transactionId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      if (data.currency) {
        transactionAttributes.currency = data.currency;
      }

      if (data.cartValue) {
        transactionAttributes.revenue = data.cartValue;
      }

      switch (event.name.toLowerCase()) {
        case 'add_to_cart':
          this.window.mParticle.eCommerce.addToCart(product);
          break;
        case 'remove_from_cart':
          this.window.mParticle.eCommerce.removeFromCart(product);
          break;
        case 'purchase':
          this.window.mParticle.eCommerce.logPurchase(
            transactionAttributes,
            [product]
          );
          break;
      }

      this.log('Commerce event tracked', event.name);
    } catch (error) {
      this.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!this.window.mParticle?.logPageView) {
        this.log('mParticle logPageView not ready');
        return;
      }

      this.window.mParticle.logPageView(eventName, properties || {});
      this.log('Page view tracked', eventName);
    } catch (error) {
      this.error('Failed to track page view', error);
    }
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[MParticle]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    console.error('[MParticle Error]', ...args);
  }
}

// ============================================================================
// GA4 PROVIDER
// ============================================================================

class GA4Provider implements IProvider {
  private window: any = globalThis as any;
  private debug: boolean;
  private contextCollector: ContextCollector;

  constructor(measurementId: string, debug = false) {
    this.debug = debug;
    this.contextCollector = ContextCollector.getInstance();
    this.loadSDK(measurementId);
  }

  private loadSDK(measurementId: string): void {
    if (this.window.gtag) {
      this.log('GA4 already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    this.window.dataLayer = this.window.dataLayer || [];

    const gtag = function (...args: any[]) {
      this.window.dataLayer.push(arguments);
    };

    this.window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {
      debug_mode: this.debug,
    });

    this.log('GA4 SDK loaded');
  }

  identify(identity: UserIdentity): void {
    try {
      this.window.gtag?.('set', {
        user_id: identity.id,
        user_properties: {
          email: identity.email,
          first_name: identity.firstName,
          last_name: identity.lastName,
          phone: identity.phone,
          ...identity.customAttributes,
        },
      });

      this.log('User identified', identity);
    } catch (error) {
      this.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      this.window.gtag?.('event', event.name, event.properties);
      this.log('Event tracked', event.name);
    } catch (error) {
      this.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      const items = [
        {
          item_id: data.productId,
          item_name: data.productName,
          price: data.price,
          quantity: data.quantity,
        },
      ];

      const eventData: any = {
        items: items,
        currency: data.currency || 'USD',
      };

      if (data.cartValue) {
        eventData.value = data.cartValue;
      }

      this.window.gtag?.('event', event.name, eventData);
      this.log('Commerce event tracked', event.name);
    } catch (error) {
      this.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      this.window.gtag?.('event', 'page_view', {
        page_title: eventName,
        ...properties,
      });

      this.log('Page view tracked', eventName);
    } catch (error) {
      this.error('Failed to track page view', error);
    }
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[GA4]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    console.error('[GA4 Error]', ...args);
  }
}

// ============================================================================
// META PIXEL PROVIDER
// ============================================================================

class MetaPixelProvider implements IProvider {
  private window: any = globalThis as any;
  private debug: boolean;
  private contextCollector: ContextCollector;

  constructor(pixelId: string, debug = false) {
    this.debug = debug;
    this.contextCollector = ContextCollector.getInstance();
    this.loadSDK(pixelId);
  }

  private loadSDK(pixelId: string): void {
    if (this.window.fbq) {
      this.log('Meta Pixel already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    this.window.fbq = function (...args: any[]) {
      if (this.window.fbq.callMethod) {
        this.window.fbq.callMethod.apply(this.window.fbq, args);
      } else {
        this.window.fbq.queue.push(args);
      }
    };

    this.window.fbq.push = this.window.fbq;
    this.window.fbq.queue = [];
    this.window.fbq.loaded = true;
    this.window.fbq('init', pixelId);
    this.window.fbq('track', 'PageView');

    this.log('Meta Pixel SDK loaded');
  }

  identify(identity: UserIdentity): void {
    try {
      const userData = {
        em: identity.email,
        fn: identity.firstName,
        ln: identity.lastName,
        ph: identity.phone,
      };

      this.window.fbq?.('setUserData', userData);
      this.log('User identified', identity);
    } catch (error) {
      this.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      this.window.fbq?.('track', 'Custom', event.properties);
      this.log('Event tracked', event.name);
    } catch (error) {
      this.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      const eventData: any = {
        content_name: data.productName,
        content_ids: [data.productId],
        content_type: 'product',
        value: data.price || 0,
        currency: data.currency || 'USD',
      };

      let metaEvent = 'ViewContent';

      switch (event.name.toLowerCase()) {
        case 'add_to_cart':
          metaEvent = 'AddToCart';
          break;
        case 'initiate_checkout':
          metaEvent = 'InitiateCheckout';
          break;
        case 'purchase':
          metaEvent = 'Purchase';
          eventData.value = data.cartValue || data.price || 0;
          break;
        case 'search':
          metaEvent = 'Search';
          break;
      }

      this.window.fbq?.('track', metaEvent, eventData);
      this.log('Commerce event tracked', event.name);
    } catch (error) {
      this.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      this.window.fbq?.('track', 'PageView', properties || {});
      this.log('Page view tracked', eventName);
    } catch (error) {
      this.error('Failed to track page view', error);
    }
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[Meta Pixel]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    console.error('[Meta Pixel Error]', ...args);
  }
}

// ============================================================================
// SEGMENT PROVIDER
// ============================================================================

class SegmentProvider implements IProvider {
  private window: any = globalThis as any;
  private debug: boolean;
  private contextCollector: ContextCollector;

  constructor(writeKey: string, debug = false) {
    this.debug = debug;
    this.contextCollector = ContextCollector.getInstance();
    this.loadSDK(writeKey);
  }

  private loadSDK(writeKey: string): void {
    if (this.window.analytics) {
      this.log('Segment already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://cdn.segment.com/analytics.js/v1/${writeKey}/analytics.min.js`;
    document.head.appendChild(script);

    this.window.analytics = this.window.analytics || [];

    const methods = [
      'trackSubmit',
      'trackClick',
      'trackLink',
      'trackForm',
      'pageview',
      'identify',
      'reset',
      'group',
      'track',
      'ready',
      'alias',
      'debug',
      'page',
      'once',
      'off',
      'on',
    ];

    methods.forEach((method) => {
      this.window.analytics[method] = function (...args: any[]) {
        this.window.analytics.push([method, ...args]);
      };
    });

    this.window.analytics.load = (key: string) => {
      const config = { apiKey: key };
      this.window.analytics._loadOptions = config;
    };

    this.window.analytics.SNIPPET_VERSION = '4.15.3';
    this.window.analytics.load(writeKey);

    this.log('Segment SDK loaded');
  }

  identify(identity: UserIdentity): void {
    try {
      this.window.analytics?.identify(identity.id, {
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        phone: identity.phone,
        ...identity.customAttributes,
      });

      this.log('User identified', identity);
    } catch (error) {
      this.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      this.window.analytics?.track(event.name, event.properties);
      this.log('Event tracked', event.name);
    } catch (error) {
      this.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      const properties: any = {
        productId: data.productId,
        productName: data.productName,
        price: data.price,
        quantity: data.quantity,
        currency: data.currency || 'USD',
      };

      if (data.cartValue) {
        properties.cartValue = data.cartValue;
      }

      this.window.analytics?.track(event.name, properties);
      this.log('Commerce event tracked', event.name);
    } catch (error) {
      this.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      this.window.analytics?.page(eventName, properties || {});
      this.log('Page view tracked', eventName);
    } catch (error) {
      this.error('Failed to track page view', error);
    }
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[Segment]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    console.error('[Segment Error]', ...args);
  }
}

// ============================================================================
// CUSTOM PIXEL INTEGRATION
// ============================================================================

class CustomPixelIntegration {
  private provider: IProvider | null = null;
  private contextCollector: ContextCollector;
  private debug: boolean;
  private trackedEvents: Set<string> = new Set();

  constructor(config: AnalyticsConfig) {
    this.debug = config.debug || false;
    this.contextCollector = ContextCollector.getInstance();
    this.initializeProvider(config);
    this.setupAutoTracking();
  }

  private initializeProvider(config: AnalyticsConfig): void {
    try {
      switch (config.provider) {
        case 'mparticle':
          if (!config.mparticleKey) {
            throw new Error('mParticle API key is required');
          }
          this.provider = new MParticleProvider(config.mparticleKey, this.debug);
          break;

        case 'ga4':
          if (!config.ga4Id) {
            throw new Error('GA4 Measurement ID is required');
          }
          this.provider = new GA4Provider(config.ga4Id, this.debug);
          break;

        case 'meta':
          if (!config.metaPixelId) {
            throw new Error('Meta Pixel ID is required');
          }
          this.provider = new MetaPixelProvider(config.metaPixelId, this.debug);
          break;

        case 'segment':
          if (!config.segmentKey) {
            throw new Error('Segment Write Key is required');
          }
          this.provider = new SegmentProvider(config.segmentKey, this.debug);
          break;

        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }

      this.log(`${config.provider} provider initialized`);
    } catch (error) {
      this.error('Failed to initialize provider', error);
    }
  }

  // ========================================================================
  // USER MANAGEMENT
  // ========================================================================

  loginSuccess(userId: string, email?: string, attributes?: Record<string, unknown>): void {
    try {
      const identity: UserIdentity = {
        id: userId,
        email,
        customAttributes: {
          loginStatus: 'success',
          loginTimestamp: Date.now(),
          ...attributes,
        },
      };

      this.provider?.identify(identity);
      this.track('login_success', {
        userId,
        email,
        timestamp: Date.now(),
      });

      this.log('Login success tracked', userId);
    } catch (error) {
      this.error('Failed to track login success', error);
    }
  }

  loginFailure(reason?: string, attributes?: Record<string, unknown>): void {
    try {
      this.track('login_failure', {
        reason: reason || 'unknown',
        timestamp: Date.now(),
        ...attributes,
      });

      this.log('Login failure tracked', reason);
    } catch (error) {
      this.error('Failed to track login failure', error);
    }
  }

  accountCreated(userId: string, email?: string, attributes?: Record<string, unknown>): void {
    try {
      const identity: UserIdentity = {
        id: userId,
        email,
        customAttributes: {
          accountStatus: 'created',
          createdAt: Date.now(),
          ...attributes,
        },
      };

      this.provider?.identify(identity);
      this.track('account_created', {
        userId,
        email,
        timestamp: Date.now(),
      });

      this.log('Account created tracked', userId);
    } catch (error) {
      this.error('Failed to track account created', error);
    }
  }

  // ========================================================================
  // CART MANAGEMENT
  // ========================================================================

  cartViewed(items: CommerceData[]): void {
    try {
      items.forEach((item) => {
        this.provider?.commerce(
          {
            name: 'cart_viewed',
            type: 'commerce',
            properties: {},
          },
          item
        );
      });

      this.track('cart_viewed', {
        itemCount: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.price || 0), 0),
        timestamp: Date.now(),
      });

      this.log('Cart viewed tracked');
    } catch (error) {
      this.error('Failed to track cart viewed', error);
    }
  }

  // ========================================================================
  // PRODUCT MANAGEMENT
  // ========================================================================

  productViewed(productData: CommerceData): void {
    try {
      this.provider?.commerce(
        {
          name: 'product_viewed',
          type: 'commerce',
          properties: {},
        },
        productData
      );

      this.track('product_viewed', {
        productId: productData.productId,
        productName: productData.productName,
        price: productData.price,
        timestamp: Date.now(),
      });

      this.log('Product viewed tracked', productData.productId);
    } catch (error) {
      this.error('Failed to track product viewed', error);
    }
  }

  productAddedToCart(productData: CommerceData): void {
    try {
      this.provider?.commerce(
        {
          name: 'add_to_cart',
          type: 'commerce',
          properties: {},
        },
        productData
      );

      this.track('product_added_to_cart', {
        productId: productData.productId,
        productName: productData.productName,
        price: productData.price,
        quantity: productData.quantity || 1,
        timestamp: Date.now(),
      });

      this.log('Product added to cart tracked', productData.productId);
    } catch (error) {
      this.error('Failed to track product added to cart', error);
    }
  }

  productRemovedFromCart(productData: CommerceData): void {
    try {
      this.provider?.commerce(
        {
          name: 'remove_from_cart',
          type: 'commerce',
          properties: {},
        },
        productData
      );

      this.track('product_removed_from_cart', {
        productId: productData.productId,
        productName: productData.productName,
        price: productData.price,
        quantity: productData.quantity || 1,
        timestamp: Date.now(),
      });

      this.log('Product removed from cart tracked', productData.productId);
    } catch (error) {
      this.error('Failed to track product removed from cart', error);
    }
  }

  // ========================================================================
  // CHECKOUT & PURCHASE
  // ========================================================================

  checkoutStarted(cartData: CommerceData[]): void {
    try {
      cartData.forEach((item) => {
        this.provider?.commerce(
          {
            name: 'initiate_checkout',
            type: 'commerce',
            properties: {},
          },
          item
        );
      });

      this.track('checkout_started', {
        itemCount: cartData.length,
        totalValue: cartData.reduce((sum, item) => sum + (item.cartValue || 0), 0),
        timestamp: Date.now(),
      });

      this.log('Checkout started tracked');
    } catch (error) {
      this.error('Failed to track checkout started', error);
    }
  }

  purchaseCompleted(cartData: CommerceData[]): void {
    try {
      cartData.forEach((item) => {
        this.provider?.commerce(
          {
            name: 'purchase',
            type: 'commerce',
            properties: {},
          },
          item
        );
      });

      this.track('purchase_completed', {
        itemCount: cartData.length,
        totalValue: cartData.reduce((sum, item) => sum + (item.cartValue || 0), 0),
        timestamp: Date.now(),
      });

      this.log('Purchase completed tracked');
    } catch (error) {
      this.error('Failed to track purchase completed', error);
    }
  }

  // ========================================================================
  // GENERIC TRACKING
  // ========================================================================

  track(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (this.trackedEvents.has(eventName)) {
        this.log(`Event already tracked in this session: ${eventName}`);
        return;
      }

      const context = this.contextCollector.collect();

      const eventData: EventData = {
        name: eventName,
        type: 'custom',
        properties: properties || {},
        context,
      };

      this.provider?.track(eventData);
      this.trackedEvents.add(eventName);
    } catch (error) {
      this.error('Failed to track event', error);
    }
  }

  page(pageName: string, properties?: Record<string, unknown>): void {
    try {
      this.provider?.page(pageName, properties);
      this.log('Page tracked', pageName);
    } catch (error) {
      this.error('Failed to track page', error);
    }
  }

  // ========================================================================
  // AUTO TRACKING
  // ========================================================================

  private setupAutoTracking(): void {
    try {
      // Detect page type
      this.detectPageType();

      // Listen for custom events
      this.setupCustomEventListeners();

      this.log('Auto-tracking setup complete');
    } catch (error) {
      this.error('Failed to setup auto-tracking', error);
    }
  }

  private detectPageType(): void {
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (path.includes('/products/') || path.includes('/product/')) {
      this.page('product_page');
    } else if (path.includes('/collections/') || path.includes('/collection/')) {
      this.page('collection_page');
    } else if (path.includes('/search') || search.includes('q=')) {
      this.page('search_page');
    } else if (path.includes('/cart')) {
      this.page('cart_page');
    } else if (path.includes('/account') || path.includes('/customer')) {
      this.page('account_page');
    } else if (path === '/' || path === '') {
      this.page('home_page');
    }
  }

  private setupCustomEventListeners(): void {
    document.addEventListener('shopify:analytics:login_success', (e: any) => {
      this.loginSuccess(e.detail?.userId, e.detail?.email, e.detail?.attributes);
    });

    document.addEventListener('shopify:analytics:login_failure', (e: any) => {
      this.loginFailure(e.detail?.reason, e.detail?.attributes);
    });

    document.addEventListener('shopify:analytics:account_created', (e: any) => {
      this.accountCreated(e.detail?.userId, e.detail?.email, e.detail?.attributes);
    });

    document.addEventListener('shopify:analytics:product_viewed', (e: any) => {
      this.productViewed(e.detail);
    });

    document.addEventListener('shopify:analytics:product_added_to_cart', (e: any) => {
      this.productAddedToCart(e.detail);
    });

    document.addEventListener('shopify:analytics:product_removed_from_cart', (e: any) => {
      this.productRemovedFromCart(e.detail);
    });

    document.addEventListener('shopify:analytics:cart_viewed', (e: any) => {
      this.cartViewed(e.detail);
    });

    document.addEventListener('shopify:analytics:checkout_started', (e: any) => {
      this.checkoutStarted(e.detail);
    });

    document.addEventListener('shopify:analytics:purchase_completed', (e: any) => {
      this.purchaseCompleted(e.detail);
    });
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[Analytics]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    console.error('[Analytics Error]', ...args);
  }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

declare global {
  interface Window {
    ShopifyAnalytics: CustomPixelIntegration;
  }
}

// Auto-initialize if config is available
if ((globalThis as any).window?.ShopifyAnalyticsConfig) {
  const config = (globalThis as any).window.ShopifyAnalyticsConfig as AnalyticsConfig;
  (globalThis as any).window.ShopifyAnalytics = new CustomPixelIntegration(config);
}

export {
  CustomPixelIntegration,
  MParticleProvider,
  GA4Provider,
  MetaPixelProvider,
  SegmentProvider,
  ContextCollector,
  AnalyticsConfig,
  EventData,
  UserIdentity,
  CommerceData,
  ContextData,
};
