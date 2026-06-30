/**
 * Custom Pixel Integration - Main Analytics Entry Point
 * Currently supports mParticle with login tracking
 */

import { AnalyticsConfig, EventData, UserIdentity, IProvider } from '../types';
import { ContextCollector } from '../core/context-collector';
import { MParticleProvider } from '../providers';
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

        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }

      this.logger.log(`${config.provider} provider initialized`);
    } catch (error) {
      this.logger.error('Failed to initialize provider', error);
    }
  }

  // ========================================================================
  // USER MANAGEMENT - LOGIN TRACKING
  // ========================================================================

  /**
   * Track successful login
   * @param userId - Unique user identifier
   * @param email - User email address
   * @param attributes - Optional custom attributes
   */
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

  /**
   * Track failed login attempt
   * @param reason - Reason for login failure
   * @param attributes - Optional custom attributes
   */
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
      this.setupCustomEventListeners();
      this.logger.log('Auto-tracking setup complete');
    } catch (error) {
      this.logger.error('Failed to setup auto-tracking', error);
    }
  }

  private setupCustomEventListeners(): void {
    if (!isBrowser()) return;

    // Login success event
    document.addEventListener('shopify:analytics:login_success', (e: any) => {
      this.loginSuccess(e.detail?.userId, e.detail?.email, e.detail?.attributes);
    });

    // Login failure event
    document.addEventListener('shopify:analytics:login_failure', (e: any) => {
      this.loginFailure(e.detail?.reason, e.detail?.attributes);
    });
  }
}
