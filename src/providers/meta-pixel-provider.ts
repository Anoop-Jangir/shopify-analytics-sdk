/**
 * Meta Pixel Provider Implementation
 */

import { IProvider, UserIdentity, EventData, CommerceData } from '../types';
import { isBrowser, Logger } from '../utils';

export class MetaPixelProvider implements IProvider {
  private logger: Logger;

  constructor(pixelId: string, debug = false) {
    this.logger = new Logger('MetaPixel', debug);
    this.loadSDK(pixelId);
  }

  private loadSDK(pixelId: string): void {
    if (!isBrowser()) return;

    const w = window as any;

    if (w.fbq) {
      this.logger.log('Meta Pixel already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    w.fbq = function (...args: any[]) {
      if (w.fbq.callMethod) {
        w.fbq.callMethod.apply(w.fbq, args);
      } else {
        w.fbq.queue.push(args);
      }
    };

    w.fbq.push = w.fbq;
    w.fbq.queue = [];
    w.fbq.loaded = true;
    w.fbq('init', pixelId);
    w.fbq('track', 'PageView');

    this.logger.log('Meta Pixel SDK loaded');
  }

  identify(identity: UserIdentity): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      const userData = {
        em: identity.email,
        fn: identity.firstName,
        ln: identity.lastName,
        ph: identity.phone,
      };

      w.fbq?.('setUserData', userData);
      this.logger.log('User identified:', identity.id);
    } catch (error) {
      this.logger.error('Failed to identify user', error);
    }
  }

  track(event: EventData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.fbq?.('track', 'Custom', event.properties);
      this.logger.log('Event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      const eventData: any = {
        content_name: data.productName,
        content_ids: [data.productId],
        content_type: 'product',
        value: data.price || 0,
        currency: data.currency || 'USD',
      };

      let metaEvent = 'ViewContent';

      const eventNameLower = event.name.toLowerCase();

      switch (eventNameLower) {
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

      w.fbq?.('track', metaEvent, eventData);
      this.logger.log('Commerce event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.fbq?.('track', 'PageView', properties || {});
      this.logger.log('Page view tracked:', eventName);
    } catch (error) {
      this.logger.error('Failed to track page view', error);
    }
  }
}
