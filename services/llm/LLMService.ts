/**
 * LLMService - Manages inference requests and streaming responses
 */

import ExpoLlmMediapipe, { 
  PartialResponseEventPayload, 
  ErrorResponseEventPayload,
  NativeModuleSubscription 
} from 'expo-llm-mediapipe';
import { APP_CONFIG } from '@/constants/config';
import { ChatMessage } from '@/types';
import type { 
  InferenceOptions, 
  ModelCapabilities, 
  LLMServiceInterface 
} from './types';

// Error types
export class LLMError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LLMError';
  }
}

export class InferenceTimeoutError extends LLMError {
  constructor(timeout: number) {
    super(
      `Inference timed out after ${timeout / 1000} seconds`,
      'INFERENCE_TIMEOUT'
    );
    this.name = 'InferenceTimeoutError';
  }
}

export class OutOfMemoryError extends LLMError {
  constructor() {
    super(
      'Insufficient memory to complete inference. Try reducing max tokens or clearing conversation history.',
      'OUT_OF_MEMORY'
    );
    this.name = 'OutOfMemoryError';
  }
}

export class ModelNotInitializedError extends LLMError {
  constructor() {
    super(
      'LLM Service is not initialized. Please initialize the service before generating responses.',
      'NOT_INITIALIZED'
    );
    this.name = 'ModelNotInitializedError';
  }
}

export class LLMService implements LLMServiceInterface {
  private modelHandle: number | null = null;
  private initialized: boolean = false;
  private modelName: string = '';
  private isGenerating: boolean = false;
  private abortController: AbortController | null = null;
  private maxRetries: number = 2;
  private retryDelay: number = 1000; // 1 second
  private partialResponseListener: NativeModuleSubscription | null = null;
  private errorResponseListener: NativeModuleSubscription | null = null;
  private requestIdCounter: number = 0;

