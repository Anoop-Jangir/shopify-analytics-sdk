/**
 * Segment Provider Implementation
 */

import { IProvider, UserIdentity, EventData, CommerceData } from '../types';
import { isBrowser, Logger } from '../utils';

export class SegmentProvider implements IProvider {
  private logger: Logger;

  constructor(writeKey: string, debug = false) {
    this.logger = new Logger('Segment', debug);
    this.loadSDK(writeKey);
  }

  private loadSDK(writeKey: string): void {
    if (!isBrowser()) return;

    const w = window as any;

    if (w.analytics) {
      this.logger.log('Segment already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://cdn.segment.com/analytics.js/v1/${writeKey}/analytics.min.js`;
    document.head.appendChild(script);

    w.analytics = w.analytics || [];

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
      w.analytics[method] = function (...args: any[]) {
        w.analytics.push([method, ...args]);
      };
    });

    w.analytics.load = (key: string) => {
      const config = { apiKey: key };
      w.analytics._loadOptions = config;
    };

    w.analytics.SNIPPET_VERSION = '4.15.3';
    w.analytics.load(writeKey);

    this.logger.log('Segment SDK loaded');
  }

  identify(identity: UserIdentity): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.analytics?.identify(identity.id, {
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        phone: identity.phone,
        ...identity.customAttributes,
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

      w.analytics?.track(event.name, event.properties);
      this.logger.log('Event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track event', error);
    }
  }

  commerce(event: EventData, data: CommerceData): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

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

      w.analytics?.track(event.name, properties);
      this.logger.log('Commerce event tracked:', event.name);
    } catch (error) {
      this.logger.error('Failed to track commerce event', error);
    }
  }

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      w.analytics?.page(eventName, properties || {});
      this.logger.log('Page view tracked:', eventName);
    } catch (error) {
      this.logger.error('Failed to track page view', error);
    }
  }
}
