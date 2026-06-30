/**
 * mParticle Provider Implementation
 */

import { IProvider, UserIdentity, EventData } from '../types';
import { isBrowser, Logger } from '../utils';

export class MParticleProvider implements IProvider {
  private logger: Logger;

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

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://cdn-api.mparticle.com/JS/${apiKey}/mparticle.js`;
    script.onload = () => this.logger.log('SDK loaded successfully');
    script.onerror = () => this.logger.error('Failed to load SDK');
    document.head.appendChild(script);
  }

  identify(identity: UserIdentity): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      // Wait for mParticle to be ready
      if (!w.mParticle?.Identity) {
        this.logger.log('mParticle Identity not ready, retrying...');
        setTimeout(() => this.identify(identity), 1000);
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
        this.logger.log('mParticle logEvent not ready');
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

  page(eventName: string, properties?: Record<string, unknown>): void {
    try {
      if (!isBrowser()) return;

      const w = window as any;

      if (!w.mParticle?.logPageView) {
        this.logger.log('mParticle logPageView not ready');
        return;
      }

      w.mParticle.logPageView(eventName, properties || {});
      this.logger.log('Page view tracked:', eventName);
    } catch (error) {
      this.logger.error('Failed to track page view', error);
    }
  }
}
