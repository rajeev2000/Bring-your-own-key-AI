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
  Headphones,
  Archive,
  Combine,
  FolderDown,
  FolderUp,
  GraduationCap,
  BookOpen,
  Menu,
  SquarePen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

import { Message, ChatSession, AppSettings, DEFAULT_MODEL, DEFAULT_BASE_URL, Attachment } from './types';
import { NotificationSystem } from './lib/NotificationSystem';

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
  const [restoreAsMemory, setRestoreAsMemory] = useState(false);
  const [showManageSessions, setShowManageSessions] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showParamMenu, setShowParamMenu] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [fetchedModels, setFetchedModels] = useState<Record<string, { id: string; label: string; category: string }[]>>({});
  const [pendingOptions, setPendingOptions] = useState<{ query: string; options: string[] } | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
      parsed.themePreset = 'light';
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
      themePreset: 'light',
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

  // --- Background Job Worker ---
  const processingJobRef = useRef<boolean>(false);
  useEffect(() => {
    NotificationSystem.requestPermission();

    const engagementInterval = setInterval(() => {
      NotificationSystem.checkAndSendEngagementNotification();
    }, 60000); // Check every minute

    const workerInterval = setInterval(async () => {
      if (processingJobRef.current) return;

      let jobs: any[] = [];
      try {
        jobs = JSON.parse(localStorage.getItem('iluv_jobs') || '[]');
      } catch (e) {
        return;
      }

      const now = Date.now();
      // Retry stuck jobs after 2 minutes
      jobs = jobs.map(j => {
        if (j.status === 'processing' && (now - (j.lastAttempt || j.startedAt) > 120000)) {
          return { ...j, status: 'pending' };
        }
        return j;
      });

      const job: any = jobs.find(j => j.status === 'pending');
      if (!job) {
        localStorage.setItem('iluv_jobs', JSON.stringify(jobs));
        return;
      }

      processingJobRef.current = true;
      job.status = 'processing';
      job.lastAttempt = now;
      localStorage.setItem('iluv_jobs', JSON.stringify(jobs));

      setLoadingSessions(prev => new Set(prev).add(job.sessionId));

      try {
        const { id: assistantMessageId, sessionId, model, provider, settings: jobSettings, sysInstruction, history } = job;
        const isGemini = provider.baseUrl.includes('generative');
        const startTime = Date.now();
        let fullText = '';
        let finalTokens = 0;
        let generatedAttachments: any[] = [];

        if (isGemini) {
          const ai = new GoogleGenAI({ 
            apiKey: provider.apiKey,
            httpOptions: provider.baseUrl !== DEFAULT_BASE_URL ? { baseUrl: provider.baseUrl } : undefined
          });
          
          let isImagen = model.toLowerCase().includes('imagen') || model.toLowerCase().includes('nano') || model.toLowerCase().includes('image');
          let imagenSuccess = false;

          if (isImagen) {
            try {
              const promptMsg = history[history.length - 1].content || 'A beautiful image';
              const response = await ai.models.generateImages({
                model: model,
                prompt: promptMsg,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
              });
              
              if (response.generatedImages && response.generatedImages[0]) {
                generatedAttachments.push({
                   name: `imagen_${Date.now()}.jpeg`,
                   type: 'image/jpeg',
                   data: response.generatedImages[0].image.imageBytes,
                   isText: false
                });
                fullText = "";
                imagenSuccess = true;
              } else {
                throw new Error("Model failed to return an image asset.");
              }

              setSessions(prev => prev.map(s => s.id === sessionId ? {
                  ...s,
                  messages: s.messages.map(m => m.id === assistantMessageId ? { 
                    ...m, content: fullText, modelUsed: model, attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
                  } : m),
                  updatedAt: Date.now()
                } : s));
            } catch (e: any) {
              if (e && e.message && (e.message.includes('predict') || e.message.includes('not supported') || e.message.includes('404'))) {
                console.warn("generateImages failed, falling back to generateContentStream...", e);
                imagenSuccess = false;
                isImagen = false;
              } else throw e;
            }
          }
          
          if (!isImagen || !imagenSuccess) {
            const apiHistory = history.map((m: any) => {
              const parts: any[] = [{ text: m.content || '' }];
              if (m.attachments) {
                m.attachments.forEach((att: any) => {
                  if (att.isText) {
                    parts.push({ text: `\n[FILE: ${att.name}]\n${att.content}\n[END FILE]` });
                  } else {
                    parts.push({ inlineData: { data: att.data, mimeType: att.type } });
                  }
                });
              }
              return { role: m.role === 'assistant' ? 'model' : m.role, parts };
            });

            const configOpts: any = { systemInstruction: sysInstruction };
            if (jobSettings.temperature !== undefined) configOpts.temperature = Number(jobSettings.temperature);
            if (jobSettings.maxOutputTokens !== undefined) configOpts.maxOutputTokens = Number(jobSettings.maxOutputTokens);

            const responseStream = await ai.models.generateContentStream({
              model: model,
              contents: apiHistory,
              config: configOpts
            });

            for await (const chunk of responseStream) {
              fullText += (chunk.text || '');
              if (chunk.usageMetadata) finalTokens = chunk.usageMetadata.candidatesTokenCount || 0;
              
              if (chunk.candidates?.[0]?.content?.parts) {
                chunk.candidates[0].content.parts.forEach((p: any) => {
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

              setSessions(prev => prev.map(s => s.id === sessionId ? {
                  ...s,
                  messages: s.messages.map(m => m.id === assistantMessageId ? { 
                    ...m, content: fullText.replace(/<options>.*?<\/options>/s, '').trim(), modelUsed: model, attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
                  } : m),
                  updatedAt: Date.now()
                } : s));
            }

            if (fullText.includes('<options>')) {
              const match = fullText.match(/<options>(.*?)<\/options>/s);
              if (match && match[1]) {
                try {
                  setPendingOptions(JSON.parse(match[1]));
                } catch(e) {}
              }
            }
          }
        } else {
          // OpenAI-compatible via Proxy
          const isLegacyModel = model.toLowerCase().includes('instruct') || model.toLowerCase().includes('davinci') || model.toLowerCase().includes('curie') || model.toLowerCase().includes('babbage') || model.toLowerCase().includes('ada');
          const isO1Model = model.toLowerCase().startsWith('o1') || model.toLowerCase().startsWith('o3') || model.toLowerCase().startsWith('o4') || model.toLowerCase().includes('thinking') || model.toLowerCase().includes('reasoning') || model.toLowerCase().includes('latest');
          const isImageModel = model.toLowerCase().includes('dall-e') || model.toLowerCase().includes('image') || model.toLowerCase().includes('video') || model.toLowerCase().includes('sora') || model.toLowerCase().includes('runway') || model.toLowerCase().includes('luma') || model.toLowerCase().includes('veo') || model.toLowerCase().includes('kling') || model.toLowerCase().includes('minimax') || model.toLowerCase().includes('hailuo') || model.toLowerCase().includes('pika') || model.toLowerCase().includes('haiper');

          const apiMessages = [
            { role: 'system', content: sysInstruction },
            ...history.map((m: any) => {
              let content = m.content;
              if (m.attachments) {
                m.attachments.forEach((att: any) => {
                  if (att.isText) content += `\n[FILE: ${att.name}]\n${att.content}\n[END FILE]`;
                  else if (att.data) content += `\n[${att.type.startsWith('image/') ? 'IMAGE' : 'FILE'} ATTACHED: ${att.name}]`;
                });
              }
              return { role: m.role, content };
            })
          ];

          const base = cleanBaseUrl(provider.baseUrl);
          const endpoint = isImageModel ? 'images/generations' : (isLegacyModel ? 'completions' : 'chat/completions');
          const url = `${base}/v1/${endpoint}`;

          const tokenLimit = isLegacyModel ? 4096 : (model.includes('gpt-4') ? 8192 : 4096);
          let maxTokens = jobSettings.maxOutputTokens ?? 2048;
          if (maxTokens > tokenLimit) maxTokens = tokenLimit;

          const requestBody: any = { model };
          if (!isImageModel) requestBody.temperature = isO1Model ? 1 : (jobSettings.temperature ?? 0.7);

          if (isImageModel) {
            requestBody.prompt = history[history.length - 1].content || 'A beautiful image';
            if (!model.toLowerCase().includes('video') && !model.toLowerCase().includes('runway') && !model.toLowerCase().includes('luma') && !model.toLowerCase().includes('sora') && !model.toLowerCase().includes('kling') && !model.toLowerCase().includes('veo') && !model.toLowerCase().includes('hailuo') && !model.toLowerCase().includes('minimax')) {
              requestBody.n = 1;
              requestBody.size = "1024x1024";
            }
          } else if (isLegacyModel) {
            requestBody.prompt = apiMessages.map(m => `${m.role === 'system' ? 'Instruction' : m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.content}`).join('\n') + '\nAssistant: ';
            requestBody.max_tokens = maxTokens;
          } else {
            requestBody.messages = apiMessages;
            if (isO1Model) requestBody.max_completion_tokens = maxTokens;
            else requestBody.max_tokens = maxTokens;
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

          if (!isJson) throw new Error('Endpoint returned success but response was not JSON. Please check your Base URL.');

          const data = await res.json();
          console.log('OpenAI-compatible Raw Response:', data);
          
          if (isImageModel) {
            const item = (data.data && data.data[0]) ? data.data[0] : data;
            let b64 = item.b64_json;
            let resultUrl = item.url || item.video_url || item.image_url;
            
            if (b64 || resultUrl) {
              let mimeType = 'image/png';
              let fileExt = 'png';
              
              if (!b64 && resultUrl) {
                const imgRes = await fetch(resultUrl);
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
                fullText = ""; 
              } else throw new Error("Failed to extract media from response (no b64_json found after fetch).");
            } else throw new Error("Model response did not contain image data (URL or B64). Raw: " + JSON.stringify(data).slice(0, 200));
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
                setPendingOptions(JSON.parse(match[1]));
                fullText = fullText.replace(/<options>.*?<\/options>/s, '').trim();
              } catch(e) {}
            }
          }

          setSessions(prev => prev.map(s => s.id === sessionId ? {
              ...s,
              messages: s.messages.map(m => m.id === assistantMessageId ? { 
                ...m, content: fullText, isStreaming: false, attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
              } : m),
              updatedAt: Date.now()
            } : s));
        }
        
        const responseTime = (Date.now() - startTime) / 1000;

        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMessageId ? { 
              ...m, isStreaming: false, tokenCount: finalTokens || undefined, modelUsed: model, responseTime 
            } : m),
            updatedAt: Date.now()
          } : s));

        // Delete successful job
        const updatedJobs = JSON.parse(localStorage.getItem('iluv_jobs') || '[]').filter((j: any) => j.id !== job.id);
        localStorage.setItem('iluv_jobs', JSON.stringify(updatedJobs));

        NotificationSystem.sendSuccessNotification("iluv Task Complete", `The response for "${history[history.length - 1]?.content?.slice(0, 30) || 'your prompt'}..." is ready.`);

      } catch (err: any) {
        console.error("Job failed:", err);
        const currentJobs = JSON.parse(localStorage.getItem('iluv_jobs') || '[]');
        const idx = currentJobs.findIndex((j: any) => j.id === job.id);
        if (idx !== -1) {
          currentJobs[idx].status = 'pending';
          currentJobs[idx].retries = (currentJobs[idx].retries || 0) + 1;
          
          if (currentJobs[idx].retries > 3) {
            // Hard fail, discard job
            currentJobs.splice(idx, 1);
            setSessions(prev => prev.map(s => s.id === job.sessionId ? {
              ...s,
              messages: s.messages.map(m => m.id === job.id ? { 
                ...m, content: `System Error: Job exceeded retries. ${err.message}`, isStreaming: false
              } : m)
            } : s));
          }
          localStorage.setItem('iluv_jobs', JSON.stringify(currentJobs));
        }
      } finally {
        setLoadingSessions(prev => {
          const next = new Set(prev);
          next.delete(job.sessionId);
          return next;
        });
        processingJobRef.current = false;
      }
    }, 1500);

    return () => {
      clearInterval(workerInterval);
      clearInterval(engagementInterval);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt');
      
      if (isText) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setPendingAttachments(prev => [...prev, {
            name: file.name,
            type: file.type || 'text/plain',
            content: content,
            isText: true
          }]);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          setPendingAttachments(prev => [...prev, {
            name: file.name,
            type: file.type,
            data: base64,
            isText: false
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
    // Reset input
    e.target.value = '';
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
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
    if (textareaRef.current) {
      const scrollPos = window.scrollY;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      window.scrollTo(0, scrollPos);
    }
  }, [input]);

  useEffect(() => {
    try {
      localStorage.setItem('iluv_sessions', JSON.stringify(sessions));
    } catch (err) {
      console.warn('LocalStorage Quota Exceeded', err);
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('iluv_settings', JSON.stringify(settings));
    
    const root = window.document.documentElement;
    // Apply theme
    const THEMES: Record<string, Record<string, string>> = {
      dark: {
        '--bg-app': '#000000',
        '--text-app': '#ffffff',
        '--accent-app': '#d4d4d8',
        '--border-app': '#27272a',
        '--card-app': '#09090b',
        '--text-secondary': '#a1a1aa',
        'color-scheme': 'dark'
      },
      light: {
        '--bg-app': '#f8f9fa',
        '--text-app': '#27272a',
        '--accent-app': '#52525b',
        '--border-app': '#e5e7eb',
        '--card-app': '#ffffff',
        '--text-secondary': '#71717a',
        'color-scheme': 'light'
      }
    };

    const preset = settings.themePreset || 'light';
    const themeColors = THEMES[preset] || THEMES.light;

    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    if (preset === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [settings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, loadingSessions]);



  const handleArchiveSessions = () => {
    setSessions(prev => prev.map(s => selectedSessionIds.has(s.id) ? { ...s, isArchived: true } : s));
    setSelectedSessionIds(new Set());
    setShowManageSessions(false);
  };

  const handleUnarchiveSessions = () => {
    setSessions(prev => prev.map(s => selectedSessionIds.has(s.id) ? { ...s, isArchived: false } : s));
    setSelectedSessionIds(new Set());
  };

  const handleMergeSessions = () => {
    if (selectedSessionIds.size < 2) {
      setError("Please select at least two sessions to merge.");
      return;
    }
    const sessionsToMerge = sessions.filter(s => selectedSessionIds.has(s.id)).sort((a, b) => a.createdAt - b.createdAt);
    const mergedMessages = sessionsToMerge.flatMap(s => s.messages).sort((a, b) => a.timestamp - b.timestamp);
    
    const newSession: ChatSession = {
      id: generateId(),
      title: `Merged: ${sessionsToMerge.map(s => s.title).join(', ').slice(0, 30)}...`,
      messages: mergedMessages,
      createdAt: sessionsToMerge[0].createdAt,
      updatedAt: Date.now(),
      studyMode: false
    };
    
    const remainingSessions = sessions.filter(s => !selectedSessionIds.has(s.id));
    setSessions([newSession, ...remainingSessions]);
    setSelectedSessionIds(new Set());
    setShowManageSessions(false);
  };

  const handleDeleteSelectedSessions = () => {
    setSessions(prev => prev.filter(s => !selectedSessionIds.has(s.id)));
    if (activeSessionId && selectedSessionIds.has(activeSessionId)) {
      setActiveSessionId(null);
    }
    setSelectedSessionIds(new Set());
  };

  const handleExportSessions = (exportAll: boolean = false) => {
    const sessionsToExport = exportAll ? sessions : sessions.filter(s => selectedSessionIds.has(s.id));
    if (sessionsToExport.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionsToExport, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `iluv_sessions_export_${Date.now()}.json`;
    a.click();
    setSelectedSessionIds(new Set());
  };

  const handleRestoreSessions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as ChatSession[];
        
        if (!Array.isArray(parsed) || !parsed[0]?.id) throw new Error("Invalid backup format");

        if (restoreAsMemory) {
          const formattedMemory = parsed.map(s => `CHAT [${s.title}]:\n` + s.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')).join('\n\n');
          setSettings(prev => ({
            ...prev,
            chatMemory: (prev.chatMemory ? prev.chatMemory + '\n\n' : '') + formattedMemory
          }));
          alert('Chat data successfully loaded into memory context!');
        } else {
          // Add to existing sessions without overriding existing unique IDs
          const existingIds = new Set(sessions.map(s => s.id));
          const toAdd = parsed.filter(s => !existingIds.has(s.id));
          setSessions(prev => [...toAdd, ...prev].sort((a, b) => b.createdAt - a.createdAt));
          alert(`Restored ${toAdd.length} new sessions.`);
        }
      } catch (err) {
        console.error("Failed to restore sessions", err);
        alert('Failed to restore sessions. Invalid file format.');
      }
      e.target.value = ''; // reset
    };
    reader.readAsText(file);
  };

  // --- End session management ---

  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);
  const isSessionLoading = (id: string | null) => id ? loadingSessions.has(id) : false;

  const createNewSession = () => {
    setError(null);
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      studyMode: false
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

  const toggleStudyMode = (sessionId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, studyMode: !s.studyMode };
      }
      return s;
    }));
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

  const generateSessionTitle = async (sessionId: string, currentInput: string, provider: any) => {
    // Immediate local fallback
    let generatedTitle = currentInput.slice(0, 40).trim() + (currentInput.length > 40 ? '...' : '');
    
    try {
      if (!provider || !provider.apiKey) return;

      const isGemini = provider.baseUrl.includes('generative');
      const model = settings.model || DEFAULT_MODEL;

      if (isGemini) {
        const ai = new GoogleGenAI({ 
          apiKey: provider.apiKey,
          httpOptions: provider.baseUrl !== DEFAULT_BASE_URL ? { baseUrl: provider.baseUrl } : undefined
        });
        const response = await ai.models.generateContent({
          model: model.includes('imagen') || model.includes('veo') ? 'gemini-3.1-flash-lite-preview' : model, 
          contents: [{ role: 'user', parts: [{ text: `Summarize this first chat message into a very short, catchy title (max 5 words). Output ONLY the title text, nothing else: "${currentInput}"` }] }]
        });
        if (response.text?.trim()) {
          generatedTitle = response.text.trim().replace(/^["']|["']$/g, '');
        }
      } else {
        // OpenAI compatible title generation
        const base = cleanBaseUrl(provider.baseUrl);
        const url = `${base}/v1/chat/completions`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: `Summarize this first chat message into a very short, catchy title (max 5 words). Output ONLY the title text, nothing else: "${currentInput}"` }],
            max_tokens: 20,
            temperature: 0.5
          })
        });
        if (res.ok) {
          const data = await res.json();
          const title = data.choices?.[0]?.message?.content?.trim();
          if (title) {
            generatedTitle = title.replace(/^["']|["']$/g, '');
          }
        }
      }
    } catch (e) {
      console.warn("Failed to generate session title via AI, using fallback.", e);
    }

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, title: generatedTitle };
      }
      return s;
    }));
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
    
    NotificationSystem.logActivity();
    
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
        timestamp: Date.now(),
        attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
      };
      setPendingAttachments([]);

      let updatedSessions = [...sessions];
      
      const isFirstMessage = !activeSession || activeSession.messages.length === 0 || activeSession.title === 'New Chat' || activeSession.title === 'New iluv session';

      if (!activeSession) {
        const newSession: ChatSession = {
          id: sessionId,
          title: currentInput.slice(0, 40).trim() + (currentInput.length > 40 ? '...' : ''),
          messages: [userMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          studyMode: false
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
              updatedAt: Date.now(),
              // Update title immediately if it's the first message or default title
              title: isFirstMessage ? (currentInput.slice(0, 40).trim() + (currentInput.length > 40 ? '...' : '')) : s.title
            };
          }
          return s;
        });
        setSessions(updatedSessions);
      }

      if (isFirstMessage) {
        generateSessionTitle(sessionId!, currentInput, provider);
      }

      const currentSession = updatedSessions.find(s => s.id === sessionId)!;
      const model = settings.model || DEFAULT_MODEL;
      const isGemini = provider.baseUrl.includes('generative');

      let sysInstruction = "You are a highly efficient AI assistant focused on 100% accuracy and direct utility. \n\nCORE PROTOCOLS:\n1. DIRECTNESS: Provide the requested answer immediately. Skip all introductory phrases, 'luxury' descriptors (elite, bespoke, etc.), and concluding summaries unless they contain essential data.\n2. CLARIFICATION: If a request is broad, ambiguous, or lacks specific parameters (e.g., format, scope, target audience), you MUST pause and ask clarifying questions. Use the <options> format to provide 3-5 distinct paths for the user to choose from to ensure a correct result.\n3. FORMATTING: Wrap clarify options in: <options>{\"query\": \"Clarifying Question?\", \"options\": [\"Option A\", \"Option B\"]}</options>. Use GFM tables for data.\n4. CONCISENESS: Keep explanations minimal and strictly technical unless 'detailed explanation' is requested.";
      
      if (currentSession.studyMode) {
        sysInstruction = "You are a patient and structured Study Assistant. Your goal is to guide the user towards understanding using educational best practices.\n\nSTUDY MODE PROTOCOLS:\n1. STRUCTURE: You MUST always output a structured response with clear Markdown headings for: 'Concept Explanation', 'Step-by-Step Breakdown', 'Guided Learning', and 'Analogy' (if applicable).\n2. AVOID NORMAL CHAT: Do NOT reply with a standard conversational response. ALWAYS use the structured format described above for every response.\n3. CONCEPT EXPLANATION: Briefly explain the underlying 'why' behind the topic or answer.\n4. STEP-BY-STEP: Break down complex problems into logical, numbered steps.\n5. GUIDED LEARNING: Do not just give the final answer; show the thought process clearly.\n6. TONE: Maintain an encouraging, academic, yet clear and accessible tone.\n7. CLARIFICATION & FORMATTING: Keep the standard <options> and GFM table tools available for layout.";
      }

      if (settings.maxOutputTokens !== undefined && settings.maxOutputTokens > 0) {
        sysInstruction += `\n5. TOKEN BUDGET: Strictly fit within ${settings.maxOutputTokens} tokens. Finish thoughts completely.`;
      }

      if (settings.chatMemory) {
        sysInstruction += `\n\nBACKGROUND MEMORY: Below is context from past restored sessions for your reference:\n${settings.chatMemory}\n`;
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

      const job = {
         id: assistantMessageId,
         sessionId,
         model,
         provider,
         settings,
         sysInstruction,
         history: currentSession.messages,
         startedAt: Date.now(),
         status: 'pending',
         retries: 0
      };

      try {
        const jobs = JSON.parse(localStorage.getItem('iluv_jobs') || '[]');
        jobs.push(job);
        localStorage.setItem('iluv_jobs', JSON.stringify(jobs));
      } catch(err) {
        throw new Error("Failed to queue background task (localStorage full?). Please clear data.");
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      if (sessionId) {
        setLoadingSessions(prev => {
          const next = new Set(prev);
          next.delete(sessionId!);
          return next;
        });
      }
    }
  };

  const exportMessageToPDF = (message: Message) => {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text(`iluv Response: ${new Date(message.timestamp).toLocaleString()}`, 10, y);
    y += 10;
    doc.setFontSize(10);
    
    // removing json blocks for pdf
    const content = message.content.replace(/```recharts[\s\S]*?```/g, '[Visualisation omitted in PDF]');
    const splitText = doc.splitTextToSize(content, 180);
    
    if (y + splitText.length * 5 > 280) {
      doc.addPage();
      y = 10;
    }
    
    doc.text(splitText, 10, y);
    doc.save(`iluv_Response_${message.id}.pdf`);
  };

  const exportMessageToExcel = (message: Message) => {
    const data = [{
      Role: message.role,
      Content: message.content.replace(/```recharts[\s\S]*?```/g, '[Visualisation omitted]'),
      Timestamp: new Date(message.timestamp).toLocaleString(),
      Tokens: message.tokenCount || '-',
      Model: message.modelUsed || 'N/A'
    }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Message");
    XLSX.writeFile(wb, `iluv_Response_${message.id}.xlsx`);
  };

  const exportMessageToWord = async (message: Message) => {
    const children = [
      new Paragraph({
        children: [
          new TextRun({ text: `iluv Response: ${new Date(message.timestamp).toLocaleString()}`, bold: true, size: 32 })
        ]
      }),
      new Paragraph({ text: "" }) 
    ];

    const content = message.content.replace(/```recharts[\s\S]*?```/g, '[Visualisation omitted]');
    children.push(new Paragraph({
      children: [
        new TextRun({ text: content })
      ]
    }));

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
    a.download = `iluv_Response_${message.id}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePodcastAudioForMessage = async (message: Message) => {
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
            content: '*Generating podcast audio script for the requested response... This might take a few moments.*',
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
      
      const textPrompt = `Convert the following response into an engaging 1-minute podcast script. Keep it enthusiastic, informative, and speak directly to the listener as a podcast host. ONLY output the script, no introductions.\n\nResponse to convert:\n"""${message.content}"""`;
      
      let summaryText = "";
      try {
        const summaryResponse = await ai.models.generateContent({
          model: settings.model || 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts: [{ text: textPrompt }] }]
        });
        summaryText = summaryResponse.text || "Welcome to the podcast!";
      } catch (e: any) {
         console.warn("Failed to generate summary, using fallback script.", e);
         summaryText = "Welcome to the podcast. Today we discussed several interesting topics!";
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ role: 'user', parts: [{ text: summaryText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore" // Podcast-style voice
              }
            }
          }
        }
      });

      const b64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const audioUrl = b64 ? `data:audio/wav;base64,${b64}` : undefined;

      setSessions(prev => prev.map(s => {
        if (s.id === session.id) {
          return {
            ...s,
            messages: s.messages.map(m => 
              m.id === podcastId ? { 
                ...m, 
                content: "Here is your generated podcast audio:", 
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

  const generateVisualReportForMessage = (message: Message) => {
    const request = `Please analyze this specific message: """${message.content}""". Determine if there is any numerical, categorical, or temporal data that can be visualized. If there is, summarize it concisely and provide a JSON configuration for a 'recharts' chart of the data inside a \`\`\`recharts code block. Ensure the JSON has: type ('bar', 'line', 'pie', 'area'), data (array of objects), xAxisKey (string), series (array of {key, color} objects), and title (string). If no relevant data is found, output a message indicating no visualization could be made.`;
    handleSendMessage(request, "ignore-cache");
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (data: string, filename: string, mimeType: string, isText?: boolean) => {
    try {
      let blob: Blob;
      if (isText) {
        blob = new Blob([data], { type: mimeType });
      } else {
        const byteCharacters = atob(data);
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
        blob = new Blob(byteArrays, { type: mimeType });
      }
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
              className="flex-shrink-0 flex flex-col border-r border-[var(--border-app)] bg-[var(--card-app)] z-50 fixed lg:relative h-full shadow-lg lg:shadow-none"
            >
            <div className="p-4 flex items-center justify-between border-b border-[var(--border-app)]">
              <div className="flex items-center gap-2 font-bold tracking-tighter text-xl">
                <div className="w-9 h-9 rounded-sm bg-[var(--accent-app)] flex items-center justify-center text-[var(--bg-app)] shadow-sm">
                  <Sparkles size={22} />
                </div>
                <span className="tracking-[0.2em]">iluv</span>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-[var(--border-app)] rounded-none transition-colors text-[var(--text-app)]"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="p-4">
              <button 
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--text-app)] text-[var(--bg-app)] rounded-md font-medium shadow-sm active:scale-[0.98] transition-all"
              >
                <Plus size={20} />
                <span>New Conversation</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {sessions.filter(s => !s.isArchived).map(s => (
                <div 
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setError(null); }}
                  className={`group relative flex items-center gap-3 p-3 rounded-none cursor-pointer transition-all ${
                    activeSessionId === s.id 
                      ? 'bg-[var(--card-app)] shadow-sm border border-[var(--border-app)]' 
                      : 'hover:bg-[var(--border-app)]'
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
              <button 
                onClick={() => setShowManageSessions(true)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-md bg-[var(--border-app)] hover:bg-[var(--border-app)]/80 transition-colors text-[11px] font-semibold uppercase tracking-wider text-[var(--text-app)] w-full shadow-sm"
              >
                <Command size={16} />
                <span>Manage Sessions</span>
              </button>
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
                      className="flex items-center justify-center gap-2 p-2.5 rounded-md bg-[var(--text-app)] text-[var(--bg-app)] hover:opacity-90 transition-colors text-[11px] font-semibold uppercase tracking-wider w-full shadow-sm"
                    >
                      <Download size={16} />
                      <span>Install App</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-none hover:bg-[var(--border-app)] transition-colors text-[11px] font-black uppercase tracking-widest text-[var(--text-app)] w-full"
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
              className="bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl p-8 sm:p-10 shadow-xl max-w-lg w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent-app)] to-transparent opacity-50" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-app)] animate-ping" />
                <h3 className="text-[10px] font-bold text-[var(--accent-app)] uppercase tracking-widest">System Clarification Required</h3>
              </div>

              <p className="text-xl sm:text-2xl font-bold text-[var(--text-app)] mb-8 tracking-tight leading-tight">
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
                    className="group flex items-center justify-between px-6 py-4 bg-[var(--card-app)] hover:bg-[var(--accent-app)] text-[var(--text-app)] hover:text-[var(--bg-app)] rounded-[20px] transition-all border border-[var(--border-app)] hover:border-[var(--accent-app)] text-left"
                  >
                    <span className="font-bold text-sm tracking-wide">{opt}</span>
                    <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPendingOptions(null)}
                className="mt-8 w-full py-3 text-[var(--text-secondary)] text-[10px] font-semibold uppercase tracking-wider hover:text-[var(--text-app)] transition-all"
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
            className="absolute top-4 left-4 z-40 p-2 bg-[var(--card-app)] border border-[var(--border-app)] rounded-full shadow-lg hover:bg-[var(--border-app)] transition-all text-[var(--accent-app)]"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 transition-all">
          <div className="flex-1 flex justify-start">
             <button 
                onClick={() => setSidebarOpen(true)}
                className={`p-2 hover:bg-[var(--border-app)] rounded-full transition-colors ${sidebarOpen ? 'hidden' : ''} text-[var(--text-app)]`}
             >
               <Menu size={20} />
             </button>
          </div>
          
          <div className="flex-1 flex justify-center">
            <h1 className="text-xl font-medium tracking-tight text-[var(--text-app)]">
               iluv
             </h1>
          </div>
          
          <div className="flex-1 flex justify-end gap-2">
            <button 
              onClick={createNewSession}
              className="p-2 hover:bg-[var(--border-app)] rounded-full transition-colors text-[var(--text-app)]"
              title="New Chat"
            >
              <SquarePen size={20} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scroll-smooth custom-scrollbar bg-[var(--bg-app)]"
        >
          {sessions.length === 0 || (activeSessionId && getActiveSession()?.messages.length === 0) ? (
            <div className="h-full flex flex-col justify-center max-w-2xl mx-auto w-full pt-10 sm:pt-20 px-2 sm:px-0">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
              >
                <h2 className="text-2xl sm:text-3xl font-normal text-[var(--text-secondary)] mb-1">
                  Hi there,
                </h2>
                <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-[var(--text-app)]">
                  Where should we start?
                </h1>
              </motion.div>
              
              <div className="flex flex-col gap-3 w-full">
                {[
                  { icon: Command, text: "Explore concepts", cmd: "Explain the core mechanics of privacy-focused AI" },
                  { icon: ImageIcon, text: "Create image", cmd: "Generate an image of a futuristic workspace" },
                  { icon: Headphones, text: "Create music", cmd: "Compose a 30-second lo-fi track" },
                  { icon: FileText, text: "Write anything", cmd: "Draft a concise executive report on market trends" }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInput(item.cmd)}
                    className="flex items-center gap-3 py-3 px-5 sm:px-6 bg-[var(--card-app)] border border-[var(--border-app)] rounded-full hover:bg-[var(--border-app)] transition-all text-left group w-fit"
                  >
                    <item.icon size={18} className="text-[var(--text-app)] opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[var(--text-app)] font-medium text-sm sm:text-base">{item.text}</span>
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
                className={`flex flex-col w-full ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[90%] sm:max-w-[80%] group relative ${
                  m.role === 'user' 
                    ? 'bg-[var(--border-app)] text-[var(--text-app)] rounded-2xl rounded-tr-md px-6 py-5 shadow-sm' 
                    : 'bg-[var(--card-app)] border border-[var(--border-app)] rounded-2xl rounded-tl-md px-7 py-6 shadow-sm'
                }`}>
                  <button 
                    onClick={() => copyToClipboard(m.content, m.id)}
                    className={`absolute top-4 ${m.role === 'user' ? 'left-4' : 'right-4'} p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-[var(--text-secondary)] hover:text-[var(--accent-app)] hover:bg-black/5`}
                    title="Copy text"
                  >
                    {copiedId === m.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                  <div className={`markdown-body ${m.role === 'user' ? 'text-[var(--text-app)]' : 'text-[var(--text-app)]'}`}>
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
                                <div className="my-6 p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl shadow-sm h-[350px]">
                                  <div className="mb-2 text-center text-xs font-bold text-[var(--accent-app)] uppercase tracking-widest">{config.title || "Visualised Report"}</div>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <ChartType data={config.data}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                      <XAxis dataKey={config.xAxisKey} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-app)', borderColor: 'var(--border-app)', color: 'var(--text-app)', borderRadius: '8px' }} />
                                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                      {config.series.map((s: any, i: number) => (
                                        <DataComponent 
                                          key={i} 
                                          type="monotone" 
                                          dataKey={s.key} 
                                          stroke={s.color || "var(--accent-app)"} 
                                          fill={s.color || "var(--accent-app)"} 
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
                  
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {m.attachments.map((att, idx) => (
                        <div key={idx} className="relative group/att">
                          {att.type.startsWith('image/') ? (
                            <div className="relative rounded-xl overflow-hidden border border-[var(--border-app)] shadow-sm bg-[var(--card-app)]">
                              <img 
                                src={`data:${att.type};base64,${att.data}`} 
                                alt={att.name}
                                className="max-w-full sm:max-w-md max-h-[400px] object-contain block hover:scale-[1.02] transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <button 
                                onClick={() => handleDownload(att.isText ? att.content! : att.data!, att.name, att.type, att.isText)}
                                className="absolute bottom-2 right-2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-md backdrop-blur-md opacity-0 group-hover/att:opacity-100 transition-all shadow-sm"
                                title="Download Image"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl hover:border-[var(--accent-app)]/50 transition-all">
                              <FileText size={18} className="text-[var(--accent-app)]" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-[var(--text-app)] truncate max-w-[120px]">{att.name}</span>
                                <span className="text-[8px] text-[var(--text-secondary)] uppercase font-black">{att.type.split('/')[1] || 'FILE'}</span>
                              </div>
                              <button 
                                onClick={() => handleDownload(att.isText ? att.content! : att.data!, att.name, att.type, att.isText)}
                                className="p-1.5 hover:text-[var(--accent-app)] transition-colors"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.audioUrl && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-app)] w-full">
                       <audio controls className="w-full h-10 outline-none" src={m.audioUrl} />
                    </div>
                  )}

                  {m.role === 'assistant' && m.thoughtProcess && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-app)]">
                      <button 
                        onClick={() => setOpenThoughts(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent-app)] transition-colors"
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
                            <div className="mt-3 p-4 bg-[var(--bg-app)] rounded-md border border-[var(--border-app)]">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                {Object.entries(JSON.parse(m.thoughtProcess)).map(([key, val]) => (
                                  key !== 'inferredAction' && (
                                    <div key={key}>
                                      <span className="block text-[8px] text-[var(--text-secondary)] font-black uppercase tracking-widest mb-1">{key}</span>
                                      <span className="text-[11px] text-[#3b82f6] font-bold">{String(val)}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                              <div className="pt-3 border-t border-[var(--border-app)]">
                                <span className="block text-[8px] text-[var(--text-secondary)] font-black uppercase tracking-widest mb-1">Execution Strategy</span>
                                <p className="text-[11px] text-[var(--text-app)]/70 leading-relaxed italic">
                                  {JSON.parse(m.thoughtProcess).inferredAction}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                   <div className={`flex flex-wrap items-center justify-between gap-y-2 mt-5 text-[11px] ${m.role === 'user' ? 'text-[var(--text-app)]/60' : 'text-[var(--text-secondary)]'}`}>
                     <span className="font-mono tracking-widest whitespace-nowrap">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     <div className="flex items-center gap-2 flex-wrap justify-end">
                        {m.role === 'assistant' && (
                          m.content.includes('```recharts') ? (
                            <button onClick={() => generateVisualReportForMessage(m)} className="px-3 py-1.5 hover:bg-[var(--border-app)] rounded-lg transition-all text-[var(--accent-app)] font-bold uppercase tracking-widest text-[9px] border border-[var(--accent-app)]/20">
                              Download Chart
                            </button>
                          ) : m.content.includes('|') && m.content.includes('---') ? (
                            <button onClick={() => exportMessageToExcel(m)} className="px-3 py-1.5 hover:bg-[var(--border-app)] rounded-lg transition-all text-[var(--accent-app)] font-bold uppercase tracking-widest text-[9px] border border-[var(--accent-app)]/20">
                              Download Excel
                            </button>
                          ) : (
                            <button onClick={() => exportMessageToPDF(m)} className="px-3 py-1.5 hover:bg-[var(--border-app)] rounded-lg transition-all text-[var(--accent-app)] font-bold uppercase tracking-widest text-[9px] border border-[var(--accent-app)]/20">
                              Download PDF
                            </button>
                          )
                        )}
                    </div>
                  </div>
                </div>
                {m.role === 'assistant' && (m.tokenCount || m.isStreaming) && (
                  <div className="mt-2 ml-4">
                    <span className="inline-flex items-center gap-2 bg-transparent px-2 py-1 rounded-full font-black uppercase tracking-widest text-[9px] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-app)] hover:bg-[var(--card-app)] transition-all cursor-default">
                      <Sparkles size={10} className={`text-[var(--accent-app)] ${m.isStreaming ? 'animate-pulse' : ''}`} /> 
                      {m.isStreaming ? 'Computing...' : `${m.modelUsed ? `${m.modelUsed} | ` : ''}${m.tokenCount} Tokens`}
                    </span>
                  </div>
                )}
              </motion.div>
            ))
          )}
          {isSessionLoading(activeSessionId) && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex justify-start"
            >
              <div className="bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl rounded-tl-md px-8 py-5 flex gap-4 items-center shadow-sm relative overflow-hidden group">
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
        <div className="relative border-t border-[var(--border-app)] bg-[var(--bg-app)] p-2 sm:p-10 transition-all">
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            
            <AnimatePresence />

            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6 px-4">
                {pendingAttachments.map((att, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative group h-24 w-24"
                  >
                    <div className="h-full w-full rounded-2xl overflow-hidden border-2 border-[var(--border-app)] bg-[var(--card-app)] shadow-xl group-hover:border-[var(--accent-app)]/50 transition-all">
                      {att.type.startsWith('image/') ? (
                        <img src={`data:${att.type};base64,${att.data}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-1 text-center">
                          <FileText size={24} className="text-[var(--accent-app)]" />
                          <span className="text-[8px] font-black uppercase truncate w-full text-[var(--text-secondary)]">{att.name}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => removePendingAttachment(idx)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-2xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 z-10"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="relative">
              <AnimatePresence>
                {showParamMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute bottom-full left-0 mb-4 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-[var(--card-app)] border border-[var(--border-app)] shadow-xl p-6 sm:p-7 z-50 rounded-2xl backdrop-blur-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-app)]">Strategy Settings</span>
                    </div>
                    <div className="space-y-8">
                       <div className="space-y-3">
                         <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                           <label>Model</label>
                           <button 
                             onClick={() => {
                               const provider = getActiveProvider();
                               if (provider) fetchProviderModels(provider);
                             }}
                             className="text-[9px] font-bold text-[var(--accent-app)] hover:underline uppercase tracking-wide flex items-center gap-1"
                           >
                             <RefreshCw size={10} />
                           </button>
                         </div>
                         <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                           {displayCategories.map(category => (
                             <div key={category}>
                               <div className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-1 pl-2">{category}</div>
                               <div className="space-y-1">
                                 {displayModels.filter(m => m.category === category).map(m => (
                                   <button
                                     key={m.id}
                                     onClick={() => {
                                       setSettings(s => ({ ...s, model: m.id }));
                                       setShowParamMenu(false);
                                     }}
                                     className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${settings.model === m.id ? 'bg-[var(--accent-app)]/10 text-[var(--accent-app)]' : 'text-[var(--text-app)] hover:bg-[var(--border-app)]'}`}
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
                         <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
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
                                   ? 'bg-[var(--accent-app)] text-[var(--bg-app)] shadow-lg shadow-[var(--accent-app)]/20'
                                   : 'bg-[var(--border-app)] text-[var(--text-secondary)] hover:text-[var(--text-app)] border border-[var(--border-app)]'
                               }`}
                             >
                               {p.name}
                             </button>
                           ))}
                         </div>
                       </div>
                      <div>
                         <div className="flex justify-between mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                          <label>Logical Depth</label>
                          <span className="text-[var(--accent-app)] font-mono">{settings.maxOutputTokens || 2048}</span>
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
                          className="w-full h-1 bg-[var(--border-app)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-app)]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 bg-[var(--card-app)] border border-[var(--border-app)] focus-within:border-[var(--accent-app)] rounded-3xl p-2 pl-4 transition-all shadow-md">
                <div className="flex items-center pb-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-[var(--border-app)] text-[var(--text-secondary)] transition-all"
                    title="Upload Context"
                  >
                    <Plus size={24} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    multiple 
                    accept="image/*,application/pdf,text/plain,text/markdown"
                  />
                  <button 
                    onClick={() => setShowParamMenu(!showParamMenu)}
                    className={`p-2 mx-1 rounded-full transition-all ${showParamMenu ? 'bg-[var(--accent-app)]/10 text-[var(--text-app)]' : 'hover:bg-[var(--border-app)] text-[var(--text-secondary)] hover:text-[var(--text-app)]'}`}
                    title="Strategy Settings"
                  >
                    <Sliders size={20} />
                  </button>
                </div>
                <textarea 
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask iluv"
                  rows={1}
                  className="flex-1 max-h-48 sm:max-h-64 bg-transparent border-none focus:ring-0 text-[var(--text-app)] placeholder-[var(--text-secondary)] resize-none py-3 scroll-hide font-normal text-base sm:text-lg leading-relaxed outline-none"
                />
                <div className="flex items-center pb-2">
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isSessionLoading(activeSessionId)}
                    className={`p-2 rounded-full transition-all ${
                      input.trim() 
                        ? 'text-[var(--text-app)] hover:opacity-80 active:scale-95' 
                        : 'text-[var(--text-secondary)] opacity-50'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
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
              className="relative w-full max-w-md bg-[var(--card-app)] rounded-xl shadow-xl p-6 overflow-hidden border border-[var(--border-app)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold uppercase tracking-widest text-[var(--accent-app)]">System Parameters</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-[var(--border-app)] rounded-none transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-app)]">Active Intelligence Provider</span>
                  </div>
                  <select
                    value={settings.activeProviderId || settings.providers[0]?.id}
                    onChange={(e) => setSettings(s => ({ ...s, activeProviderId: e.target.value }))}
                    className="w-full bg-[var(--card-app)] border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-sm text-[var(--accent-app)]"
                  >
                    {settings.providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.enabled ? '' : '(Disabled)'}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-6 pt-4 border-t border-[var(--border-app)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Manage Providers</span>
                  </div>

                  {settings.providers.map((provider, idx) => (
                    <div key={provider.id} className="p-4 bg-[var(--card-app)] border border-[var(--border-app)] space-y-4 relative group/item">
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
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Authentication Key</label>
                        <input 
                          type="password"
                          value={provider.apiKey}
                          onChange={(e) => {
                            const newProviders = [...settings.providers];
                            newProviders[idx].apiKey = e.target.value;
                            setSettings(s => ({ ...s, providers: newProviders }));
                          }}
                          placeholder="API Key"
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-none py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Base Endpoint URL</label>
                        <input 
                          value={provider.baseUrl}
                          onChange={(e) => {
                            const newProviders = [...settings.providers];
                            newProviders[idx].baseUrl = e.target.value;
                            setSettings(s => ({ ...s, providers: newProviders }));
                          }}
                          placeholder="https://api.openai.com"
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-app)] rounded-none py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6 pt-4 border-t border-[var(--border-app)]">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Model Designation</span>
                     <button 
                       onClick={() => {
                         const provider = getActiveProvider();
                         if (provider) fetchProviderModels(provider);
                       }}
                       className="text-[9px] font-bold text-[var(--accent-app)] hover:underline uppercase tracking-wide flex items-center gap-1"
                     >
                       <RefreshCw size={10} />
                       Refresh Models
                     </button>
                  </div>

                  <select
                    value={settings.model}
                    onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                    className="w-full bg-[var(--card-app)] border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-sm text-[var(--accent-app)]"
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

                <div className="space-y-6 pt-4 border-t border-[var(--border-app)]">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Appearance</span>
                  </div>

                  <div className="flex rounded-md border border-[var(--border-app)] p-1 bg-[var(--card-app)]">
                    <button
                      onClick={() => setSettings(s => ({ ...s, themePreset: 'light' }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded transition-all ${
                        settings.themePreset === 'light' || !settings.themePreset 
                          ? 'bg-[var(--text-app)] text-[var(--bg-app)] shadow-sm' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-app)]'
                      }`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setSettings(s => ({ ...s, themePreset: 'dark' }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded transition-all ${
                        settings.themePreset === 'dark' 
                          ? 'bg-[var(--text-app)] text-[var(--bg-app)] shadow-sm' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-app)]'
                      }`}
                    >
                      Dark
                    </button>
                  </div>
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

      {/* Manage Sessions Modal */}
      <AnimatePresence>
        {showManageSessions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowManageSessions(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-6 sm:p-8 max-w-3xl w-full relative z-10 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-8 border-b border-[var(--border-app)] pb-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold tracking-wide text-[var(--text-app)] flex items-center gap-3">
                    <Command className="text-[var(--accent-app)]" /> Session Management
                  </h2>
                </div>
                <button 
                  onClick={() => setShowManageSessions(false)}
                  className="p-2 hover:bg-[var(--border-app)] rounded-none transition-colors text-[var(--text-app)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-2 space-y-2">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-[var(--border-app)] border border-[var(--border-app)]">
                    <input 
                      type="checkbox"
                      checked={selectedSessionIds.has(s.id)}
                      onChange={(e) => {
                        const next = new Set(selectedSessionIds);
                        if (e.target.checked) next.add(s.id);
                        else next.delete(s.id);
                        setSelectedSessionIds(next);
                      }}
                      className="w-4 h-4 rounded-none accent-[var(--accent-app)] bg-transparent border-[var(--border-app)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate text-[var(--text-app)]">{s.title}</span>
                        {s.isArchived && <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[9px] uppercase font-black uppercase rounded-full">Archived</span>}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-1">{new Date(s.createdAt).toLocaleString()} • {s.messages.length} messages</div>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center text-[var(--text-secondary)] py-8 font-medium">No sessions found.</div>
                )}
              </div>

              <div className="border-t border-[var(--border-app)] pt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleArchiveSessions}
                  disabled={selectedSessionIds.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--card-app)] hover:bg-[var(--border-app)] border border-[var(--border-app)] uppercase tracking-widest text-[10px] font-black disabled:opacity-50 transition-all text-[var(--text-app)]"
                >
                  <Archive size={14} /> Archive
                </button>
                <button
                  onClick={handleUnarchiveSessions}
                  disabled={selectedSessionIds.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--card-app)] hover:bg-[var(--border-app)] border border-[var(--border-app)] uppercase tracking-widest text-[10px] font-black disabled:opacity-50 transition-all text-[var(--text-app)]"
                >
                  <Archive size={14} className="rotate-180" /> Unarchive
                </button>
                <button
                  onClick={handleMergeSessions}
                  disabled={selectedSessionIds.size < 2}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--card-app)] hover:bg-[var(--border-app)] border border-[var(--border-app)] uppercase tracking-widest text-[10px] font-black disabled:opacity-50 transition-all text-[var(--text-app)]"
                >
                  <Combine size={14} /> Merge ({selectedSessionIds.size})
                </button>
                <button
                  onClick={() => handleExportSessions(selectedSessionIds.size === 0)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--card-app)] hover:bg-[var(--border-app)] border border-[var(--border-app)] text-xs font-medium disabled:opacity-50 transition-all text-[var(--text-app)] rounded-md"
                >
                  <FolderDown size={14} /> 
                  {selectedSessionIds.size > 0 ? `Backup Selected` : `Backup All`}
                </button>
                <div className="flex flex-col gap-2 mt-2 w-full">
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--card-app)] hover:bg-[var(--border-app)] border border-[var(--border-app)] text-xs font-medium cursor-pointer transition-all text-[var(--accent-app)] rounded-md">
                    <FolderUp size={14} /> Restore Backup
                    <input type="file" className="hidden" accept=".json" onChange={handleRestoreSessions} />
                  </label>
                  <label className="flex items-center gap-2 px-2 pb-2 text-[10px] uppercase font-bold text-[var(--text-secondary)] whitespace-nowrap cursor-pointer">
                    <input type="checkbox" className="accent-[var(--accent-app)]" checked={restoreAsMemory} onChange={e => setRestoreAsMemory(e.target.checked)} />
                    Use restored chats as Memory
                  </label>
                  {settings.chatMemory && (
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, chatMemory: undefined }))}
                      className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-left px-2 pb-2 hover:underline"
                    >
                      Clear Memory ({Math.round(settings.chatMemory.length / 1024)}KB)
                    </button>
                  )}
                </div>
                <button
                  onClick={handleDeleteSelectedSessions}
                  disabled={selectedSessionIds.size === 0}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-medium disabled:opacity-50 transition-all rounded-md"
                >
                  <Trash2 size={14} /> Delete Selected
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
