/**
 * Error handling type definitions
 */

export enum ErrorCategory {
  Model = 'model',
  Inference = 'inference',
  Storage = 'storage',
  Network = 'network',
  Unknown = 'unknown'
}

export interface AppError {
  code: string;
  message: string;
  category: ErrorCategory;
  recoverable: boolean;
  userMessage: string;
  technicalDetails?: any;
}

export interface ErrorRecovery {
  action: 'retry' | 'fallback' | 'abort' | 'ignore';
  message: string;
  retryDelay?: number;
}
