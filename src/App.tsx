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
  Paperclip,
  Image as ImageIcon,
  FileIcon,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from '@google/genai';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

import { Message, ChatSession, AppSettings, DEFAULT_MODEL, DEFAULT_BASE_URL } from './types';

export default function App() {
  // --- State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showParamMenu, setShowParamMenu] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('droidai_settings');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      theme: 'system'
    };
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  };

  // --- Effects ---
  useEffect(() => {
    // Load sessions from localStorage
    const savedSessions = localStorage.getItem('droidai_sessions');
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
      setError(`Luxury Warning: ${e.message}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('droidai_sessions', JSON.stringify(sessions));
    } catch (err) {
      console.warn('LocalStorage Quota Exceeded', err);
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('droidai_settings', JSON.stringify(settings));
    
    // Enforce dark mode
    const root = window.document.documentElement;
    root.classList.add('dark');
  }, [settings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, loadingSessions]);

  const fetchModels = async (silent = false) => {
    if (!settings.apiKey) {
      if (!silent) setError("Provide an API key before syncing models.");
      return;
    }
    setFetchingModels(true);
    try {
      let base = settings.baseUrl.trim().replace(/\/+$/, '');
      if (!base.startsWith('http')) {
        base = 'https://' + base;
      }
      
      const isGemini = base.includes('generative');
      
      if (isGemini) {
        const ai = new GoogleGenAI({ 
          apiKey: settings.apiKey,
          httpOptions: settings.baseUrl !== DEFAULT_BASE_URL ? { baseUrl: settings.baseUrl } : undefined
        });
        const modelsResult = await ai.models.list();
        const modelsArray: string[] = [];
        for await (const m of modelsResult) {
          modelsArray.push((m.name || '').replace('models/', ''));
        }
        setAvailableModels(modelsArray);
      } else {
        const url = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${settings.apiKey}` }
        });
        
        if (!res.ok) {
          let errorBody = '';
          try {
            const errData = await res.json();
            errorBody = errData.error?.message || errData.message || JSON.stringify(errData);
          } catch (_) {}
          throw new Error(errorBody ? `${res.status}: ${errorBody}` : `Endpoint returned ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        if (data && data.models) {
          setAvailableModels(data.models.map((m: any) => (m.name || '').replace('models/', '') || m.id));
        } else if (data && data.data) {
          setAvailableModels(data.data.map((m: any) => m.id));
        } else {
          setAvailableModels([]);
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch models", e);
      setAvailableModels([]);
      if (!silent) {
        if (e.message?.includes('400') || e.message?.includes('INVALID_ARGUMENT')) {
          setError("Invalid API key or bad API endpoint argument.");
        } else {
          setError(e.message === 'Failed to fetch' 
            ? "Network/CORS error. Endpoint might be offline or blocked. You can still type the model name manually." 
            : `Model sync failed: ${e.message}`);
        }
        setTimeout(() => setError(null), 5000);
      }
    } finally {
      setFetchingModels(false);
    }
  };

  useEffect(() => {
     if (settings.apiKey) {
       fetchModels(true);
     }
  }, []);

  // --- Helpers ---
  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);
  const isSessionLoading = (id: string | null) => id ? loadingSessions.has(id) : false;

  const createNewSession = () => {
    setError(null);
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Privé AI session',
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (files: FileList | File[]) => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit
    
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`Secure Protocol: Item "${file.name}" exceeds 20MB threshold.`);
        setTimeout(() => setError(null), 5000);
        return;
      }

      const isTextFile = file.type.startsWith('text/') || 
                         ['application/json', 'application/javascript', 'text/javascript', 'application/xml'].includes(file.type) ||
                         file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.log');

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        setAttachments(prev => {
          // Prevent duplicates by name and size
          if (prev.some(a => a.name === file.name && a.size === file.size)) return prev;
          
          if (isTextFile) {
            return [...prev, {
              name: file.name,
              type: file.type,
              size: file.size,
              isText: true,
              content: result
            }];
          } else {
            const base64 = result.split(',')[1];
            return [...prev, {
              name: file.name,
              type: file.type,
              size: file.size,
              isText: false,
              data: base64
            }];
          }
        });
      };

      if (isTextFile) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isSessionLoading(activeSessionId)) return;

    if (!settings.apiKey) {
      setError('Please provide an API key in settings.');
      setShowSettings(true);
      return;
    }

    let sessionId: string | null = null;
    try {
      const currentInput = input;
      const currentAttachments = [...attachments];
      setInput('');
      setAttachments([]);
      setError(null);
      
      const activeSession = getActiveSession();
      sessionId = activeSession ? activeSession.id : generateId();
      setLoadingSessions(prev => new Set(prev).add(sessionId!));
      
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: currentInput,
        timestamp: Date.now(),
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined
      };

      let updatedSessions = [...sessions];
      if (!activeSession) {
        const newSession: ChatSession = {
          id: sessionId,
          title: currentInput.slice(0, 30) || 'New Privé AI Session',
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

      const ai = new GoogleGenAI({ 
        apiKey: settings.apiKey,
        httpOptions: settings.baseUrl !== DEFAULT_BASE_URL ? { baseUrl: settings.baseUrl } : undefined
      });
      const currentSession = updatedSessions.find(s => s.id === sessionId)!;
      
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

      const isImageRequest = currentInput.toLowerCase().startsWith('/imagine ') || currentInput.toLowerCase().startsWith('/image ');
      const model = settings.model || DEFAULT_MODEL;

      if (isImageRequest) {
        const prompt = currentInput.replace(/^\/(imagine|image)\s+/i, '');
        const startTime = Date.now();
        const response = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt,
          config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
        });
        
        const base64 = response.generatedImages?.[0]?.image?.imageBytes;
        const responseTime = (Date.now() - startTime) / 1000;
        
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          responseTime,
          attachments: base64 ? [{
            name: `generated_${Date.now()}.jpg`,
            type: 'image/jpeg',
            data: base64,
            isText: false
          }] : undefined
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
      } else {
        let sysInstruction = "You are Privé AI, an ultra-premium, luxury AI assistant. You speak with confidence and precision. MANDATORY: All data tables must be formatted as Github Flavored Markdown (GFM) tables. Always add a luxury spin to your responses.";
        if (settings.maxOutputTokens !== undefined && settings.maxOutputTokens > 0) {
          sysInstruction += ` IMPORTANT: You must strictly adjust and compress your entire answer to fit fully within ${settings.maxOutputTokens} tokens. Do perfectly finish your thoughts and NEVER cut off your response mid-sentence. Be concise if necessary.`;
        }
        
        const configOpts: any = {
          systemInstruction: sysInstruction
        };
        if (settings.temperature !== undefined) configOpts.temperature = Number(settings.temperature);
        if (settings.maxOutputTokens !== undefined) configOpts.maxOutputTokens = Number(settings.maxOutputTokens);

        const startTime = Date.now();
        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: history,
          config: configOpts
        });

        const assistantMessageId = generateId();
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true
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

        let fullText = '';
        let finalTokens = 0;
        let generatedAttachments: any[] = [];
        
        for await (const chunk of responseStream) {
          fullText += (chunk.text || '');
          if (chunk.usageMetadata) finalTokens = chunk.usageMetadata.candidatesTokenCount || 0;
          
          if (chunk.candidates?.[0]?.content?.parts) {
            chunk.candidates[0].content.parts.forEach(p => {
              if (p.inlineData?.data) {
                generatedAttachments.push({
                   name: `generated_${Date.now()}.png`,
                   type: p.inlineData.mimeType || 'image/png',
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
                  content: fullText,
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
              messages: s.messages.map(m => m.id === assistantMessageId ? { ...m, isStreaming: false, tokenCount: finalTokens || undefined, responseTime } : m),
              updatedAt: Date.now()
            };
          }
          return s;
        }));
      }

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
    doc.text(`Privé AI Session: ${session.title}`, 10, y);
    y += 10;
    doc.setFontSize(10);
    
    session.messages.forEach(m => {
      const rolePrefix = m.role === 'user' ? 'User: ' : 'Privé AI: ';
      const splitText = doc.splitTextToSize(rolePrefix + m.content, 180);
      
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
      Content: m.content,
      Timestamp: new Date(m.timestamp).toLocaleString(),
      Tokens: m.tokenCount || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chat History");
    XLSX.writeFile(wb, `${session.title.replace(/\s/g, '_')}.xlsx`);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (base64: string, filename: string, mimeType: string) => {
    try {
      const response = await fetch(`data:${mimeType};base64,${base64}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || `prive-ai-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download extraction failed', err);
      setError('System could not construct the image file for download. Verify your device policy.');
    }
  };

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
                <span className="tracking-[0.2em]">PRIVÉ AI</span>
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

            <div className="p-4 border-t border-[var(--border-app)] flex items-center justify-between">
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 p-2 rounded-none hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs font-black uppercase tracking-widest text-[var(--text-app)] w-full"
              >
                <Settings size={18} />
                <span>Preferences</span>
              </button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className="relative flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-[#0070f3]/10 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-[#0070f3]/50 m-4 rounded-3xl"
            >
              <div className="bg-[#0a0a0a] p-10 rounded-full shadow-2xl scale-110">
                <Paperclip size={60} className="text-[#0070f3] animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-white mt-8 uppercase tracking-[0.3em]">Drop Intel Here</h3>
              <p className="text-[#0070f3] font-bold mt-2 uppercase tracking-widest text-xs opacity-80">Encryption Gate Active</p>
            </motion.div>
          )}
        </AnimatePresence>
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
               {getActiveSession()?.title || 'PRIVÉ AI'}
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {getActiveSession() && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-none border border-[var(--border-app)]">
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
              <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase italic text-white leading-none">Privé AI</h2>
              <p className="text-[#71717a] mb-10 font-medium tracking-wide">
                Secure. Minimal. Elite. Your private intelligence architecture.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {[
                  { icon: Table, text: "Data Visualisation", cmd: "Generate a markdown table for global tech analysis" },
                  { icon: Layout, text: "Strategic Roadmap", cmd: "Create a 3-month strategic plan for a boutique startup" },
                  { icon: Command, text: "System Synthesis", cmd: "Explain the core mechanics of privacy-focused AI" },
                  { icon: FileText, text: "Elite Drafting", cmd: "Draft a concise executive report on market trends" }
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
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
                           {m.isStreaming ? 'Crafting' : `${m.tokenCount} Tokens`}
                         </span>
                       )}
                    </div>
                  </div>
                  {m.attachments && (
                    <div className="mt-3 flex flex-wrap gap-4">
                      {m.attachments.map((att, i) => (
                        <div key={i} className={`flex items-center gap-1.5 ${att.type.startsWith('image/') ? 'w-full' : 'p-1.5 bg-black/10 dark:bg-white/10 rounded-sm'}`}>
                           {att.type.startsWith('image/') ? (
                             <div className="relative group/dl inline-block max-w-full">
                               <img src={`data:${att.type};base64,${att.data}`} className="w-full max-w-[400px] h-auto object-contain rounded-xl shadow-lg border border-white/10" />
                               <button 
                                 onClick={(e) => { e.preventDefault(); handleDownload(att.data, att.name, att.type); }}
                                 className="absolute inset-0 bg-black/50 opacity-0 group-hover/dl:opacity-100 flex flex-col items-center justify-center transition-all rounded-xl backdrop-blur-sm"
                                 title="Download Image"
                               >
                                 <Download size={32} className="text-white mb-2" />
                                 <span className="text-white text-xs font-bold tracking-widest uppercase">Download</span>
                               </button>
                             </div>
                           ) : (
                             <>
                               <FileIcon size={16} />
                               <span className="text-[10px] truncate max-w-[100px]">{att.name}</span>
                             </>
                           )}
                        </div>
                      ))}
                    </div>
                  )}
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
                  <span className="text-xs font-bold text-[var(--text-secondary)] italic">Privé AI is crafting perfection...</span>
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
            
            {/* Attachment Preview (Fixed Gap) */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-4 p-4 bg-[#0a0a0a] border border-[#111111] rounded-2xl overflow-hidden"
                >
                  {attachments.map((file, i) => (
                    <div key={i} className="group relative flex items-center gap-3 p-3 bg-[#111111] rounded-xl border border-white/5">
                      {file.type.startsWith('image/') ? (
                        <img src={`data:${file.type};base64,${file.data}`} className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-lg">
                          <FileIcon size={20} className="text-[#3b82f6]" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 pr-10">
                        <span className="text-[11px] font-black text-white/80 truncate max-w-[140px] uppercase tracking-wider">{file.name}</span>
                        <span className="text-[9px] text-[#71717a] uppercase font-mono">{file.type.split('/')[1]}</span>
                      </div>
                      <button 
                        onClick={() => removeAttachment(i)}
                        className="absolute right-2 top-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

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
                           <button onClick={(e) => { e.preventDefault(); fetchModels(); }} className="text-[#0070f3] hover:text-white transition-colors" title="Sync Models">
                             <RefreshCw size={12} className={fetchingModels ? 'animate-spin' : ''} />
                           </button>
                         </div>
                         <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                           {(availableModels.length > 0 ? availableModels : [settings.model || DEFAULT_MODEL]).map(m => (
                             <button
                               key={m}
                               onClick={() => {
                                 setSettings(s => ({ ...s, model: m }));
                                 setShowParamMenu(false);
                               }}
                               className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${settings.model === m ? 'bg-[#0070f3]/10 text-[#0070f3]' : 'text-white hover:bg-[#111111]'}`}
                             >
                               {m}
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
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex gap-1 mb-1 sm:mb-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 sm:p-3 hover:bg-[#111111] rounded-xl sm:rounded-2xl transition-all text-[#71717a] hover:text-[#0070f3]"
                    title="Upload Intelligence"
                  >
                    <Paperclip size={20} className="sm:w-6 sm:h-6" />
                  </button>
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
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      e.currentTarget.style.height = 'auto';
                    }
                  }}
                  placeholder="Initiate secure sequence..."
                  rows={1}
                  className="flex-1 max-h-48 sm:max-h-64 bg-transparent border-none focus:ring-0 text-white placeholder-white/20 resize-none py-3 scroll-hide font-semibold text-base sm:text-lg tracking-tight leading-relaxed"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && attachments.length === 0) || isSessionLoading(activeSessionId)}
                  className={`p-3 sm:p-4 mb-0.5 sm:mb-1 rounded-xl sm:rounded-2xl transition-all shadow-2xl ${
                    input.trim() || attachments.length > 0 
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
            PRIVÉ AI <span className="text-[#3b82f6]">|</span> ARCHITECT OF SECURE INTELLIGENCE
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

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center justify-between">
                    <span>API Credentials</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[var(--accent-app)] hover:underline flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                      Get Key <ExternalLink size={10} />
                    </a>
                  </label>
                  <input 
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                    placeholder="Enter authentication key"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Base Endpoint URL</label>
                  <input 
                    value={settings.baseUrl}
                    onChange={(e) => setSettings(s => ({ ...s, baseUrl: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>AI Model Designation</span>
                    <button 
                      onClick={() => fetchModels(false)}
                      disabled={fetchingModels}
                      className="text-[var(--accent-app)] hover:underline flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      {fetchingModels ? 'Syncing...' : 'Sync Models'} <RefreshCw size={10} className={fetchingModels ? 'animate-spin' : ''} />
                    </button>
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-3 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-sm text-[var(--accent-app)]"
                  >
                    {settings.model && !availableModels.includes(settings.model) && (
                      <option value={settings.model}>{settings.model}</option>
                    )}
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-wider">Sync models to populate the dropdown.</p>
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
