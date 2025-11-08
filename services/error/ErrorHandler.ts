/**
 * ErrorHandler - Centralized error handling and logging utility
 * 
 * Provides error categorization, user-friendly messaging, logging,
 * and retry mechanisms with exponential backoff.
 */

import { AppError, ErrorCategory, ErrorRecovery } from '@/types/error';

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface ErrorLog {
  timestamp: Date;
  error: AppError;
  context?: Record<string, any>;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private readonly maxLogSize = 100;
  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  handle(error: AppError, context?: Record<string, any>): ErrorRecovery {
    // Log the error
    this.log(error, context);

    // Determine recovery strategy based on error category and recoverability
    const recovery = this.determineRecovery(error);

    return recovery;
  }

  /**
   * Create an AppError from a native error or unknown error
   */
  createError(
    error: unknown,
    category: ErrorCategory,
    code?: string,
    context?: Record<string, any>
  ): AppError {
    let message = 'An unknown error occurred';
    let technicalDetails: any = error;

    if (error instanceof Error) {
      message = error.message;
      technicalDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...context,
      };
    } else if (typeof error === 'string') {
      message = error;
    }

    const appError: AppError = {
      code: code || this.generateErrorCode(category),
      message,
      category,
      recoverable: this.isRecoverable(category, message),
      userMessage: this.getUserMessage(category, message),
      technicalDetails,
    };

    return appError;
  }

  /**
   * Log error for diagnostics
   */
  log(error: AppError, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      error,
      context,
    };

    // Add to in-memory log
    this.errorLogs.push(errorLog);

    // Maintain max log size
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.error('[ErrorHandler]', {
        category: error.category,
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        recoverable: error.recoverable,
        context,
        technicalDetails: error.technicalDetails,
      });
    }
  }

  /**
   * Get recent error logs
   */
  getErrorLogs(limit?: number): ErrorLog[] {
    const logs = [...this.errorLogs].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>,
    onRetry?: (attempt: number, error: AppError) => void
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error && 'category' in error
          ? (error as unknown as AppError)
          : this.createError(error, ErrorCategory.Unknown);

        // Don't retry if error is not recoverable
        if (!lastError.recoverable) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        // Notify about retry
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        // Log retry attempt
        this.log(
          {
            ...lastError,
            message: `Retry attempt ${attempt}/${retryConfig.maxAttempts}: ${lastError.message}`,
          },
          { attempt, delay }
        );

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Determine recovery strategy for an error
   */
  private determineRecovery(error: AppError): ErrorRecovery {
    // Non-recoverable errors should abort
    if (!error.recoverable) {
      return {
        action: 'abort',
        message: error.userMessage,
      };
    }

    // Category-specific recovery strategies
    switch (error.category) {
      case ErrorCategory.Network:
        return {
          action: 'retry',
          message: 'Network error. Please check your connection and try again.',
          retryDelay: 2000,
        };

      case ErrorCategory.Model:
        if (error.code.includes('NOT_FOUND') || error.code.includes('CORRUPTED')) {
          return {
            action: 'retry',
            message: 'Model issue detected. Please re-download the model.',
            retryDelay: 0,
          };
        }
        return {
          action: 'abort',
          message: error.userMessage,
        };

      case ErrorCategory.Inference:
        if (error.code.includes('TIMEOUT') || error.code.includes('MEMORY')) {
          return {
            action: 'retry',
            message: 'Inference failed. Retrying...',
            retryDelay: 1000,
          };
        }
        return {
          action: 'fallback',
          message: 'Unable to generate response. Please try again.',
        };

      case ErrorCategory.Storage:
        if (error.code.includes('FULL')) {
          return {
            action: 'abort',
            message: 'Storage is full. Please free up space and try again.',
          };
        }
        return {
          action: 'retry',
          message: 'Storage error. Retrying...',
          retryDelay: 500,
        };

      default:
        return {
          action: 'retry',
          message: 'An error occurred. Please try again.',
          retryDelay: 1000,
        };
    }
  }

  /**
   * Generate user-friendly error message
   */
  private getUserMessage(category: ErrorCategory, technicalMessage: string): string {
    const lowerMessage = technicalMessage.toLowerCase();

    switch (category) {
      case ErrorCategory.Model:
        if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
          return 'The AI model is not available. Please download it to continue.';
        }
        if (lowerMessage.includes('corrupt') || lowerMessage.includes('invalid')) {
          return 'The AI model appears to be corrupted. Please re-download it.';
        }
        if (lowerMessage.includes('storage') || lowerMessage.includes('space')) {
          return 'Not enough storage space to download the model. Please free up space.';
        }
        return 'There was a problem with the AI model. Please try re-downloading it.';

      case ErrorCategory.Inference:
        if (lowerMessage.includes('timeout')) {
          return 'The response took too long. Please try again with a shorter message.';
        }
        if (lowerMessage.includes('memory') || lowerMessage.includes('oom')) {
          return 'Not enough memory to generate a response. Please try restarting the app.';
        }
        if (lowerMessage.includes('not initialized')) {
          return 'The AI is not ready yet. Please wait a moment and try again.';
        }
        return 'Unable to generate a response. Please try again.';

      case ErrorCategory.Storage:
        if (lowerMessage.includes('full') || lowerMessage.includes('space')) {
          return 'Storage is full. Please free up space to continue.';
        }
        if (lowerMessage.includes('permission')) {
          return 'Unable to access storage. Please check app permissions.';
        }
        if (lowerMessage.includes('corrupt')) {
          return 'Storage data is corrupted. You may need to clear app data.';
        }
        return 'Unable to save data. Please try again.';

      case ErrorCategory.Network:
        if (lowerMessage.includes('timeout')) {
          return 'Connection timed out. Please check your internet connection.';
        }
        if (lowerMessage.includes('offline') || lowerMessage.includes('no connection')) {
          return 'No internet connection. Please connect to download the model.';
        }
        if (lowerMessage.includes('server')) {
          return 'Server error. Please try again later.';
        }
        return 'Network error. Please check your connection and try again.';

      default:
        return 'Something went wrong. Please try again.';
    }
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverable(category: ErrorCategory, message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Non-recoverable conditions
    const nonRecoverablePatterns = [
      'permission denied',
      'unauthorized',
      'forbidden',
      'invalid credentials',
      'unsupported',
      'not implemented',
    ];

    if (nonRecoverablePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return false;
    }

    // Category-specific recoverability
    switch (category) {
      case ErrorCategory.Network:
        // Most network errors are recoverable
        return true;

      case ErrorCategory.Model:
        // Model not found or corrupted is recoverable (can re-download)
        // Storage full is not immediately recoverable
        return !lowerMessage.includes('storage') && !lowerMessage.includes('space');

      case ErrorCategory.Inference:
        // Timeout and memory errors are recoverable
        // Invalid input is not recoverable
        return !lowerMessage.includes('invalid');

      case ErrorCategory.Storage:
        // Storage full is not recoverable without user action
        return !lowerMessage.includes('full');

      default:
        // Unknown errors are considered recoverable by default
        return true;
    }
  }

  /**
   * Generate error code
   */
  private generateErrorCode(category: ErrorCategory): string {
    const timestamp = Date.now().toString(36);
    return `${category.toUpperCase()}_${timestamp}`;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export error logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.errorLogs, null, 2);
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    recoverable: number;
    nonRecoverable: number;
  } {
    const stats = {
      total: this.errorLogs.length,
      byCategory: {
        [ErrorCategory.Model]: 0,
        [ErrorCategory.Inference]: 0,
        [ErrorCategory.Storage]: 0,
        [ErrorCategory.Network]: 0,
        [ErrorCategory.Unknown]: 0,
      },
      recoverable: 0,
      nonRecoverable: 0,
    };

    this.errorLogs.forEach(log => {
      stats.byCategory[log.error.category]++;
      if (log.error.recoverable) {
        stats.recoverable++;
      } else {
        stats.nonRecoverable++;
      }
    });

    return stats;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
export default ErrorHandler;
