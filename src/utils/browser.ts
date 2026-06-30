/**
 * Browser Utility Functions
 */

export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
};

export const getWindow = (): any => {
  return (typeof window !== 'undefined' ? window : {}) as any;
};