  /**
   * Initialize the LLM with model name
   */
  async initialize(modelName: string): Promise<void> {
    try {
      console.log('Initializing LLM Service with model:', modelName);
      
      // Store model name
      this.modelName = modelName;

      // Create model handle from downloaded model
      this.modelHandle = await ExpoLlmMediapipe.createModelFromDownloaded(
        modelName,
        APP_CONFIG.model.defaultMaxTokens,
        40, // topK
        APP_CONFIG.model.defaultTemperature,
        0 // randomSeed
      );

      console.log('Model handle created:', this.modelHandle);

      // Mark as initialized
      this.initialized = true;
      console.log('LLM Service initialized successfully');
    } catch (error) {
      console.error('Error initializing LLM Service:', error);
      this.initialized = false;
      this.modelHandle = null;
      throw new LLMError(
        `Failed to initialize LLM Service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && this.modelHandle !== null;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      // Remove event listeners
      if (this.partialResponseListener) {
        this.partialResponseListener.remove();
        this.partialResponseListener = null;
      }
      if (this.errorResponseListener) {
        this.errorResponseListener.remove();
        this.errorResponseListener = null;
      }

      // Release model handle
      if (this.modelHandle !== null) {
        await ExpoLlmMediapipe.releaseModel(this.modelHandle);
        this.modelHandle = null;
      }

      this.initialized = false;
      console.log('LLM Service cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up LLM Service:', error);
    }
  }

  /**
   * Get model capabilities
   */
  getCapabilities(): ModelCapabilities {
    return {
      maxContextLength: APP_CONFIG.model.maxContextTokens,
      supportsStreaming: true,
      modelName: APP_CONFIG.model.name,
      version: '1.0.0',
    };
  }

  /**
   * Generate streaming response with retry logic
   */
  async generateResponse(
    messages: ChatMessage[],
    options: InferenceOptions,
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this.isReady()) {
      throw new ModelNotInitializedError();
    }

    if (this.isGenerating) {
      throw new LLMError('Another inference is already in progress', 'INFERENCE_IN_PROGRESS');
    }

    let lastError: Error | null = null;

    // Attempt inference with retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Inference attempt ${attempt}/${this.maxRetries}`);
        const response = await this.attemptGeneration(messages, options, onToken);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`Inference attempt ${attempt} failed:`, error);

        // Don't retry on certain errors
        if (
          error instanceof ModelNotInitializedError ||
          error instanceof OutOfMemoryError ||
          error instanceof InferenceTimeoutError
        ) {
          throw error;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    // All retries failed
    throw new LLMError(
      `Failed to generate response after ${this.maxRetries} attempts: ${lastError?.message}`,
      'INFERENCE_FAILED'
    );
  }

  /**
   * Attempt a single generation
   */
  private async attemptGeneration(
    messages: ChatMessage[],
    options: InferenceOptions,
    onToken: (token: string) => void
  ): Promise<string> {
    this.isGenerating = true;
    this.abortController = new AbortController();

    try {
      // Prepare the prompt with context window management
      const prompt = this.preparePrompt(messages, options);

      // Set up timeout
      const timeout = options.contextWindow || APP_CONFIG.performance.inferenceTimeout;
      const timeoutId = setTimeout(() => {
        this.stopGeneration();
      }, timeout);

      // Generate unique request ID
      const requestId = ++this.requestIdCounter;

      // Set up response promise
      let fullResponse = '';
      let resolveResponse: ((value: string) => void) | null = null;
      let rejectResponse: ((error: Error) => void) | null = null;

      const responsePromise = new Promise<string>((resolve, reject) => {
        resolveResponse = resolve;
        rejectResponse = reject;
      });

      let lastPartialUpdate = Date.now();
      let completionCheckInterval: NodeJS.Timeout | null = null;

      // Set up event listeners for this request
      this.partialResponseListener = ExpoLlmMediapipe.addListener(
        'onPartialResponse',
        (event: PartialResponseEventPayload) => {
          if (event.requestId !== requestId) return;

          // Check if generation was stopped
          if (this.abortController?.signal.aborted) {
            resolveResponse?.(fullResponse);
            return;
          }

          // Update last partial update time
          lastPartialUpdate = Date.now();

          // Emit the partial response
          onToken(event.response);
          fullResponse = event.response;
        }
      );

      this.errorResponseListener = ExpoLlmMediapipe.addListener(
        'onErrorResponse',
        (event: ErrorResponseEventPayload) => {
          if (event.requestId !== requestId) return;

          const error = new LLMError(event.error, 'INFERENCE_ERROR');
          
          // Handle specific errors
          if (event.error.includes('memory') || event.error.includes('OOM')) {
            rejectResponse?.(new OutOfMemoryError());
          } else {
            rejectResponse?.(error);
          }
        }
      );

      try {
        // Start async generation
        const success = await ExpoLlmMediapipe.generateResponseAsync(
          this.modelHandle!,
          requestId,
          prompt
        );

        if (!success) {
          throw new LLMError('Failed to start generation', 'GENERATION_START_FAILED');
        }

        // Check for completion periodically
        // If no updates for 2 seconds, assume generation is complete
        completionCheckInterval = setInterval(() => {
          const timeSinceLastUpdate = Date.now() - lastPartialUpdate;
          
          if (timeSinceLastUpdate > 2000) {
            // No updates for 2 seconds - assume complete
            if (fullResponse) {
              resolveResponse?.(fullResponse);
            } else {
              rejectResponse?.(new LLMError('Generation completed but no response received', 'NO_RESPONSE'));
            }
            
            if (completionCheckInterval) {
              clearInterval(completionCheckInterval);
            }
          }
        }, 500);

        // Wait for response
        await responsePromise;
        
        if (completionCheckInterval) {
          clearInterval(completionCheckInterval);
        }
      } catch (error) {
        if (completionCheckInterval) {
          clearInterval(completionCheckInterval);
        }
        
        // Handle specific errors
        if (error instanceof Error) {
          if (error.message.includes('memory') || error.message.includes('OOM')) {
            throw new OutOfMemoryError();
          }
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        
        // Clean up listeners
        if (this.partialResponseListener) {
          this.partialResponseListener.remove();
          this.partialResponseListener = null;
        }
        if (this.errorResponseListener) {
          this.errorResponseListener.remove();
          this.errorResponseListener = null;
        }
      }

      return fullResponse;
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        throw new LLMError('Generation was cancelled', 'GENERATION_CANCELLED');
      }
      throw error;
    } finally {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  /**
   * Stop ongoing generation
   */
  stopGeneration(): void {
    if (this.abortController && !this.abortController.signal.aborted) {
      console.log('Stopping generation');
      this.abortController.abort();
    }
  }

  /**
   * Prepare prompt with context window management
   */
  private preparePrompt(messages: ChatMessage[], options: InferenceOptions): string {
    const systemPrompt = options.systemPrompt || '';
    const maxContextTokens = options.contextWindow || APP_CONFIG.model.maxContextTokens;

    // Start with system prompt
    let prompt = systemPrompt ? `${systemPrompt}\n\n` : '';

    // Add conversation history with context window management
    const conversationHistory = this.formatMessagesForContext(messages, maxContextTokens);
    prompt += conversationHistory;

    return prompt;
  }

  /**
   * Format messages for context window, truncating if necessary
   */
  private formatMessagesForContext(messages: ChatMessage[], maxTokens: number): string {
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

    // Filter out system messages (they're in the system prompt)
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // Build context from most recent messages
    const formattedMessages: string[] = [];
    let totalTokens = 0;

    // Iterate from most recent to oldest
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      const formattedMsg = `${roleLabel}: ${msg.content}`;
      const msgTokens = estimateTokens(formattedMsg);

      // Check if adding this message would exceed context window
      if (totalTokens + msgTokens > maxTokens * 0.8) { // Use 80% of max to leave room for response
        break;
      }

      formattedMessages.unshift(formattedMsg);
      totalTokens += msgTokens;
    }

    return formattedMessages.join('\n\n');
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const llmService = new LLMService();
