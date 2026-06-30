/**
 * Shopify Analytics SDK - Main Entry Point
 * Supports mParticle, GA4, Meta Pixel, and Segment
 */

import { CustomPixelIntegration } from './integrations/custom-pixel-integration';
import { AnalyticsConfig } from './types';
import { isBrowser } from './utils';

// Export all types and classes
export * from './types';
export * from './providers';
export * from './core/context-collector';
export { CustomPixelIntegration };

// Global type declarations
declare global {
  interface Window {
    ShopifyAnalytics: CustomPixelIntegration;
    ShopifyAnalyticsConfig?: AnalyticsConfig;
  }
}

// Auto-initialize if config is available
if (isBrowser()) {
  const w = window as any;
  if (w.ShopifyAnalyticsConfig) {
    const config = w.ShopifyAnalyticsConfig as AnalyticsConfig;
    w.ShopifyAnalytics = new CustomPixelIntegration(config);
  }
}
