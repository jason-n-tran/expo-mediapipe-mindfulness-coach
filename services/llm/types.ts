/**
 * LLM service type definitions
 */

import { ChatMessage, MindfulnessTopic, QuickAction } from '../../types';

export interface PromptOptions {
  emphasizeBuddhism?: boolean;
  emphasizeStoicism?: boolean;
  userContext?: UserContext;
  conversationGoal?: string;
}

export interface UserContext {
  recentTopics?: string[];
  emotionalState?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface PromptBuilderInterface {
  buildSystemPrompt(options?: PromptOptions): string;
  addTopicEmphasis(topic: MindfulnessTopic): string;
  formatConversationHistory(messages: ChatMessage[]): string;
  getQuickActionPrompt(action: QuickAction): string;
}

export interface ModelStatus {
  isAvailable: boolean;
  isDownloading: boolean;
  downloadProgress?: number;
  modelSize?: number;
  lastValidated?: Date;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ModelMetadata {
  modelName: string;
  version: string;
  downloadDate: Date;
  fileSize: number;
  checksum: string;
  lastValidated: Date;
  filePath: string;
}

export interface ModelManagerInterface {
  isModelAvailable(): Promise<boolean>;
  getModelStatus(): Promise<ModelStatus>;
  getModelPath(): Promise<string>;
  downloadModel(onProgress: (progress: DownloadProgress) => void): Promise<void>;
  validateModel(): Promise<boolean>;
  deleteModel(): Promise<void>;
}

export interface InferenceOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  contextWindow?: number;
}

export interface ModelCapabilities {
  maxContextLength: number;
  supportsStreaming: boolean;
  modelName: string;
  version: string;
}

export interface LLMServiceInterface {
  initialize(modelPath: string): Promise<void>;
  generateResponse(
    messages: ChatMessage[],
    options: InferenceOptions,
    onToken: (token: string) => void
  ): Promise<string>;
  stopGeneration(): void;
  isReady(): boolean;
  getCapabilities(): ModelCapabilities;
}
