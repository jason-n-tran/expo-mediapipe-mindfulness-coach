/**
 * Model-related type definitions
 */

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
