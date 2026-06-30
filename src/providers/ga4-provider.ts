/**
 * GA4 Provider Implementation
 */

import { IProvider, UserIdentity, EventData, CommerceData } from '../types';
import { isBrowser, Logger } from '../utils';

export class GA4Provider implements IProvider {
  private logger: Logger;

  constructor(measurementId: string, debug = false) {
    this.logger = new Logger('GA4', debug);
    this.loadSDK(measurementId);
  }

  private loadSDK(measurementId: string): void {
    if (!isBrowser()) return;

    const w = window as any;

    if (w.gtag) {
      this.logger.log('GA4 already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    w.dataLayer = w.dataLayer || [];

    const gtag = function (...args: any[]) {
      w.dataLayer.push(arguments);
    };

    w.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {
      debug_mode: this.logger['debug'],
    });

    this.logger.log('GA4 SDK loaded');
  }

  identify(identity: UserIdentity): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.gtag?.('set', {
        user_id: identity.id,
        user_properties: {
          email: identity.email,
          first_name: identity.firstName,
          last_name: identity.lastName,
          phone: identity.phone,
          ...identity.customAttributes,
        },
      });

      this.logger.log('User identified:', identity.id);
    } catch (error) {
      this.logger.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.gtag?.('event', event.name, event.properties);
      this.logger.log('Event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

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

      w.gtag?.('event', event.name, eventData);
      this.logger.log('Commerce event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.gtag?.('event', 'page_view', {
        page_title: eventName,
        ...properties,
      });

      this.logger.log('Page view tracked:', eventName);
    } catch (error) {
      this.logger.error('Failed to track page view', error);
    }
  }
}
