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
  modelUsed?: string;
  responseTime?: number;
  attachments?: Attachment[];
  isStreaming?: boolean;
  thoughtProcess?: string;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
}

export interface AppSettings {
  providers: ProviderConfig[];
  activeProviderId?: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export const DEFAULT_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
