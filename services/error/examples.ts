/**
 * Example integrations of error handling in existing services
 * 
 * These examples show how to integrate the error handler into
 * ModelManager, LLMService, and MessageStore.
 */

import { errorHandler, AppModelError, AppInferenceError, AppStorageError } from '@/services/error';

/**
 * Example: ModelManager with error handling
 */
export class ModelManagerWithErrorHandling {
  async downloadModel(onProgress: (progress: number) => void): Promise<void> {
    // Use retry mechanism for download
    return errorHandler.withRetry(
      async () => {
        try {
          // Actual download logic would go here
          // await this.performDownload(onProgress);
          console.log('Downloading model...');
        } catch (error) {
          // Convert to typed error
          if (error instanceof Error) {
            if (error.message.includes('network')) {
              throw AppModelError.downloadFailed('Network error');
            } else if (error.message.includes('storage')) {
              throw AppModelError.insufficientStorage(500, 100);
            }
          }
          throw AppModelError.downloadFailed(String(error));
        }
      },
      {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      (attempt, error) => {
        console.log(`Download retry attempt ${attempt}: ${error.message}`);
      }
    );
  }

  async validateModel(): Promise<boolean> {
    try {
      // Validation logic
      const isValid = true; // Replace with actual validation
      
      if (!isValid) {
        throw AppModelError.validationFailed({ reason: 'Checksum mismatch' });
      }
      
      return true;
    } catch (error) {
      if (error instanceof AppModelError) {
        errorHandler.handle(error);
        throw error;
      }
      
      const appError = AppModelError.validationFailed({ originalError: error });
      errorHandler.handle(appError);
      throw appError;
    }
  }
}

/**
 * Example: LLMService with error handling
 */
export class LLMServiceWithErrorHandling {
  private isInitialized = false;

  async generateResponse(prompt: string, onToken: (token: string) => void): Promise<string> {
    // Check initialization
    if (!this.isInitialized) {
      const error = AppInferenceError.notInitialized();
      errorHandler.handle(error);
      throw error;
    }

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      const error = AppInferenceError.invalidInput('Prompt cannot be empty');
      errorHandler.handle(error);
      throw error;
    }

    // Use retry for inference
    return errorHandler.withRetry(
      async () => {
        try {
          // Actual inference logic
          const response = 'Generated response'; // Replace with actual inference
          return response;
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('timeout')) {
              throw AppInferenceError.timeout(30000);
            } else if (error.message.includes('memory')) {
              throw AppInferenceError.outOfMemory();
            }
          }
          throw AppInferenceError.failed(String(error));
        }
      },
      {
        maxAttempts: 2,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
      }
    );
  }

  stopGeneration(): void {
    try {
      // Stop logic
      console.log('Stopping generation...');
    } catch (error) {
      const appError = AppInferenceError.cancelled();
      errorHandler.handle(appError);
    }
  }
}

/**
 * Example: MessageStore with error handling
 */
export class MessageStoreWithErrorHandling {
  async saveMessage(messageId: string, content: string): Promise<void> {
    try {
      // Actual save logic
      // await this.storage.set(messageId, content);
      console.log('Saving message...');
    } catch (error) {
      const appError = AppStorageError.writeFailed(
        messageId,
        error instanceof Error ? error.message : String(error)
      );
      errorHandler.handle(appError);
      throw appError;
    }
  }

  async getMessage(messageId: string): Promise<string | null> {
    try {
      // Actual read logic
      // const content = await this.storage.get(messageId);
      const content = null; // Replace with actual read
      return content;
    } catch (error) {
      const appError = AppStorageError.readFailed(
        messageId,
        error instanceof Error ? error.message : String(error)
      );
      errorHandler.handle(appError);
      throw appError;
    }
  }

  async clearAllMessages(): Promise<void> {
    return errorHandler.withRetry(
      async () => {
        try {
          // Actual clear logic
          console.log('Clearing messages...');
        } catch (error) {
          throw AppStorageError.writeFailed(
            'all',
            error instanceof Error ? error.message : String(error)
          );
        }
      },
      { maxAttempts: 2 }
    );
  }
}

/**
 * Example: Component-level error handling
 */
export function exampleComponentUsage() {
  // This would be inside a React component
  const handleOperation = async () => {
    try {
      // Some operation
      await new ModelManagerWithErrorHandling().downloadModel(() => {});
    } catch (error) {
      if (error instanceof AppModelError) {
        // Error is already handled and logged
        // Show UI feedback based on error.userMessage
        console.log('User message:', error.userMessage);
        
        // Check if recoverable
        if (error.recoverable) {
          console.log('Error is recoverable, showing retry option');
        }
      } else {
        // Unexpected error
        const appError = errorHandler.createError(
          error,
          'unknown' as any,
          'UNEXPECTED_ERROR'
        );
        errorHandler.handle(appError);
      }
    }
  };

  return handleOperation;
}

/**
 * Example: Wrapping existing error-prone operations
 */
export async function wrapExistingOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Convert any error to AppError
    const appError = errorHandler.createError(
      error,
      'unknown' as any,
      undefined,
      { context: errorContext }
    );
    
    // Handle and log
    errorHandler.handle(appError);
    
    // Re-throw for caller to handle
    throw appError;
  }
}
