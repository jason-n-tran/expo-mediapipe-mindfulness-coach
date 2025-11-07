/**
 * Chat-related type definitions
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sessionId: string;
  metadata?: {
    tokens?: number;
    inferenceTime?: number;
    temperature?: number;
    topic?: MindfulnessTopic;
    quickAction?: QuickAction;
  };
}

export interface ChatSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  topics: MindfulnessTopic[];
  summary?: string;
}

export interface ConversationStats {
  totalMessages: number;
  totalSessions: number;
  firstMessageDate?: Date;
  lastMessageDate?: Date;
  averageMessagesPerDay: number;
}

export enum MindfulnessTopic {
  Anxiety = 'anxiety',
  Stress = 'stress',
  Relationships = 'relationships',
  Purpose = 'purpose',
  Acceptance = 'acceptance',
  Gratitude = 'gratitude'
}

export enum QuickAction {
  BreathingExercise = 'breathing',
  DailyReflection = 'reflection',
  GratitudePractice = 'gratitude',
  StressRelief = 'stress',
  MorningIntention = 'morning',
  EveningReview = 'evening'
}
