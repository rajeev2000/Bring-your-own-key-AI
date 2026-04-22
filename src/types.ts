export interface Attachment {
  name: string;
  type: string;
  data?: string; // base64 for binaries
  isText?: boolean;
  content?: string; // raw text for text files
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenCount?: number;
  responseTime?: number;
  attachments?: Attachment[];
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export const DEFAULT_MODEL = 'gemini-3.1-pro-preview';
export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
