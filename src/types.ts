/**
 * Type Definitions for Shopify Analytics SDK
 */

export interface ContextData {
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

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface UserIdentity {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  customAttributes?: Record<string, unknown>;
}

export interface EventData {
  name: string;
  type: 'custom' | 'commerce' | 'page';
  properties: Record<string, unknown>;
  context?: Partial<ContextData>;
  userId?: string;
}

export interface AnalyticsConfig {
  provider: 'mparticle' | 'ga4' | 'meta' | 'segment';
  mparticleKey?: string;
  ga4Id?: string;
  metaPixelId?: string;
  segmentKey?: string;
  debug?: boolean;
}

export interface CommerceData {
  productId?: string;
  productName?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  cartValue?: number;
  cartItems?: number;
}

export interface IProvider {
  identify(identity: UserIdentity): void;
  track(event: EventData): void;
  commerce(event: EventData, data: CommerceData): void;
  page(eventName: string, properties?: Record<string, unknown>): void;
}
