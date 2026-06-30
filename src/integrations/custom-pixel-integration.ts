/**
 * Custom Pixel Integration - Main Analytics Entry Point
 */

import {
  AnalyticsConfig,
  CommerceData,
  EventData,
  UserIdentity,
  IProvider,
} from '../types';
import { ContextCollector } from '../core/context-collector';
import { MParticleProvider, GA4Provider, MetaPixelProvider, SegmentProvider } from '../providers';
import { isBrowser, Logger } from '../utils';

export class CustomPixelIntegration {
  private provider: IProvider | null = null;
  private contextCollector: ContextCollector;
  private logger: Logger;
  private trackedEvents: Map<string, number> = new Map();
  private readonly EVENT_THROTTLE_WINDOW = 60000; // 60 seconds

  constructor(config: AnalyticsConfig) {
    this.logger = new Logger('Analytics', config.debug || false);
    this.contextCollector = ContextCollector.getInstance(config.debug);
    this.initializeProvider(config);

    if (isBrowser()) {
      this.setupAutoTracking();
    }
  }

  private initializeProvider(config: AnalyticsConfig): void {
    try {
      switch (config.provider) {
        case 'mparticle':
          if (!config.mparticleKey) {
            throw new Error('mParticle API key is required');
          }
          this.provider = new MParticleProvider(config.mparticleKey, config.debug);
          break;

        case 'ga4':
          if (!config.ga4Id) {
            throw new Error('GA4 Measurement ID is required');
          }
          this.provider = new GA4Provider(config.ga4Id, config.debug);
          break;

        case 'meta':
          if (!config.metaPixelId) {
            throw new Error('Meta Pixel ID is required');
          }
          this.provider = new MetaPixelProvider(config.metaPixelId, config.debug);
          break;

        case 'segment':
          if (!config.segmentKey) {
            throw new Error('Segment Write Key is required');
          }
          this.provider = new SegmentProvider(config.segmentKey, config.debug);
          break;

        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }

      this.logger.log(`${config.provider} provider initialized`);
    } catch (error) {
      this.logger.error('Failed to initialize provider', error);
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
      this.trackOnce('login_success', {
        userId,
        email,
        timestamp: Date.now(),
      });

      this.logger.log('Login success tracked:', userId);
    } catch (error) {
      this.logger.error('Failed to track login success', error);
    }
  }

  loginFailure(reason?: string, attributes?: Record<string, unknown>): void {
    try {
      this.track('login_failure', {
        reason: reason || 'unknown',
        timestamp: Date.now(),
        ...attributes,
      });

      this.logger.log('Login failure tracked:', reason);
    } catch (error) {
      this.logger.error('Failed to track login failure', error);
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
      this.trackOnce('account_created', {
        userId,
        email,
        timestamp: Date.now(),
      });

      this.logger.log('Account created tracked:', userId);
    } catch (error) {
      this.logger.error('Failed to track account created', error);
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

      this.logger.log('Cart viewed tracked');
    } catch (error) {
      this.logger.error('Failed to track cart viewed', error);
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

      this.logger.log('Product viewed tracked:', productData.productId);
    } catch (error) {
      this.logger.error('Failed to track product viewed', error);
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

      this.logger.log('Product added to cart tracked:', productData.productId);
    } catch (error) {
      this.logger.error('Failed to track product added to cart', error);
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

      this.logger.log('Product removed from cart tracked:', productData.productId);
    } catch (error) {
      this.logger.error('Failed to track product removed from cart', error);
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

      this.logger.log('Checkout started tracked');
    } catch (error) {
      this.logger.error('Failed to track checkout started', error);
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

      this.trackOnce('purchase_completed', {
        itemCount: cartData.length,
        totalValue: cartData.reduce((sum, item) => sum + (item.cartValue || 0), 0),
        timestamp: Date.now(),
      });

      this.logger.log('Purchase completed tracked');
    } catch (error) {
      this.logger.error('Failed to track purchase completed', error);
    }
  }

  // ========================================================================
  // GENERIC TRACKING
  // ========================================================================

  private trackOnce(eventName: string, properties?: Record<string, unknown>): void {
    const lastTracked = this.trackedEvents.get(eventName);
    const now = Date.now();

    if (lastTracked && now - lastTracked < this.EVENT_THROTTLE_WINDOW) {
      this.logger.log(`Event throttled (tracked recently): ${eventName}`);
      return;
    }

    this.trackedEvents.set(eventName, now);
    this.track(eventName, properties);
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!this.provider) {
        this.logger.log('Provider not initialized yet');
        return;
      }

      const context = this.contextCollector.collect();

      const eventData: EventData = {
        name: eventName,
        type: 'custom',
        properties: properties || {},
        context,
      };

      this.provider.track(eventData);
    } catch (error) {
      this.logger.error('Failed to track event', error);
    }
  }

  page(pageName: string, properties?: Record<string, unknown>): void {
    try {
      if (!this.provider) {
        this.logger.log('Provider not initialized yet');
        return;
      }

      this.provider.page(pageName, properties);
      this.logger.log('Page tracked:', pageName);
    } catch (error) {
      this.logger.error('Failed to track page', error);
    }
  }

  // ========================================================================
  // AUTO TRACKING
  // ========================================================================

  private setupAutoTracking(): void {
    try {
      this.detectPageType();
      this.setupCustomEventListeners();
      this.logger.log('Auto-tracking setup complete');
    } catch (error) {
      this.logger.error('Failed to setup auto-tracking', error);
    }
  }

  private detectPageType(): void {
    if (!isBrowser()) return;

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
    if (!isBrowser()) return;

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
}
