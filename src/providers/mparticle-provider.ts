/**
 * mParticle Provider Implementation
 */

import { IProvider, UserIdentity, EventData, CommerceData } from '../types';
import { isBrowser, Logger } from '../utils';

export class MParticleProvider implements IProvider {
  private logger: Logger;
  private contextCollector: any;

  constructor(apiKey: string, debug = false) {
    this.logger = new Logger('MParticle', debug);
    this.loadSDK(apiKey);
  }

  private loadSDK(apiKey: string): void {
    if (!isBrowser()) return;

    const w = window as any;

    if (w.mParticle) {
      this.logger.log('mParticle already loaded');
      return;
    }

    const config: any = {
      isDevelopmentMode: this.logger['debug'],
    };

    w.mParticle = {
      config: config,
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://cdn-api.mparticle.com/JS/${apiKey}/mparticle.js`;
    script.onload = () => this.logger.log('SDK loaded');
    script.onerror = () => this.logger.error('Failed to load SDK');
    document.head.appendChild(script);
  }

  identify(identity: UserIdentity): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      if (!w.mParticle?.Identity) {
        this.logger.log('Identity not ready');
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

      w.mParticle.Identity.login(identityRequest);
      this.logger.log('User identified:', identity.id);
    } catch (error) {
      this.logger.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      if (!w.mParticle?.logEvent) {
        this.logger.log('logEvent not ready');
        return;
      }

      const attributes = {
        ...event.properties,
        ...event.context,
      };

      w.mParticle.logEvent(event.name, w.mParticle.EventType?.Custom || 1, attributes);
      this.logger.log('Event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      if (!w.mParticle?.eCommerce) {
        this.logger.log('eCommerce not ready');
        return;
      }

      const product = new w.mParticle.Product(
        data.productName || 'Unknown',
        data.productId || 'unknown',
        data.price || 0,
        data.quantity || 1
      );

      const transactionAttributes: any = {
        transactionId: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      };

      if (data.currency) {
        transactionAttributes.currency = data.currency;
      }

      if (data.cartValue) {
        transactionAttributes.revenue = data.cartValue;
      }

      const eventNameLower = event.name.toLowerCase();

      switch (eventNameLower) {
        case 'add_to_cart':
          w.mParticle.eCommerce.addToCart(product);
          break;
        case 'remove_from_cart':
          w.mParticle.eCommerce.removeFromCart(product);
          break;
        case 'purchase':
          w.mParticle.eCommerce.logPurchase(transactionAttributes, [product]);
          break;
      }

      this.logger.log('Commerce event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      if (!w.mParticle?.logPageView) {
        this.logger.log('logPageView not ready');
        return;
      }

      w.mParticle.logPageView(eventName, properties || {});
      this.logger.log('Page view tracked:', eventName);
    } catch (error) {
      this.logger.error('Failed to track page view', error);
    }
  }
}
