/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Settings, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Moon, 
  Sun, 
  ChevronLeft, 
  Table, 
  FileText, 
  Download, 
  BarChart as BarChartIcon,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  X,
  Sparkles,
  Command,
  Layout,
  Copy,
  Check,
  Image as ImageIcon,
  Sliders,
  RefreshCw,
  Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

import { Message, ChatSession, AppSettings, DEFAULT_MODEL, DEFAULT_BASE_URL } from './types';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
};

// --- Helpers ---
const cleanBaseUrl = (url: string) => {
  let u = url.trim().replace(/\/+$/, '');
  if (!u.startsWith('http')) u = 'https://' + u;
  const suffixes = ['/v1', '/v1beta', '/v1beta1', '/v1beta2', '/chat', '/completions', '/models', '/openai'];
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (u.endsWith(suffix)) {
        u = u.substring(0, u.length - suffix.length);
        changed = true;
      }
    }
    u = u.replace(/\/+$/, '');
  }
  return u;
};

const isGeminiUrl = (url: string) => {
  const cleaned = cleanBaseUrl(url);
  return cleaned.includes('generative') || cleaned.includes('googleapis.com');
};

const PREDEFINED_MODELS: Record<string, { id: string; label: string; category: string }[]> = {
  gemini: [
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', category: 'Pro Models' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash', category: 'Fast Models' },
    { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite', category: 'Fast Models' },
    { id: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Thinking', category: 'Thinking Models' },
    { id: 'gemini-3.1-flash-image-preview', label: 'Imagen 4 (High Quality)', category: 'Image Generation' },
    { id: 'gemini-2.5-flash-image', label: 'Imagen 4 (Turbo)', category: 'Image Generation' },
    { id: 'veo-3.1-lite-generate-preview', label: 'Veo 3.1 Lite (Video)', category: 'Video Generation' }
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', category: 'Pro Models' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', category: 'Pro Models' },
    { id: 'o3-mini', label: 'o3-mini', category: 'Thinking Models' },
    { id: 'o1', label: 'o1', category: 'Thinking Models' },
    { id: 'gpt-4o-mini', label: 'GPT-4o-Mini', category: 'Fast Models' },
    { id: 'dall-e-3', label: 'DALL-E 3', category: 'Image Generation' }
  ]
};

