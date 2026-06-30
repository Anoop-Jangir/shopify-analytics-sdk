/**
 * Browser Utility Functions
 */

export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
};

export const getWindow = (): any => {
  return (typeof window !== 'undefined' ? window : {}) as any;
};

export const safeWindowAccess = <T>(callback: (w: any) => T, defaultValue: T): T => {
  try {
    if (!isBrowser()) return defaultValue;
    return callback(getWindow());
  } catch (error) {
    console.warn('[Analytics] Safe window access failed:', error);
    return defaultValue;
  }
};
