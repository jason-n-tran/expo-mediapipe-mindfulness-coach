/**
 * LLMService - Manages inference requests and streaming responses
 */

import { LLMInference } from 'expo-llm-mediapipe';
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
  private llmInference: LLMInference | null = null;
  private initialized: boolean = false;
  private modelPath: string = '';
  private isGenerating: boolean = false;
  private abortController: AbortController | null = null;
  private maxRetries: number = 2;
  private retryDelay: number = 1000; // 1 second

  /**
   * Initialize the LLM with model path
   */
  async initialize(modelPath: string): Promise<void> {
    try {
      console.log('Initializing LLM Service with model:', modelPath);
      
      // Store model path
      this.modelPath = modelPath;

      // Create LLM inference instance
      this.llmInference = new LLMInference({
        modelPath,
        maxTokens: APP_CONFIG.model.defaultMaxTokens,
        temperature: APP_CONFIG.model.defaultTemperature,
      });

      // Mark as initialized
      this.initialized = true;
      console.log('LLM Service initialized successfully');
    } catch (error) {
      console.error('Error initializing LLM Service:', error);
      this.initialized = false;
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
    return this.initialized && this.llmInference !== null;
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

      // Configure inference options
      const inferenceConfig = {
        temperature: options.temperature ?? APP_CONFIG.model.defaultTemperature,
        maxTokens: options.maxTokens ?? APP_CONFIG.model.defaultMaxTokens,
        topP: options.topP ?? 0.9,
      };

      // Generate response with streaming
      let fullResponse = '';
      let tokenBuffer: string[] = [];
      const bufferSize = APP_CONFIG.performance.tokenBufferSize;

      try {
        // Use the LLM inference API
        const stream = await this.llmInference!.generateStream(prompt, inferenceConfig);

        for await (const token of stream) {
          // Check if generation was stopped
          if (this.abortController.signal.aborted) {
            break;
          }

          fullResponse += token;
          tokenBuffer.push(token);

          // Emit buffered tokens for smooth UI updates
          if (tokenBuffer.length >= bufferSize) {
            const bufferedText = tokenBuffer.join('');
            onToken(bufferedText);
            tokenBuffer = [];
          }
        }

        // Emit remaining tokens
        if (tokenBuffer.length > 0) {
          const bufferedText = tokenBuffer.join('');
          onToken(bufferedText);
        }
      } catch (error) {
        // Handle specific errors
        if (error instanceof Error) {
          if (error.message.includes('memory') || error.message.includes('OOM')) {
            throw new OutOfMemoryError();
          }
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
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
