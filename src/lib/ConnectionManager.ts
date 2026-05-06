import { GoogleGenAI } from '@google/genai';
import { ProviderConfig, DEFAULT_BASE_URL } from '../types';

export class PersistentConnectionManager {
  private static instance: PersistentConnectionManager;
  private connections: Map<string, { ai: any | null, lastUsed: number, providerId: string }>;
  private readonly IDLE_TIMEOUT = 3600000; // 1 hour

  private constructor() {
    this.connections = new Map();
    // Keep alive interval
    setInterval(() => this.cleanupIdleConnections(), 60000); // Check every minute
  }

  public static getInstance(): PersistentConnectionManager {
    if (!PersistentConnectionManager.instance) {
      PersistentConnectionManager.instance = new PersistentConnectionManager();
    }
    return PersistentConnectionManager.instance;
  }

  private cleanupIdleConnections() {
    const now = Date.now();
    for (const [key, conn] of this.connections.entries()) {
      if (now - conn.lastUsed > this.IDLE_TIMEOUT) {
        console.log(`[ConnectionManager] Closing idle connection/session for provider ${conn.providerId}`);
        this.connections.delete(key);
      }
    }
  }

  public getGeminiClient(provider: ProviderConfig) {
    const cacheKey = `${provider.id}_${provider.baseUrl}_${provider.apiKey}`;
    const now = Date.now();

    let conn = this.connections.get(cacheKey);

    if (conn && conn.ai) {
      conn.lastUsed = now;
      return conn.ai;
    }

    console.log(`[ConnectionManager] Establishing new persistent connection for ${provider.id}`);
    
    const activeBaseUrl = provider.baseUrl || DEFAULT_BASE_URL;
    const ai = new GoogleGenAI({ 
      apiKey: provider.apiKey,
      httpOptions: activeBaseUrl !== DEFAULT_BASE_URL ? { baseUrl: activeBaseUrl } : undefined
    });

    this.connections.set(cacheKey, { ai, lastUsed: now, providerId: provider.id });
    
    return ai;
  }

  public getOpenAIFetchConfig(provider: ProviderConfig) {
    const now = Date.now();
    const cacheKey = `fetch_${provider.id}_${provider.baseUrl}_${provider.apiKey}`;
    let conn = this.connections.get(cacheKey);

    if (conn) {
      conn.lastUsed = now;
    } else {
      this.connections.set(cacheKey, { ai: null, lastUsed: now, providerId: provider.id });
    }

    // Return configuration to maintain persistent HTTP session
    return {
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
  }

  public resetConnection(provider: ProviderConfig) {
    console.warn(`[ConnectionManager] Resetting connection due to error for provider ${provider.id}`);
    const geminiKey = `${provider.id}_${provider.baseUrl}_${provider.apiKey}`;
    const fetchKey = `fetch_${provider.id}_${provider.baseUrl}_${provider.apiKey}`;
    this.connections.delete(geminiKey);
    this.connections.delete(fetchKey);
  }
}

export const apiConnectionManager = PersistentConnectionManager.getInstance();
