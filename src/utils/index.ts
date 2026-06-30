/**
 * Utility Functions Barrel Export
 */

export * from './browser';
export * from './logger';

export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
