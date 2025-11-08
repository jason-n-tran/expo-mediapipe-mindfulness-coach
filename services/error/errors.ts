/**
 * Specific error classes for different error categories
 */

import { AppError, ErrorCategory } from '@/types/error';

/**
 * Base class for application errors
 */
export class BaseAppError extends Error implements AppError {
  code: string;
  category: ErrorCategory;
  recoverable: boolean;
  userMessage: string;
  technicalDetails?: any;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    recoverable: boolean,
    userMessage: string,
    technicalDetails?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.recoverable = recoverable;
    this.userMessage = userMessage;
    this.technicalDetails = technicalDetails;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Model-related errors
 */
export class AppModelError extends BaseAppError {
  constructor(message: string, code: string, userMessage: string, technicalDetails?: any) {
    super(message, code, ErrorCategory.Model, true, userMessage, technicalDetails);
  }

  static notFound(details?: any): AppModelError {
    return new AppModelError(
      'Model not found in cache',
      'MODEL_NOT_FOUND',
      'The AI model is not available. Please download it to continue.',
      details
    );
  }

  static corrupted(details?: any): AppModelError {
    return new AppModelError(
      'Model file is corrupted',
      'MODEL_CORRUPTED',
      'The AI model appears to be corrupted. Please re-download it.',
      details
    );
  }

  static downloadFailed(reason: string, details?: any): AppModelError {
    return new AppModelError(
      `Model download failed: ${reason}`,
      'MODEL_DOWNLOAD_FAILED',
      'Failed to download the AI model. Please check your connection and try again.',
      details
    );
  }

  static insufficientStorage(required: number, available: number): AppModelError {
    return new AppModelError(
      `Insufficient storage: ${required}MB required, ${available}MB available`,
      'MODEL_INSUFFICIENT_STORAGE',
      `Not enough storage space. Please free up at least ${required}MB.`,
      { required, available }
    );
  }

  static validationFailed(details?: any): AppModelError {
    return new AppModelError(
      'Model validation failed',
      'MODEL_VALIDATION_FAILED',
      'The AI model failed validation. Please re-download it.',
      details
    );
  }
}

/**
 * Inference-related errors
 */
export class AppInferenceError extends BaseAppError {
  constructor(message: string, code: string, userMessage: string, recoverable: boolean = true, technicalDetails?: any) {
    super(message, code, ErrorCategory.Inference, recoverable, userMessage, technicalDetails);
  }

  static timeout(duration: number): AppInferenceError {
    return new AppInferenceError(
      `Inference timed out after ${duration}ms`,
      'INFERENCE_TIMEOUT',
      'The response took too long. Please try again with a shorter message.',
      true,
      { duration }
    );
  }

  static outOfMemory(details?: any): AppInferenceError {
    return new AppInferenceError(
      'Out of memory during inference',
      'INFERENCE_OOM',
      'Not enough memory to generate a response. Please try restarting the app.',
      true,
      details
    );
  }

  static notInitialized(): AppInferenceError {
    return new AppInferenceError(
      'LLM service not initialized',
      'INFERENCE_NOT_INITIALIZED',
      'The AI is not ready yet. Please wait a moment and try again.',
      true
    );
  }

  static invalidInput(reason: string): AppInferenceError {
    return new AppInferenceError(
      `Invalid input: ${reason}`,
      'INFERENCE_INVALID_INPUT',
      'Invalid message format. Please try again.',
      false,
      { reason }
    );
  }

  static failed(reason: string, details?: any): AppInferenceError {
    return new AppInferenceError(
      `Inference failed: ${reason}`,
      'INFERENCE_FAILED',
      'Unable to generate a response. Please try again.',
      true,
      { reason, ...details }
    );
  }

  static cancelled(): AppInferenceError {
    return new AppInferenceError(
      'Inference was cancelled',
      'INFERENCE_CANCELLED',
      'Response generation was cancelled.',
      false
    );
  }
}

/**
 * Storage-related errors
 */
export class AppStorageError extends BaseAppError {
  constructor(message: string, code: string, userMessage: string, recoverable: boolean = true, technicalDetails?: any) {
    super(message, code, ErrorCategory.Storage, recoverable, userMessage, technicalDetails);
  }

  static writeFailed(key: string, reason: string): AppStorageError {
    return new AppStorageError(
      `Failed to write to storage: ${reason}`,
      'STORAGE_WRITE_FAILED',
      'Unable to save data. Please try again.',
      true,
      { key, reason }
    );
  }

  static readFailed(key: string, reason: string): AppStorageError {
    return new AppStorageError(
      `Failed to read from storage: ${reason}`,
      'STORAGE_READ_FAILED',
      'Unable to load data. Please try again.',
      true,
      { key, reason }
    );
  }

  static storageFull(required: number, available: number): AppStorageError {
    return new AppStorageError(
      `Storage full: ${required}MB required, ${available}MB available`,
      'STORAGE_FULL',
      `Storage is full. Please free up at least ${required}MB.`,
      false,
      { required, available }
    );
  }

  static corrupted(key: string, details?: any): AppStorageError {
    return new AppStorageError(
      `Storage data corrupted for key: ${key}`,
      'STORAGE_CORRUPTED',
      'Storage data is corrupted. You may need to clear app data.',
      false,
      { key, ...details }
    );
  }

  static permissionDenied(operation: string): AppStorageError {
    return new AppStorageError(
      `Permission denied for storage operation: ${operation}`,
      'STORAGE_PERMISSION_DENIED',
      'Unable to access storage. Please check app permissions.',
      false,
      { operation }
    );
  }
}

/**
 * Network-related errors
 */
export class AppNetworkError extends BaseAppError {
  constructor(message: string, code: string, userMessage: string, technicalDetails?: any) {
    super(message, code, ErrorCategory.Network, true, userMessage, technicalDetails);
  }

  static timeout(url: string, duration: number): AppNetworkError {
    return new AppNetworkError(
      `Network request timed out after ${duration}ms`,
      'NETWORK_TIMEOUT',
      'Connection timed out. Please check your internet connection.',
      { url, duration }
    );
  }

  static offline(): AppNetworkError {
    return new AppNetworkError(
      'No internet connection',
      'NETWORK_OFFLINE',
      'No internet connection. Please connect to download the model.',
      {}
    );
  }

  static serverError(statusCode: number, url: string): AppNetworkError {
    return new AppNetworkError(
      `Server error: ${statusCode}`,
      'NETWORK_SERVER_ERROR',
      'Server error. Please try again later.',
      { statusCode, url }
    );
  }

  static requestFailed(reason: string, details?: any): AppNetworkError {
    return new AppNetworkError(
      `Network request failed: ${reason}`,
      'NETWORK_REQUEST_FAILED',
      'Network error. Please check your connection and try again.',
      { reason, ...details }
    );
  }
}

/**
 * Unknown/Generic errors
 */
export class UnknownError extends BaseAppError {
  constructor(message: string, technicalDetails?: any) {
    super(
      message,
      'UNKNOWN_ERROR',
      ErrorCategory.Unknown,
      true,
      'Something went wrong. Please try again.',
      technicalDetails
    );
  }

  static fromError(error: unknown): UnknownError {
    if (error instanceof Error) {
      return new UnknownError(error.message, {
        name: error.name,
        stack: error.stack,
      });
    }
    return new UnknownError(String(error), { originalError: error });
  }
}