export default function App() {
  // --- State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showParamMenu, setShowParamMenu] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [fetchedModels, setFetchedModels] = useState<Record<string, { id: string; label: string; category: string }[]>>({});
  const [pendingOptions, setPendingOptions] = useState<{ query: string; options: string[] } | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('iluv_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Hardcode standard providers
      parsed.providers = [
        {
          id: 'gemini',
          name: 'Google AI',
          apiKey: parsed.providers?.find((p: any) => p.name.includes('Google'))?.apiKey || parsed.apiKey || '',
          baseUrl: parsed.providers?.find((p: any) => p.name.includes('Google'))?.baseUrl || DEFAULT_BASE_URL,
          enabled: true
        },
        {
          id: 'openai',
          name: 'OpenAI',
          apiKey: parsed.providers?.find((p: any) => p.name.includes('OpenAI'))?.apiKey || '',
          baseUrl: parsed.providers?.find((p: any) => p.name.includes('OpenAI'))?.baseUrl || 'https://api.openai.com',
          enabled: true
        }
      ];
      if (!parsed.activeProviderId || (parsed.activeProviderId !== 'gemini' && parsed.activeProviderId !== 'openai')) {
         parsed.activeProviderId = 'gemini';
      }
      return parsed;
    }
    return {
      providers: [
        {
          id: 'gemini',
          name: 'Google AI',
          apiKey: '',
          baseUrl: DEFAULT_BASE_URL,
          enabled: true
        },
        {
          id: 'openai',
          name: 'OpenAI',
          apiKey: '',
          baseUrl: 'https://api.openai.com',
          enabled: true
        }
      ],
      activeProviderId: 'gemini',
      model: DEFAULT_MODEL,
      theme: 'system',
      maxOutputTokens: 2048
    };
  });

  const getActiveProvider = () => {
    if (settings.activeProviderId) {
      return settings.providers.find(p => p.id === settings.activeProviderId);
    }
    // Fallback search by model name or just first one
    if (settings.model.includes('gpt')) {
      return settings.providers.find(p => p.name.toLowerCase().includes('openai'));
    }
    return settings.providers.find(p => p.name.toLowerCase().includes('google')) || settings.providers[0];
  };

  const fetchProviderModels = async (provider: any) => {
    if (!provider || !provider.apiKey) return;
    try {
      const isGemini = isGeminiUrl(provider.baseUrl);
      let newModels: { id: string; label: string; category: string }[] = [];
      if (isGemini) {
        const url = `${cleanBaseUrl(provider.baseUrl)}/v1beta/models?key=${provider.apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.models) {
            newModels = data.models.map((m: any) => {
              const id = m.name.replace('models/', '');
              const label = m.displayName || id;
              let category = 'Other Models';
              
              // Sort by capability
              if (id.includes('pro')) category = 'Pro Models';
              else if (id.includes('thinking') || id.includes('think')) category = 'Thinking Models';
              else if (id.includes('flash') || id.includes('mini') || id.includes('lite') || id.includes('nano')) category = 'Fast Models';
              
              if (id.includes('image') || id.includes('imagen') || id.includes('vision') || id.includes('dall-e')) category = 'Image Generation';
              if (id.includes('video') || id.includes('veo')) category = 'Video Generation';
              if (id.includes('tts') || id.includes('live') || id.includes('audio')) category = 'Audio & Speech';
              
              return { id, label, category };
            }).filter((m: any) => {
              // Filter out problematic models that the user reported or that are likely to fail generateContent
              const id = m.id.toLowerCase();
              if (id.includes('veo') && !id.includes('3.1')) return false; // Filter old veo models
              if (id.includes('embedding')) return false; // Can't chat with embeddings
              if (id === 'gemini-pro' || id === 'gemini-1.5-flash' || id === 'gemini-1.5-pro') return false; // Prohibited
              return true;
            });
          }
        }
      } else {
        const url = `${cleanBaseUrl(provider.baseUrl)}/v1/models`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            newModels = data.data.map((m: any) => {
              const id = m.id;
              const label = id;
              let category = 'Other Models';
              if (id.includes('pro') || id.includes('gpt-4o') || id.includes('gpt-5') || id.includes('gpt-4')) {
                if (id.includes('mini') || id.includes('nano')) category = 'Fast Models';
                else category = 'Pro Models';
              }
              else if (id.includes('thinking') || id.includes('o1') || id.includes('o3') || id.includes('o4')) category = 'Thinking Models';
              else if (id.includes('flash') || id.includes('mini') || id.includes('lite') || id.includes('nano') || id.includes('gpt-3.5')) category = 'Fast Models';
              if (id.includes('image') || id.includes('dall-e')) category = 'Image Generation';
              if (id.includes('video') || id.includes('runway') || id.includes('sora') || id.includes('luma') || id.includes('veo') || id.includes('kling') || id.includes('haiper') || id.includes('pika') || id.includes('minimax') || id.includes('hailuo')) category = 'Video Generation';
              return { id, label, category };
            });
          }
        }
      }
      
      if (newModels.length > 0) {
        setFetchedModels(prev => ({ ...prev, [provider.id]: newModels }));
      }
    } catch (err) {
      console.error(`Failed to fetch models for ${provider.name}`, err);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Attempt to fetch models for all enabled providers
    settings.providers.forEach(p => {
      if (p.enabled) fetchProviderModels(p);
    });
  }, [settings.providers]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Load sessions from localStorage
    const savedSessions = localStorage.getItem('iluv_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        setActiveSessionId(parsed[0].id);
      }
    }
  }, []);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setError(`System Warning: ${e.message}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('iluv_sessions', JSON.stringify(sessions));
    } catch (err) {
      console.warn('LocalStorage Quota Exceeded', err);
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('iluv_settings', JSON.stringify(settings));
    
    // Enforce dark mode
    const root = window.document.documentElement;
    root.classList.add('dark');
  }, [settings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, loadingSessions]);



  // --- Helpers ---
  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);
  const isSessionLoading = (id: string | null) => id ? loadingSessions.has(id) : false;

  const createNewSession = () => {
    setError(null);
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New iluv session',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const [openThoughts, setOpenThoughts] = useState<Record<string, boolean>>({});

  const calculateSimilarity = (s1: string, s2: string) => {
    const set1 = new Set(s1.split(/\s+/));
    const set2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    return (2.0 * intersection.size) / (set1.size + set2.size);
  };

  const findLocalCacheMatch = (query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 5) return null;
    
    let bestMatch: { content: string; similarity: number } | null = null;

    sessions.forEach(s => {
      s.messages.forEach((m, idx) => {
        if (m.role === 'user') {
          const sim = calculateSimilarity(normalizedQuery, m.content.toLowerCase().trim());
          if (sim > 0.8) {
            const nextMsg = s.messages[idx + 1];
            if (nextMsg && nextMsg.role === 'assistant' && !nextMsg.isStreaming) {
              if (!bestMatch || sim > bestMatch.similarity) {
                bestMatch = { content: nextMsg.content, similarity: sim };
              }
            }
          }
        }
      });
    });
    return bestMatch;
  };

  const generateAnalysis = (input: string) => {
    const tokens = input.toLowerCase().split(/\s+/);
    const intent = tokens.includes('how') || tokens.includes('why') ? 'Explanatory' : 
                   tokens.includes('create') || tokens.includes('make') || tokens.includes('write') ? 'Creative/Generative' :
                   tokens.includes('fix') || tokens.includes('code') || tokens.includes('debug') ? 'Technical/Problem Solving' : 'Informational';
    
    const depth = tokens.length > 15 ? 'Extensive' : tokens.length > 5 ? 'Moderate' : 'Concise';
    
    return JSON.stringify({
      intent,
      complexity: tokens.length > 10 ? 'High' : 'Standard',
      focus: tokens.slice(0, 3).join(' ') + '...',
      inferredAction: `Processing ${intent.toLowerCase()} request with ${depth.toLowerCase()} output configuration.`
    }, null, 2);
  };

  const handleSendMessage = async (overrideInput?: string, useCache?: string) => {
    const finalInput = overrideInput || input;
    if (!finalInput.trim()) return;
    if (isSessionLoading(activeSessionId)) return;
    
    setPendingOptions(null);

    // Cache hit check (only if not an override from a previous choice)
    if (!overrideInput && !useCache) {
      const match = findLocalCacheMatch(finalInput);
      if (match) {
        setPendingOptions({
          query: "I found a similar response in your local history. Would you like to reuse it to save tokens?",
          options: ["Reuse Cached Answer", "Query LLM Anyway"]
        });
        // We'll handle the choice in the next call
        return;
      }
    }

    if (useCache) {
      const match = findLocalCacheMatch(finalInput);
      if (match) {
        // Mock a response from cache
        const sessionId = activeSessionId || generateId();
        const userMsg: Message = { id: generateId(), role: 'user', content: finalInput, timestamp: Date.now() };
        const assistantMsg: Message = { 
          id: generateId(), 
          role: 'assistant', 
          content: match.content + "\n\n*(Retrieved from local cache)*", 
          timestamp: Date.now(),
          modelUsed: "Local Cache",
          thoughtProcess: JSON.stringify({
            intent: "Cache Retrieval",
            complexity: "None",
            focus: "Historical Match",
            inferredAction: "Matching query with local database results to bypass LLM latency and cost."
          })
        };
        
        setSessions(prev => {
          const session = prev.find(s => s.id === sessionId);
          if (session) {
            return prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMsg, assistantMsg], updatedAt: Date.now() } : s);
          }
          return [...prev, { id: sessionId, title: finalInput.slice(0, 30), messages: [userMsg, assistantMsg], createdAt: Date.now(), updatedAt: Date.now() }];
        });
        setActiveSessionId(sessionId);
        setInput('');
        return;
      }
    }

    const provider = getActiveProvider();

    if (!provider || !provider.apiKey) {
      setError('Please provide an API key for the active provider in settings.');
      setShowSettings(true);
      return;
    }

    let sessionId: string | null = null;
    try {
      const currentInput = finalInput;
      if (!overrideInput) setInput('');
      setError(null);
      
      const activeSession = getActiveSession();
      sessionId = activeSession ? activeSession.id : generateId();
      setLoadingSessions(prev => new Set(prev).add(sessionId!));
      
      const analysis = generateAnalysis(currentInput);

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: currentInput,
        timestamp: Date.now()
      };

      let updatedSessions = [...sessions];
      if (!activeSession) {
        const newSession: ChatSession = {
          id: sessionId,
          title: currentInput.slice(0, 30) || 'New Session',
          messages: [userMessage],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        updatedSessions = [newSession, ...sessions];
        setSessions(updatedSessions);
        setActiveSessionId(sessionId);
      } else {
        updatedSessions = sessions.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: [...s.messages, userMessage],
              updatedAt: Date.now()
            };
          }
          return s;
        });
        setSessions(updatedSessions);
      }

      const currentSession = updatedSessions.find(s => s.id === sessionId)!;
      const model = settings.model || DEFAULT_MODEL;
      const isGemini = provider.baseUrl.includes('generative');

      let sysInstruction = "You are a highly efficient AI assistant focused on 100% accuracy and direct utility. \n\nCORE PROTOCOLS:\n1. DIRECTNESS: Provide the requested answer immediately. Skip all introductory phrases, 'luxury' descriptors (elite, bespoke, etc.), and concluding summaries unless they contain essential data.\n2. CLARIFICATION: If a request is broad, ambiguous, or lacks specific parameters (e.g., format, scope, target audience), you MUST pause and ask clarifying questions. Use the <options> format to provide 3-5 distinct paths for the user to choose from to ensure a correct result.\n3. FORMATTING: Wrap clarify options in: <options>{\"query\": \"Clarifying Question?\", \"options\": [\"Option A\", \"Option B\"]}</options>. Use GFM tables for data.\n4. CONCISENESS: Keep explanations minimal and strictly technical unless 'detailed explanation' is requested.";
      if (settings.maxOutputTokens !== undefined && settings.maxOutputTokens > 0) {
        sysInstruction += `\n5. TOKEN BUDGET: Strictly fit within ${settings.maxOutputTokens} tokens. Finish thoughts completely.`;
      }

      const startTime = Date.now();
      let fullText = '';
      let finalTokens = 0;
      let generatedAttachments: any[] = [];
      const assistantMessageId = generateId();

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        thoughtProcess: analysis
      };

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantMessage],
            updatedAt: Date.now()
          };
        }
        return s;
      }));

      if (isGemini) {
        const ai = new GoogleGenAI({ 
          apiKey: provider.apiKey,
          httpOptions: provider.baseUrl !== DEFAULT_BASE_URL ? { baseUrl: provider.baseUrl } : undefined
        });
        
        let isImagen = model.toLowerCase().includes('imagen') || model.toLowerCase().includes('nano') || model.toLowerCase().includes('image');
        let imagenSuccess = false;

        if (isImagen) {
          try {
            const promptMsg = currentSession.messages[currentSession.messages.length - 1].content || 'A beautiful image';
            const response = await ai.models.generateImages({
              model: model,
              prompt: promptMsg,
              config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
              },
            });
            
            if (response.generatedImages && response.generatedImages[0]) {
              const base64EncodeString = response.generatedImages[0].image.imageBytes;
              generatedAttachments.push({
                 name: `imagen_${Date.now()}.jpeg`,
                 type: 'image/jpeg',
                 data: base64EncodeString,
                 isText: false
              });
              fullText = "Here is the generated image.";
              imagenSuccess = true;
            } else {
              fullText = "Failed to generate image.";
              imagenSuccess = true; // it succeeded in api call but failed to give image? let's not fallback.
            }

            setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                return {
                  ...s,
                  messages: s.messages.map(m => m.id === assistantMessageId ? { 
                    ...m, 
                    content: fullText,
                    modelUsed: model,
                    attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
                  } : m),
                  updatedAt: Date.now()
                };
              }
              return s;
            }));
          } catch (e: any) {
            if (e && e.message && (e.message.includes('predict') || e.message.includes('not supported') || e.message.includes('404'))) {
              console.warn("generateImages predict method unsupported or 404, falling back to generateContentStream...", e);
              imagenSuccess = false;
              isImagen = false;
            } else {
              throw e;
            }
          }
        }
        
        if (!isImagen || !imagenSuccess) {
          const history = currentSession.messages.map(m => {
            const parts: any[] = [{ text: m.content || '' }];
            if (m.attachments) {
              m.attachments.forEach(att => {
                if (att.isText) {
                  parts.push({ text: `\n[FILE: ${att.name}]\n${att.content}\n[END FILE]` });
                } else {
                  parts.push({
                    inlineData: {
                      data: att.data,
                      mimeType: att.type
                    }
                  });
                }
              });
            }
            return {
              role: m.role === 'assistant' ? 'model' : m.role,
              parts
            };
          });

          const configOpts: any = {
            systemInstruction: sysInstruction
          };
          if (settings.temperature !== undefined) configOpts.temperature = Number(settings.temperature);
          if (settings.maxOutputTokens !== undefined) configOpts.maxOutputTokens = Number(settings.maxOutputTokens);

          const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: history,
            config: configOpts
          });

          for await (const chunk of responseStream) {
            fullText += (chunk.text || '');
            if (chunk.usageMetadata) finalTokens = chunk.usageMetadata.candidatesTokenCount || 0;
            
            if (chunk.candidates?.[0]?.content?.parts) {
              chunk.candidates[0].content.parts.forEach(p => {
                if (p.inlineData?.data) {
                  let inferredExt = 'png';
                  let inferredType = p.inlineData.mimeType || 'image/png';
                  if (inferredType.startsWith('video/')) inferredExt = 'mp4';
                  else if (inferredType.includes('jpeg')) inferredExt = 'jpg';
                  else if (inferredType.includes('webp')) inferredExt = 'webp';

                  generatedAttachments.push({
                     name: `generated_${Date.now()}.${inferredExt}`,
                     type: inferredType,
                     data: p.inlineData.data,
                     isText: false
                  });
                }
              });
            }

            setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                return {
                  ...s,
                  messages: s.messages.map(m => m.id === assistantMessageId ? { 
                    ...m, 
                    content: fullText.replace(/<options>.*?<\/options>/s, '').trim(),
                    modelUsed: model,
                    attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
                  } : m),
                  updatedAt: Date.now()
                };
              }
              return s;
            }));
          }

          if (fullText.includes('<options>')) {
            const match = fullText.match(/<options>(.*?)<\/options>/s);
            if (match && match[1]) {
              try {
                const parsed = JSON.parse(match[1]);
                setPendingOptions(parsed);
              } catch(e) {}
            }
          }
        }
      } else {
        // OpenAI-compatible via Proxy
        const isLegacyModel = model.toLowerCase().includes('instruct') || 
                            model.toLowerCase().includes('davinci') || 
                            model.toLowerCase().includes('curie') || 
                            model.toLowerCase().includes('babbage') || 
                            model.toLowerCase().includes('ada');
        
        const isO1Model = model.toLowerCase().startsWith('o1') || 
                          model.toLowerCase().startsWith('o3') || 
                          model.toLowerCase().startsWith('o4') || 
                          model.toLowerCase().includes('thinking') ||
                          model.toLowerCase().includes('reasoning') ||
                          model.toLowerCase().includes('latest');

        const isImageModel = model.toLowerCase().includes('dall-e') || model.toLowerCase().includes('image') || model.toLowerCase().includes('video') || model.toLowerCase().includes('sora') || model.toLowerCase().includes('runway') || model.toLowerCase().includes('luma') || model.toLowerCase().includes('veo') || model.toLowerCase().includes('kling') || model.toLowerCase().includes('minimax') || model.toLowerCase().includes('hailuo') || model.toLowerCase().includes('pika') || model.toLowerCase().includes('haiper');

        const messages = [
          { role: 'system', content: sysInstruction },
          ...currentSession.messages.map(m => {
            let content = m.content;
            if (m.attachments) {
              m.attachments.forEach(att => {
                if (att.isText) {
                  content += `\n[FILE: ${att.name}]\n${att.content}\n[END FILE]`;
                } else if (att.data) {
                  content += `\n[IMAGE ATTACHED: ${att.name}]`;
                }
              });
            }
            return { role: m.role, content };
          })
        ];

        const base = cleanBaseUrl(provider.baseUrl);
        const endpoint = isImageModel ? 'images/generations' : (isLegacyModel ? 'completions' : 'chat/completions');
        const url = `${base}/v1/${endpoint}`;

        const tokenLimit = isLegacyModel ? 4096 : (model.includes('gpt-4') ? 8192 : 4096);
        let maxTokens = settings.maxOutputTokens ?? 2048;
        if (maxTokens > tokenLimit) maxTokens = tokenLimit;

        const requestBody: any = {
          model
        };
        
        if (!isImageModel) {
          requestBody.temperature = isO1Model ? 1 : (settings.temperature ?? 0.7);
        }

        if (isImageModel) {
          requestBody.prompt = currentSession.messages[currentSession.messages.length - 1].content || 'A beautiful image';
          if (!model.toLowerCase().includes('video') && !model.toLowerCase().includes('runway') && !model.toLowerCase().includes('luma') && !model.toLowerCase().includes('sora') && !model.toLowerCase().includes('kling') && !model.toLowerCase().includes('veo') && !model.toLowerCase().includes('hailuo') && !model.toLowerCase().includes('minimax')) {
            requestBody.n = 1;
            requestBody.size = "1024x1024";
          }
        } else if (isLegacyModel) {
          requestBody.prompt = messages.map(m => `${m.role === 'system' ? 'Instruction' : m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.content}`).join('\n') + '\nAssistant: ';
          requestBody.max_tokens = maxTokens;
        } else {
          requestBody.messages = messages;
          if (isO1Model) {
            requestBody.max_completion_tokens = maxTokens;
          } else {
            requestBody.max_tokens = maxTokens;
          }
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (!res.ok) {
          let errorBody = '';
          if (isJson) {
            const errData = await res.json();
            errorBody = errData.error?.message || errData.message || JSON.stringify(errData);
          } else {
            errorBody = await res.text();
          }
          throw new Error(errorBody ? `${res.status}: ${errorBody.slice(0, 500)}` : `Failed to fetch from provider (${res.status})`);
        }

        if (!isJson) {
          throw new Error('Endpoint returned success but response was not JSON. Please check your Base URL.');
        }

        const data = await res.json();
        
        if (isImageModel) {
          const item = (data.data && data.data[0]) ? data.data[0] : data;
          let b64 = item.b64_json;
          let url = item.url || item.video_url || item.image_url;
          
          if (b64 || url) {
            let mimeType = 'image/png';
            let fileExt = 'png';
            
            if (!b64 && url) {
              const imgRes = await fetch(url);
              const blob = await imgRes.blob();
              mimeType = blob.type || 'image/png';
              if (mimeType.startsWith('video/')) fileExt = 'mp4';
              else if (mimeType.includes('jpeg')) fileExt = 'jpg';
              else if (mimeType.includes('webp')) fileExt = 'webp';
              
              const blobToBase64 = (b: Blob): Promise<string> => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(b);
              });
              b64 = await blobToBase64(blob);
            }
            if (b64) {
              generatedAttachments.push({
                 name: `generated_${Date.now()}.${fileExt}`,
                 type: mimeType,
                 data: b64,
                 isText: false
              });
              fullText = mimeType.startsWith('video/') ? "Here is the generated video." : "Here is the generated image.";
            } else {
              fullText = "Failed to extract media from response (no URL or b64_json).";
            }
          } else {
            fullText = "Failed to extract media from response. It might be pending or in an unsupported format: " + JSON.stringify(data).slice(0, 100);
          }
        } else if (isLegacyModel) {
          fullText = data.choices?.[0]?.text || '';
          finalTokens = data.usage?.completion_tokens || 0;
        } else {
          fullText = data.choices?.[0]?.message?.content || '';
          finalTokens = data.usage?.completion_tokens || data.usage?.total_tokens || 0;
        }

        if (fullText.includes('<options>')) {
          const match = fullText.match(/<options>(.*?)<\/options>/s);
          if (match && match[1]) {
            try {
              const parsed = JSON.parse(match[1]);
              setPendingOptions(parsed);
              fullText = fullText.replace(/<options>.*?<\/options>/s, '').trim();
            } catch(e) {}
          }
        }

        setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: s.messages.map(m => m.id === assistantMessageId ? { 
                ...m, 
                content: fullText,
                isStreaming: false,
                attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
              } : m),
              updatedAt: Date.now()
            };
          }
          return s;
        }));
      }
      
      const responseTime = (Date.now() - startTime) / 1000;

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(m => m.id === assistantMessageId ? { 
              ...m, 
              isStreaming: false, 
              tokenCount: finalTokens || undefined, 
              modelUsed: model,
              responseTime 
            } : m),
            updatedAt: Date.now()
          };
        }
        return s;
      }));

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      if (sessionId) {
        setLoadingSessions(prev => {
          const next = new Set(prev);
          next.delete(sessionId!);
          return next;
        });
      }
    }
  };

  const exportToPDF = () => {
    const session = getActiveSession();
    if (!session) return;

    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text(`iluv Session: ${session.title}`, 10, y);
    y += 10;
    doc.setFontSize(10);
    
    session.messages.forEach(m => {
      const rolePrefix = m.role === 'user' ? 'User: ' : 'iluv: ';
      // removing json blocks for pdf
      const content = m.content.replace(/```recharts[\s\S]*?```/g, '[Visualisation omitted in PDF]');
      const splitText = doc.splitTextToSize(rolePrefix + content, 180);
      
      if (y + splitText.length * 5 > 280) {
        doc.addPage();
        y = 10;
      }
      
      doc.text(splitText, 10, y);
      y += (splitText.length * 5) + 5;
    });

    doc.save(`${session.title.replace(/\s/g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    const session = getActiveSession();
    if (!session) return;

    const data = session.messages.map(m => ({
      Role: m.role,
      Content: m.content.replace(/```recharts[\s\S]*?```/g, '[Visualisation omitted]'),
      Timestamp: new Date(m.timestamp).toLocaleString(),
      Tokens: m.tokenCount || '-',
      Model: m.modelUsed || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chat History");
    XLSX.writeFile(wb, `${session.title.replace(/\s/g, '_')}.xlsx`);
  };

  const exportToWord = async () => {
    const session = getActiveSession();
    if (!session) return;

    const children = [
      new Paragraph({
        children: [
          new TextRun({ text: `iluv Session: ${session.title}`, bold: true, size: 32 })
        ]
      }),
      new Paragraph({ text: "" }) 
    ];

    session.messages.forEach(m => {
      const rolePrefix = m.role === 'user' ? 'User: ' : 'iluv: ';
      const content = m.content.replace(/```recharts[\s\S]*?```/g, '[Visualisation omitted]');
      children.push(new Paragraph({
        children: [
          new TextRun({ text: rolePrefix, bold: true }),
          new TextRun({ text: content })
        ]
      }));
      children.push(new Paragraph({ text: "" }));
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/\s/g, '_')}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePodcastAudio = async () => {
    const session = getActiveSession();
    const provider = getActiveProvider();
    
    if (!session || !provider || !provider.apiKey) {
      setError('Please provide an API key for the active provider in settings to generate podcast.');
      setShowSettings(true);
      return;
    }

    if (isSessionLoading(session.id)) return;
    setLoadingSessions(prev => new Set(prev).add(session.id));

    const podcastId = generateId();
    
    setSessions(prev => prev.map(s => {
      if (s.id === session.id) {
        return {
          ...s,
          messages: [...s.messages, {
            id: podcastId,
            role: 'assistant',
            content: '*Generating podcast audio for this session... This might take a few moments.*',
            timestamp: Date.now(),
            isStreaming: true
          }]
        };
      }
      return s;
    }));

    try {
      const activeBaseUrl = provider.baseUrl || DEFAULT_BASE_URL;
      const ai = new GoogleGenAI({ 
        apiKey: provider.apiKey, 
        httpOptions: activeBaseUrl !== DEFAULT_BASE_URL ? { baseUrl: activeBaseUrl } : undefined
      });
      
      const prompt = "Summarize the key points of our conversation so far into an engaging 1-minute podcast. Keep it enthusiastic, informative, and speak directly to the listener as a podcast host.";
      // We take up to last 20 messages to avoid token bloat
      const historyToSend = session.messages.slice(-20).map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [...historyToSend, { role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Podcast-style voice
              }
            }
          }
        }
      });

      const b64 = response.text;
      const audioUrl = b64 ? `data:audio/wav;base64,${b64}` : undefined;

      setSessions(prev => prev.map(s => {
        if (s.id === session.id) {
          return {
            ...s,
            messages: s.messages.map(m => 
              m.id === podcastId ? { 
                ...m, 
                content: "Here is your generated podcast summary:", 
                audioUrl: audioUrl,
                isStreaming: false 
              } : m
            )
          };
        }
        return s;
      }));
    } catch (err: any) {
      setSessions(prev => prev.map(s => {
        if (s.id === session.id) {
          return {
            ...s,
            messages: s.messages.map(m => 
              m.id === podcastId ? { 
                ...m, 
                content: `Error generating podcast: ${err.message}`, 
                isStreaming: false 
              } : m
            )
          };
        }
        return s;
      }));
    } finally {
      setLoadingSessions(prev => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
    }
  };

  const generateVisualReport = () => {
    const request = "Please analyze the chat history above. Determine if there is any numerical, categorical, or temporal data that can be visualized. If there is, summarize it concisely and provide a JSON configuration for a 'recharts' chart of the data inside a ```recharts code block. Ensure the JSON has: type ('bar', 'line', 'pie', 'area'), data (array of objects), xAxisKey (string), series (array of {key, color} objects), and title (string). If no relevant data is found, output a message indicating no visualization could be made.";
    handleSendMessage(request);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (base64: string, filename: string, mimeType: string) => {
    try {
      const byteCharacters = atob(base64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const blob = new Blob(byteArrays, { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      let defaultExt = '.jpg';
      let defaultPrefix = 'iluv-image-';
      
      if (mimeType.startsWith('video/')) {
        defaultExt = '.mp4';
        defaultPrefix = 'iluv-video-';
      } else if (mimeType.includes('png')) {
        defaultExt = '.png';
      } else if (mimeType.includes('webp')) {
        defaultExt = '.webp';
      }

      a.download = filename || `${defaultPrefix}${Date.now()}${defaultExt}`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download extraction failed', err);
      setError('System could not construct the media file for download. Verify your device policy.');
    }
  };

  const getDisplayModels = () => {
    const defaultModels = PREDEFINED_MODELS[settings.activeProviderId || ''] || [];
    const fetched = fetchedModels[settings.activeProviderId || ''] || [];
    
    // Combine fetched models with predefined, allowing fetched to override
    if (fetched.length > 0) {
      // Merge: keep predefined that might not have been returned, or just trust fetched entirely?
      // Better to just return fetched if we successfully fetched them. It's safer because if OpenAI doesn't list gpt-5, we shouldn't show it (prevents 404).
      return fetched;
    }
    return defaultModels;
  };

  const displayModels = getDisplayModels();
  const CATEGORY_ORDER = ['Pro Models', 'Fast Models', 'Thinking Models', 'Image Generation', 'Video Generation', 'Audio & Speech', 'Other Models'];
  const displayCategories = Array.from(new Set(displayModels.map(m => m.category)))
    .sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a);
      const idxB = CATEGORY_ORDER.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

  // --- UI Components ---
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-app)]">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 flex flex-col border-r border-[var(--border-app)] bg-[var(--card-app)] z-50 fixed lg:relative h-full shadow-2xl lg:shadow-none"
            >
            <div className="p-4 flex items-center justify-between border-b border-[var(--border-app)]">
              <div className="flex items-center gap-2 font-bold tracking-tighter text-xl">
                <div className="w-9 h-9 rounded-none bg-[var(--accent-app)] flex items-center justify-center text-white shadow-xl">
                  <Sparkles size={22} />
                </div>
                <span className="tracking-[0.2em]">iluv</span>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-none transition-colors text-[var(--text-app)]"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="p-4">
              <button 
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--accent-app)] text-white rounded-none font-medium shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
              >
                <Plus size={20} />
                <span>New Conversation</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setError(null); }}
                  className={`group relative flex items-center gap-3 p-3 rounded-none cursor-pointer transition-all ${
                    activeSessionId === s.id 
                      ? 'bg-white dark:bg-slate-800 shadow-sm border border-[var(--border-app)]' 
                      : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare size={18} className={activeSessionId === s.id ? 'text-[var(--accent-app)]' : 'text-[var(--text-app)] opacity-60'} />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-bold truncate tracking-tight text-[var(--text-app)]">{s.title}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider font-medium">{new Date(s.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-opacity text-[var(--text-app)]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[var(--border-app)] flex flex-col gap-2 relative">
              <AnimatePresence>
                {deferredPrompt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="w-full"
                  >
                    <button 
                      onClick={() => {
                        if (!deferredPrompt) return;
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((choiceResult: any) => {
                          if (choiceResult.outcome === 'accepted') {
                            setDeferredPrompt(null);
                          }
                        });
                      }}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-none bg-[var(--accent-app)] text-white hover:bg-[var(--accent-app)]/90 transition-colors text-[11px] font-black uppercase tracking-widest w-full shadow-lg"
                    >
                      <Download size={16} />
                      <span>Install App</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-none hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-[11px] font-black uppercase tracking-widest text-[var(--text-app)] w-full"
              >
                <Settings size={16} />
                <span>Preferences</span>
              </button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Ambiguity Resolution Modal */}
      <AnimatePresence>
        {pendingOptions && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a0a0a] border border-[#0070f3]/40 rounded-[32px] p-8 sm:p-10 shadow-[0_0_50px_rgba(0,112,243,0.2)] max-w-lg w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0070f3] to-transparent opacity-50" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#0070f3] animate-ping" />
                <h3 className="text-[10px] font-black text-[#0070f3] uppercase tracking-[0.4em]">System Clarification Required</h3>
              </div>

              <p className="text-xl sm:text-2xl font-bold text-white mb-8 tracking-tight leading-tight">
                {pendingOptions.query}
              </p>

              <div className="flex flex-col gap-3">
                {pendingOptions.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (opt === "Reuse Cached Answer") {
                        handleSendMessage(undefined, "true");
                      } else if (opt === "Query LLM Anyway") {
                        handleSendMessage(input);
                      } else {
                        handleSendMessage(opt);
                      }
                    }}
                    className="group flex items-center justify-between px-6 py-4 bg-[#111111] hover:bg-[#0070f3] text-white rounded-[20px] transition-all border border-white/5 hover:border-[#0070f3] text-left"
                  >
                    <span className="font-bold text-sm tracking-wide">{opt}</span>
                    <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPendingOptions(null)}
                className="mt-8 w-full py-3 text-[#71717a] text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-all"
              >
                Dismiss Sequence
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
        <AnimatePresence />
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-40 p-2 bg-[#0a0a0a] border border-[#111111] rounded-full shadow-lg hover:bg-[#111111] transition-all text-[#0070f3]"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#111111] bg-[#000000]/80 backdrop-blur-md sticky top-0 z-10 transition-all">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden p-2 hover:bg-[#0a0a0a] rounded-full transition-colors ${sidebarOpen ? 'hidden' : ''} text-[#0070f3]`}
             >
               <Layout size={20} />
             </button>
             <h1 className="text-lg font-black tracking-[0.2em] truncate scroll-hide max-w-[200px] sm:max-w-md uppercase text-white">
               {getActiveSession()?.title || 'iluv'}
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {getActiveSession() && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-none border border-[var(--border-app)] mr-2">
                <button 
                  onClick={exportToPDF}
                  title="Export to PDF"
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-none transition-all text-slate-600 dark:text-slate-300"
                >
                  <FileText size={18} />
                </button>
                <button 
                  onClick={exportToExcel}
                  title="Export to Excel"
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-none transition-all text-slate-600 dark:text-slate-300"
                >
                  <Table size={18} />
                </button>
                <button 
                  onClick={exportToWord}
                  title="Export to Word"
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-none transition-all text-slate-600 dark:text-slate-300"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={generateVisualReport}
                  title="Generate Visual Report"
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-none transition-all text-slate-600 dark:text-slate-300 border-l border-[var(--border-app)] pl-3 ml-1"
                >
                  <BarChartIcon size={18} />
                </button>
                <button 
                  onClick={generatePodcastAudio}
                  title="Generate Podcast Audio"
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-none transition-all text-slate-600 dark:text-slate-300"
                >
                  <Headphones size={18} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth custom-scrollbar bg-[#000000]"
        >
          {sessions.length === 0 || (activeSessionId && getActiveSession()?.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full bg-[#0a0a0a] border border-[#0070f3]/20 flex items-center justify-center text-[#0070f3] mb-8 shadow-2xl shadow-[#0070f3]/10"
              >
                <Sparkles size={40} />
              </motion.div>
              <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase italic text-white leading-none">iluv</h2>
              <p className="text-[#71717a] mb-10 font-medium tracking-wide">
                Secure. Minimal. Direct. Your private intelligence architecture.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { icon: Table, text: "Data Visualisation", cmd: "Generate a markdown table for a 5-year global tech revenue analysis, then provide a JSON configuration for a 'recharts' bar chart of the data inside a ```recharts code block. Ensure the JSON has: type ('bar'), data (array of objects), xAxisKey (string), and series (array of {key, color} objects)." },
                  { icon: Layout, text: "Strategic Roadmap", cmd: "Create a 3-month strategic plan for a boutique startup" },
                  { icon: Command, text: "System Synthesis", cmd: "Explain the core mechanics of privacy-focused AI" },
                  { icon: FileText, text: "Technical Drafting", cmd: "Draft a concise executive report on market trends" }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInput(item.cmd)}
                    className="flex items-center gap-4 p-5 bg-[#0a0a0a] border border-[#111111] rounded-xl hover:border-[#0070f3] hover:bg-[#111111] transition-all text-left group"
                  >
                    <item.icon size={20} className="text-[#0070f3] group-hover:scale-110 transition-transform" />
                    <span className="text-white font-bold text-sm uppercase tracking-widest">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            getActiveSession()?.messages.map((m, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] sm:max-w-[80%] group relative ${
                  m.role === 'user' 
                    ? 'bg-[#0070f3] text-white rounded-3xl rounded-tr-none px-6 py-5 shadow-2xl shadow-[#0070f3]/20' 
                    : 'bg-[#0a0a0a] border border-[#111111] rounded-3xl rounded-tl-none px-7 py-6 shadow-xl'
                }`}>
                  <div className={`markdown-body ${m.role === 'user' ? 'text-white' : 'text-white'}`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          const lang = match ? match[1] : '';
                          if (!inline && lang === 'recharts') {
                            try {
                              const config = JSON.parse(String(children).replace(/\n$/, ''));
                              const ChartType = config.type === 'line' ? LineChart 
                                              : config.type === 'pie' ? PieChart 
                                              : config.type === 'area' ? AreaChart
                                              : BarChart;
                              const DataComponent: any = config.type === 'line' ? Line 
                                              : config.type === 'pie' ? Pie 
                                              : config.type === 'area' ? Area
                                              : Bar;
                              
                              return (
                                <div className="my-6 p-4 bg-[#050505] border border-[#111111] rounded-xl shadow-lg h-[350px]">
                                  <div className="mb-2 text-center text-xs font-bold text-[#0070f3] uppercase tracking-widest">{config.title || "Visualised Report"}</div>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <ChartType data={config.data}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                      <XAxis dataKey={config.xAxisKey} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                      <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', borderRadius: '8px' }} />
                                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                      {config.series.map((s: any, i: number) => (
                                        <DataComponent 
                                          key={i} 
                                          type="monotone" 
                                          dataKey={s.key} 
                                          stroke={s.color || "#0070f3"} 
                                          fill={s.color || "#0070f3"} 
                                          strokeWidth={2}
                                        />
                                      ))}
                                    </ChartType>
                                  </ResponsiveContainer>
                                </div>
                              );
                            } catch (e) {
                              return <div className="text-red-500 text-xs my-4 p-4 border border-red-500/30 rounded bg-red-500/10">Failed to render chart: Invalid JSON configuration</div>;
                            }
                          }
                          return <code className={className} {...props}>{children}</code>
                        }
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  
                  {m.audioUrl && (
                    <div className="mt-4 pt-4 border-t border-[#111111] w-full">
                       <audio controls className="w-full h-10 outline-none" src={m.audioUrl} />
                    </div>
                  )}

                  {m.role === 'assistant' && m.thoughtProcess && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <button 
                        onClick={() => setOpenThoughts(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors"
                      >
                        <ChevronDown size={12} className={`transition-transform ${openThoughts[m.id] ? 'rotate-180' : ''}`} />
                        System Logic Analysis
                      </button>
                      <AnimatePresence>
                        {openThoughts[m.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 p-4 bg-[#050505] rounded-xl border border-[#111111] shadow-inner">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                {Object.entries(JSON.parse(m.thoughtProcess)).map(([key, val]) => (
                                  key !== 'inferredAction' && (
                                    <div key={key}>
                                      <span className="block text-[8px] text-[#71717a] font-black uppercase tracking-widest mb-1">{key}</span>
                                      <span className="text-[11px] text-[#3b82f6] font-bold">{String(val)}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                              <div className="pt-3 border-t border-[#111111]">
                                <span className="block text-[8px] text-[#71717a] font-black uppercase tracking-widest mb-1">Execution Strategy</span>
                                <p className="text-[11px] text-white/70 leading-relaxed italic">
                                  {JSON.parse(m.thoughtProcess).inferredAction}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className={`flex items-center justify-between mt-5 text-[11px] ${m.role === 'user' ? 'text-white/60' : 'text-[#71717a]'}`}>
                    <span className="font-mono tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => copyToClipboard(m.content, m.id)}
                         className={`p-2 rounded-lg transition-all ${
                           m.role === 'user' 
                             ? 'hover:bg-white/10' 
                             : 'hover:bg-[#111111]'
                         } text-[#3b82f6]`}
                       >
                         {copiedId === m.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                       </button>
                       {m.role === 'assistant' && (m.tokenCount || m.isStreaming) && (
                         <span className="flex items-center gap-2 bg-[#111111] px-3 py-1 rounded-full font-black uppercase tracking-tightest text-[9px] text-[#3b82f6] border border-[#111111]">
                           <Sparkles size={10} className={m.isStreaming ? 'animate-pulse' : ''} /> 
                           {m.isStreaming ? 'Computing' : `${m.modelUsed ? `${m.modelUsed} | ` : ''}${m.tokenCount} Tokens`}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {isSessionLoading(activeSessionId) && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex justify-start"
            >
              <div className="bg-[var(--card-app)] border border-[var(--border-app)] rounded-sm rounded-tl-none px-8 py-5 flex gap-4 items-center shadow-2xl relative overflow-hidden group">
                <motion.div 
                  animate={{ 
                    rotate: [0, 90, 180, 270, 360],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-[var(--accent-app)] rounded-sm"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-app)] mb-1">Processing</span>
                  <span className="text-xs font-bold text-[var(--text-secondary)] italic">System is calculating response...</span>
                </div>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-app)]/5 to-transparent -translate-x-full"
                  animate={{ translateX: ["100%", "-100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-sm text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
              <X size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Interraction Area (Input & Controls) */}
        <div className="relative border-t border-[#111111] bg-[#000000] p-2 sm:p-10 transition-all">
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            
            <AnimatePresence />

            <div className="relative">
              <AnimatePresence>
                {showParamMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute bottom-full left-0 mb-4 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-[#0a0a0a] border border-[#111111] shadow-2xl p-6 sm:p-7 z-50 rounded-3xl backdrop-blur-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0070f3]">Strategy Settings</span>
                    </div>
                    <div className="space-y-8">
                       <div className="space-y-3">
                         <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase tracking-widest text-[#71717a]">
                           <label>Model</label>
                           <button 
                             onClick={() => {
                               const provider = getActiveProvider();
                               if (provider) fetchProviderModels(provider);
                             }}
                             className="text-[9px] font-bold text-[#0070f3] hover:underline uppercase tracking-wide flex items-center gap-1"
                           >
                             <RefreshCw size={10} />
                           </button>
                         </div>
                         <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                           {displayCategories.map(category => (
                             <div key={category}>
                               <div className="text-[9px] uppercase tracking-widest text-[#71717a] font-bold mb-1 pl-2">{category}</div>
                               <div className="space-y-1">
                                 {displayModels.filter(m => m.category === category).map(m => (
                                   <button
                                     key={m.id}
                                     onClick={() => {
                                       setSettings(s => ({ ...s, model: m.id }));
                                       setShowParamMenu(false);
                                     }}
                                     className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${settings.model === m.id ? 'bg-[#0070f3]/10 text-[#0070f3]' : 'text-white hover:bg-[#111111]'}`}
                                   >
                                     {m.label}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                       <div className="space-y-3">
                         <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase tracking-widest text-[#71717a]">
                           <label>Provider</label>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {settings.providers.filter(p => p.enabled).map(p => (
                             <button
                               key={p.id}
                               onClick={() => {
                                 setSettings(s => ({ ...s, activeProviderId: p.id }));
                               }}
                               className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                 (settings.activeProviderId === p.id || (!settings.activeProviderId && settings.providers[0]?.id === p.id))
                                   ? 'bg-[#0070f3] text-white shadow-lg shadow-[#0070f3]/20'
                                   : 'bg-[#111111] text-[#71717a] hover:text-white border border-white/5'
                               }`}
                             >
                               {p.name}
                             </button>
                           ))}
                         </div>
                       </div>
                      <div>
                         <div className="flex justify-between mb-3 text-[10px] font-black uppercase tracking-widest text-[#71717a]">
                          <label>Logical Depth</label>
                          <span className="text-[#0070f3] font-mono">{settings.maxOutputTokens || 2048}</span>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="8192"
                          step="128"
                          value={settings.maxOutputTokens ?? 2048}
                          onChange={(e) => setSettings(s => ({ ...s, maxOutputTokens: Number(e.target.value) }))}
                          onMouseUp={() => setTimeout(() => setShowParamMenu(false), 200)}
                          onTouchEnd={() => setTimeout(() => setShowParamMenu(false), 200)}
                          className="w-full h-1 bg-[#111111] rounded-lg appearance-none cursor-pointer accent-[#0070f3]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 sm:gap-3 bg-[#0a0a0a] border border-[#111111] focus-within:border-[#0070f3] rounded-[24px] sm:rounded-3xl p-2 pl-4 sm:p-5 sm:pl-7 transition-all shadow-2xl ring-1 ring-[#0070f3]/10">
                <div className="flex gap-1 mb-1 sm:mb-1">
                  <button 
                    onClick={() => setShowParamMenu(!showParamMenu)}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all ${showParamMenu ? 'bg-[#0070f3]/10 text-[#0070f3]' : 'hover:bg-[#111111] text-[#71717a] hover:text-[#0070f3]'}`}
                    title="Strategy Settings"
                  >
                    <Sliders size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
                <textarea 
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      e.currentTarget.style.height = 'auto';
                    }
                  }}
                  placeholder="Initiate sequence..."
                  rows={1}
                  className="flex-1 max-h-48 sm:max-h-64 bg-transparent border-none focus:ring-0 text-white placeholder-white/20 resize-none py-3 scroll-hide font-semibold text-base sm:text-lg tracking-tight leading-relaxed"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isSessionLoading(activeSessionId)}
                  className={`p-3 sm:p-4 mb-0.5 sm:mb-1 rounded-xl sm:rounded-2xl transition-all shadow-2xl ${
                    input.trim() 
                      ? 'bg-[#0070f3] text-white hover:scale-105 active:scale-95 shadow-[#0070f3]/50' 
                      : 'bg-[#111111] text-[#71717a] opacity-50'
                  }`}
                >
                  <Send size={18} className="sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </div>
          <div className="text-center mt-6 text-[9px] text-[#71717a] uppercase tracking-[0.7em] font-black opacity-40">
            iluv <span className="text-[#3b82f6]">|</span> ARCHITECT OF SECURE INTELLIGENCE
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-none shadow-2xl p-6 overflow-hidden border border-[var(--border-app)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--accent-app)]">System Parameters</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0070f3]">Active Intelligence Provider</span>
                  </div>
                  <select
                    value={settings.activeProviderId || settings.providers[0]?.id}
                    onChange={(e) => setSettings(s => ({ ...s, activeProviderId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-sm text-[var(--accent-app)]"
                  >
                    {settings.providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.enabled ? '' : '(Disabled)'}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-6 pt-4 border-t border-[var(--border-app)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#71717a]">Manage Providers</span>
                  </div>

                  {settings.providers.map((provider, idx) => (
                    <div key={provider.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-app)] space-y-4 relative group/item">
                      <div className="flex items-center justify-between mb-2">
                        <input 
                          value={provider.name}
                          readOnly
                          className="bg-transparent border-none focus:ring-0 font-bold text-sm text-[var(--accent-app)] p-0 w-2/3"
                        />
                        <div className="flex items-center gap-2">
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#71717a]">Authentication Key</label>
                        <input 
                          type="password"
                          value={provider.apiKey}
                          onChange={(e) => {
                            const newProviders = [...settings.providers];
                            newProviders[idx].apiKey = e.target.value;
                            setSettings(s => ({ ...s, providers: newProviders }));
                          }}
                          placeholder="API Key"
                          className="w-full bg-white dark:bg-slate-900 border border-[var(--border-app)] rounded-none py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#71717a]">Base Endpoint URL</label>
                        <input 
                          value={provider.baseUrl}
                          onChange={(e) => {
                            const newProviders = [...settings.providers];
                            newProviders[idx].baseUrl = e.target.value;
                            setSettings(s => ({ ...s, providers: newProviders }));
                          }}
                          placeholder="https://api.openai.com"
                          className="w-full bg-white dark:bg-slate-900 border border-[var(--border-app)] rounded-none py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6 pt-4 border-t border-[var(--border-app)]">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#71717a]">Model Designation</span>
                     <button 
                       onClick={() => {
                         const provider = getActiveProvider();
                         if (provider) fetchProviderModels(provider);
                       }}
                       className="text-[9px] font-bold text-[#0070f3] hover:underline uppercase tracking-wide flex items-center gap-1"
                     >
                       <RefreshCw size={10} />
                       Refresh Models
                     </button>
                  </div>

                  <select
                    value={settings.model}
                    onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-sm text-[var(--accent-app)]"
                  >
                    {settings.model && !displayModels.map(m => m.id).includes(settings.model) && (
                      <option value={settings.model}>{settings.model}</option>
                    )}
                    {displayCategories.map(category => (
                       <optgroup key={category} label={category}>
                         {displayModels.filter(m => m.category === category).map(m => (
                           <option key={m.id} value={m.id}>{m.label}</option>
                         ))}
                       </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-app)] relative group">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-[var(--accent-app)] text-[var(--bg-app)] py-4 rounded-none font-bold uppercase tracking-widest active:scale-[0.98] transition-all relative overflow-hidden"
                >
                  <span className="relative z-10">Commit Changes</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
