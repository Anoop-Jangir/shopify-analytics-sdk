/**
 * Context Collector - Gathers browser and page context data
 */

import { ContextData, UTMParams } from '../types';
import { isBrowser, Logger } from '../utils';

export class ContextCollector {
  private static instance: ContextCollector;
  private sessionId: string;
  private anonymousId: string;
  private logger: Logger;

  private constructor(debug: boolean = false) {
    this.logger = new Logger('ContextCollector', debug);
    this.sessionId = this.generateId('session');
    this.anonymousId = this.generateId('anon');
  }

  static getInstance(debug: boolean = false): ContextCollector {
    if (!ContextCollector.instance) {
      ContextCollector.instance = new ContextCollector(debug);
    }
    return ContextCollector.instance;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private parseUTMParameters(): UTMParams {
    const params: UTMParams = {};

    if (!isBrowser()) return params;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmKeys = ['source', 'medium', 'campaign', 'content', 'term'] as const;

      utmKeys.forEach((key) => {
        const value = urlParams.get(`utm_${key}`);
        if (value) {
          params[key] = value;
        }
      });
    } catch (error) {
      this.logger.warn('Failed to parse UTM parameters');
    }

    return params;
  }

  private getUserAgent() {
    if (!isBrowser()) {
      return {
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        osVersion: 'Unknown',
        device: 'Unknown',
      };
    }

    const ua = navigator.userAgent;
    const browserMatch = ua.match(/(?:Chrome|Safari|Firefox|Edge|Opera)\/(\d+)/i) || [];
    const osMatch = ua.match(/(?:Windows|Mac|Linux|Android|iOS)(?:\s|\/|;)(\d+)?/i) || [];

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

    if (!isBrowser()) {
      return {
        ...ua,
        screenResolution: 'Unknown',
        viewport: 'Unknown',
        language: 'Unknown',
        timezone: 'Unknown',
        url: '',
        path: '',
        referrer: 'Unknown',
        utmParameters: {},
        timestamp: Date.now(),
        sessionId: this.sessionId,
        anonymousId: this.anonymousId,
      };
    }

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
