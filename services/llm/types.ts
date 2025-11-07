/**
 * LLM service type definitions
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

export interface ModelManagerInterface {
  isModelAvailable(): Promise<boolean>;
  getModelStatus(): Promise<ModelStatus>;
  getModelPath(): Promise<string>;
  downloadModel(onProgress: (progress: DownloadProgress) => void): Promise<void>;
  validateModel(): Promise<boolean>;
  deleteModel(): Promise<void>;
}
