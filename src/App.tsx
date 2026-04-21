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
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showParamMenu, setShowParamMenu] = useState(false);
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
  };

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
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
        const parts: any[] = [{ text: m.content }];
        if (m.attachments) {
          m.attachments.forEach(att => {
            parts.push({
              inlineData: {
                data: att.data,
                mimeType: att.type
              }
            });
          });
        }
        return {
          role: m.role === 'assistant' ? 'model' : m.role,
          parts
        };
      });

      const model = settings.model || DEFAULT_MODEL;
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
      for await (const chunk of responseStream) {
        fullText += (chunk.text || '');
        if (chunk.usageMetadata) finalTokens = chunk.usageMetadata.candidatesTokenCount;
        setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: s.messages.map(m => m.id === assistantMessageId ? { ...m, content: fullText } : m),
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
      const rolePrefix = m.role === 'user' ? 'User: ' : 'DroidAI: ';
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

  // --- UI Components ---
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-app)]">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 flex flex-col border-r border-[var(--border-app)] bg-[var(--card-app)] z-20"
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
                  onClick={() => setActiveSessionId(s.id)}
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
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className="relative flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-white dark:bg-slate-800 border border-[var(--border-app)] rounded-none shadow-sm hover:bg-slate-50 transition-colors text-[var(--text-app)]"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-app)] backdrop-blur-sm bg-white/80 dark:bg-slate-950/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setSidebarOpen(true)}
                className={`md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-colors ${sidebarOpen ? 'hidden' : ''} text-[var(--text-app)]`}
             >
               <Layout size={18} />
             </button>
             <h1 className="text-lg font-bold tracking-widest truncate scroll-hide max-w-[200px] sm:max-w-md uppercase text-[var(--text-app)]">
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
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 pb-24 scroll-smooth"
        >
          {sessions.length === 0 || (activeSessionId && getActiveSession()?.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-none bg-[var(--accent-app)] flex items-center justify-center text-white mb-6 animate-pulse">
                <Sparkles size={32} />
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tighter uppercase italic">Welcome to Privé AI</h2>
              <p className="text-[var(--text-secondary)] mb-8 font-medium">
                The ultimate secure assistant. All data is stored locally.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {[
                  { icon: Table, text: "Generate a sales table", cmd: "Create a markdown table for monthly sales data" },
                  { icon: Layout, text: "Plan my week", cmd: "Help me create a weekly study plan table" },
                  { icon: Command, text: "Explain complex concepts", cmd: "Explain quantum entanglement like I'm five" },
                  { icon: FileText, text: "Draft a report", cmd: "Write a short summary report on climate change" }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInput(item.cmd)}
                    className="flex items-center gap-3 p-4 bg-[var(--card-app)] border border-[var(--border-app)] rounded-none hover:border-[var(--accent-app)] transition-all text-left text-sm"
                  >
                    <item.icon size={18} className="text-[var(--accent-app)]" />
                    <span>{item.text}</span>
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
                <div className={`max-w-[85%] sm:max-w-[70%] group relative ${
                  m.role === 'user' 
                    ? 'bg-[var(--accent-app)] text-white rounded-sm rounded-tr-none px-4 py-3 shadow-lg shadow-orange-500/10' 
                    : 'bg-[var(--card-app)] border border-[var(--border-app)] rounded-sm rounded-tl-none px-5 py-4'
                }`}>
                  <div className={`markdown-body ${m.role === 'user' ? 'text-white' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  <div className={`flex items-center justify-between mt-3 text-[10px] ${m.role === 'user' ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => copyToClipboard(m.content, m.id)}
                         className={`p-1 rounded-sm transition-all ${
                           m.role === 'user' 
                             ? 'hover:bg-white/20' 
                             : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                         } text-[var(--text-app)]`}
                       >
                         {copiedId === m.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} className={m.role === 'user' ? 'text-white' : 'text-[var(--text-app)]'} />}
                       </button>
                       {m.role === 'assistant' && (m.tokenCount || m.isStreaming) && (
                         <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded-sm font-mono text-[var(--text-app)]">
                           <Sparkles size={8} className={m.isStreaming ? 'animate-pulse' : ''} /> 
                           {m.isStreaming ? 'Generating...' : `${m.tokenCount} tokens ${m.responseTime ? `• ${m.responseTime.toFixed(1)}s` : ''}`}
                         </span>
                       )}
                    </div>
                  </div>
                  {m.attachments && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1.5 p-1.5 bg-black/10 dark:bg-white/10 rounded-sm">
                           {att.type.startsWith('image/') ? (
                             <img src={`data:${att.type};base64,${att.data}`} className="w-10 h-10 object-cover rounded-sm" />
                           ) : (
                             <FileIcon size={16} />
                           )}
                           <span className="text-[10px] truncate max-w-[100px]">{att.name}</span>
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

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent pt-10">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Attachment Preview */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-wrap gap-2 p-3 bg-[var(--card-app)] border border-[var(--border-app)] rounded-none shadow-lg"
                >
                  {attachments.map((file, i) => (
                    <div key={i} className="group relative flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-none border border-[var(--border-app)]">
                      {file.type.startsWith('image/') ? (
                        <img src={`data:${file.type};base64,${file.data}`} className="w-8 h-8 object-cover rounded-none" />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-none">
                          <FileIcon size={16} />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 pr-6">
                        <span className="text-[10px] font-bold truncate max-w-[100px]">{file.name}</span>
                        <span className="text-[8px] opacity-50 uppercase">{file.type.split('/')[1]}</span>
                      </div>
                      <button 
                        onClick={() => removeAttachment(i)}
                        className="absolute right-1 top-1 p-1 bg-red-500 text-white rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <AnimatePresence>
                {showParamMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-900 border border-[var(--border-app)] shadow-2xl p-4 z-50 rounded-none bg-opacity-90 backdrop-blur-md"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-app)]">Generation Tuning</span>
                      <button onClick={() => setShowParamMenu(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-app)]"><X size={14} /></button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Temperature</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={settings.temperature ?? ''}
                          onChange={(e) => setSettings(s => ({ ...s, temperature: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="e.g. 0.7"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Max Output Tokens</label>
                        <input 
                          type="number"
                          step="1"
                          min="1"
                          value={settings.maxOutputTokens ?? ''}
                          onChange={(e) => setSettings(s => ({ ...s, maxOutputTokens: e.target.value ? Number(e.target.value) : undefined }))}
                          placeholder="e.g. 8192"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-app)] rounded-none py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] transition-all font-mono text-xs"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button 
                  onClick={() => setShowParamMenu(!showParamMenu)}
                  className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none transition-all ${showParamMenu ? 'text-[var(--accent-app)] opacity-100' : 'text-[var(--text-app)] opacity-60 hover:opacity-100'}`}
                >
                  <Sliders size={18} />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none text-[var(--text-app)] opacity-60 hover:opacity-100 transition-all"
                >
                  <Paperclip size={18} />
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
              </div>
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Compose a luxury prompt..."
                className="w-full bg-white dark:bg-slate-900 border border-[var(--border-app)] rounded-none py-4 pl-24 pr-14 shadow-xl focus:outline-none focus:ring-1 focus:ring-[var(--accent-app)] focus:border-transparent transition-all placeholder:text-slate-400 group-hover:border-slate-300 dark:group-hover:border-slate-700 text-[var(--text-app)]"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isSessionLoading(activeSessionId) || (!input.trim() && attachments.length === 0)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-none flex items-center justify-center transition-all ${
                  input.trim() || attachments.length > 0
                    ? 'bg-[var(--accent-app)] text-white shadow-lg active:scale-95' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          <div className="text-center mt-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.3em] font-black">
            PRIVÉ AI ✨ SECURE & BEYOND
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
