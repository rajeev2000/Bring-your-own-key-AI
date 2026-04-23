import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Platform, 
  ActivityIndicator, 
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { 
  Send, 
  Settings, 
  Plus, 
  MessageSquare, 
  Trash2, 
  PlusCircle, 
  X, 
  Sparkles, 
  Paperclip, 
  FileIcon, 
  RefreshCw,
  Layout,
  ChevronLeft,
  Settings2,
  ChevronRight,
  ChevronDown,
  Sliders,
  Download
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { GoogleGenAI } from '@google/genai';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { styled } from 'nativewind';

import { Message, ChatSession, AppSettings, DEFAULT_MODEL, DEFAULT_BASE_URL } from './types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    providers: [
      {
        id: generateId(),
        name: 'Google AI',
        apiKey: '',
        baseUrl: DEFAULT_BASE_URL,
        enabled: true
      }
    ],
    activeProviderId: undefined,
    model: DEFAULT_MODEL,
    maxOutputTokens: 2048
  });

  const getActiveProvider = () => {
    if (settings.activeProviderId) {
      return settings.providers.find(p => p.id === settings.activeProviderId);
    }
    if (settings.model.includes('gpt')) {
      return settings.providers.find(p => p.name.toLowerCase().includes('openai'));
    }
    return settings.providers.find(p => p.name.toLowerCase().includes('google')) || settings.providers[0];
  };

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('prive_sessions');
      const savedSettings = await AsyncStorage.getItem('prive_settings');
      
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) setActiveSessionId(parsed[0].id);
      }
      
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Migration
        if (!parsed.providers) {
          const legacyProvider = {
            id: generateId(),
            name: 'Google AI',
            apiKey: parsed.apiKey || '',
            baseUrl: parsed.baseUrl || DEFAULT_BASE_URL,
            enabled: true
          };
          setSettings({
            ...parsed,
            providers: [legacyProvider],
            activeProviderId: legacyProvider.id
          });
        } else {
          setSettings(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  useEffect(() => {
    AsyncStorage.setItem('prive_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    AsyncStorage.setItem('prive_settings', JSON.stringify(settings));
  }, [settings]);

  const fetchModels = async () => {
    const provider = getActiveProvider();
    if (!provider || !provider.apiKey) {
      setError("Provide an API key for the active provider before syncing.");
      return;
    }
    setFetchingModels(true);
    try {
      let base = provider.baseUrl.trim();
      if (!base.startsWith('http')) {
        base = 'https://' + base;
      }
      base = base.replace(/\/+$/, '').replace(/\/(v1|chat|completions|models)$/g, '').replace(/\/v1$/g, '');

      if (base.includes('generative')) {
        const ai = new GoogleGenAI({ apiKey: provider.apiKey });
        const modelsResult = await ai.models.list();
        const modelsArray: string[] = [];
        for await (const m of modelsResult) {
          modelsArray.push((m.name || '').replace('models/', ''));
        }
        setAvailableModels(modelsArray);
      } else {
        // Direct fetch for OpenAI-like on mobile (CORS is less of an issue)
        const url = `${base}/v1/models`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${provider.apiKey}` }
        });
        
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        if (!res.ok) {
          let errBody = '';
          if (isJson) {
            const errData = await res.json();
            errBody = errData.error?.message || errData.message || JSON.stringify(errData);
          } else {
            errBody = await res.text();
          }
          throw new Error(errBody ? `${res.status}: ${errBody.slice(0, 200)}` : `Error ${res.status}`);
        }

        if (!isJson) {
           throw new Error('Endpoint returned success but response was not JSON. Please check your Base URL.');
        }

        const data = await res.json();
        if (data.data) {
          setAvailableModels(data.data.map((m: any) => m.id));
        }
      }
    } catch (e: any) {
      setError(`Model sync failed: ${e.message}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);

  const createNewSession = () => {
    setError(null);
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Privé AI Session',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: '*/*', 
        copyToCacheDirectory: true 
      });
      
      if (!result.canceled && result.assets) {
        const asset = result.assets[0];
        const isTextFile = asset.mimeType?.startsWith('text/') || 
                          ['application/json', 'application/javascript'].includes(asset.mimeType || '') ||
                          asset.name.endsWith('.txt') || asset.name.endsWith('.md') || 
                          asset.name.endsWith('.js') || asset.name.endsWith('.json');
        
        const newAtt = {
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size
        };

        if (isTextFile) {
           const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' });
           setAttachments(prev => [...prev, { ...newAtt, isText: true, content }]);
        } else {
           const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
           setAttachments(prev => [...prev, { ...newAtt, isText: false, data: base64 }]);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Secure Protocol Failure: Could not ingest the requested asset.");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const provider = getActiveProvider();
    if (!provider || !provider.apiKey) {
      setError('Provide an API key for the active provider in preferences.');
      setShowSettings(true);
      return;
    }

    const currentInput = input;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setError(null);

    const activeSession = getActiveSession();
    const sessionId = activeSession ? activeSession.id : generateId();
    
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    let updatedSessions: ChatSession[] = [];
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
      updatedSessions = sessions.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMessage], updatedAt: Date.now() } : s);
      setSessions(updatedSessions);
    }

    setLoadingSessions(prev => new Set(prev).add(sessionId));

    try {
      const isGemini = provider.baseUrl.includes('generative');
      const currentSession = updatedSessions.find(s => s.id === sessionId)!;
      const model = settings.model || DEFAULT_MODEL;
      
      if (isGemini) {
        const ai = new GoogleGenAI({ 
          apiKey: provider.apiKey,
          ...(provider.baseUrl !== DEFAULT_BASE_URL ? { httpOptions: { baseUrl: provider.baseUrl } } : {})
        });
        const isImageRequest = currentInput.toLowerCase().startsWith('/imagine ') || currentInput.toLowerCase().startsWith('/image ');

        if (isImageRequest) {
          const prompt = currentInput.replace(/^\/(imagine|image)\s+/i, '');
          const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
          });
          
          const base64 = response.generatedImages?.[0]?.image?.imageBytes;
          
          const aiMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            attachments: base64 ? [{
              name: `generated_${Date.now()}.jpg`,
              type: 'image/jpeg',
              data: base64,
              isText: false
            }] : undefined
          };
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, aiMessage], updatedAt: Date.now() } : s));
        } else {
          const contents = currentSession.messages.map(m => {
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

          const response = await ai.models.generateContent({
            model: model,
            contents
          });
          
          const parts = response.candidates?.[0]?.content?.parts || [];
          const text = parts.map(p => p.text || '').join('');
          const usageCount = response.usageMetadata?.candidatesTokenCount || 0;
          
          const generatedAttachments: any[] = [];
          parts.forEach(p => {
             if (p.inlineData?.data) {
                generatedAttachments.push({
                   name: `generated_${Date.now()}.png`,
                   type: p.inlineData.mimeType || 'image/png',
                   data: p.inlineData.data,
                   isText: false
                });
             }
          });

          const aiMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
            tokenCount: usageCount || undefined,
            modelUsed: model,
            attachments: generatedAttachments.length > 0 ? generatedAttachments : undefined
          };
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, aiMessage], updatedAt: Date.now() } : s));
        }
      } else {
        // OpenAI-compatible direct fetch
        const isLegacyModel = model.toLowerCase().includes('instruct') || 
                            model.toLowerCase().includes('davinci') || 
                            model.toLowerCase().includes('curie') || 
                            model.toLowerCase().includes('babbage') || 
                            model.toLowerCase().includes('ada');
        
        const isO1Model = model.toLowerCase().startsWith('o1') || 
                          model.toLowerCase().startsWith('o3') || 
                          model.toLowerCase().includes('reasoning') ||
                          model.toLowerCase().includes('latest');

        const messages = currentSession.messages.map(m => ({ role: m.role, content: m.content }));

        const endpoint = isLegacyModel ? 'completions' : 'chat/completions';
        let base = provider.baseUrl.trim();
        if (!base.startsWith('http')) {
           base = 'https://' + base;
        }
        base = base.replace(/\/+$/, '').replace(/\/(v1|chat|completions|models)$/g, '').replace(/\/v1$/g, '');
        
        const url = `${base}/v1/${endpoint}`;

        const tokenLimit = isLegacyModel ? 4096 : (model.includes('gpt-4') ? 8192 : 4096);
        let maxTokens = settings.maxOutputTokens || 2048;
        if (maxTokens > tokenLimit) maxTokens = tokenLimit;

        const requestBody: any = {
          model,
          temperature: isO1Model ? 1 : 0.7
        };

        if (isLegacyModel) {
          requestBody.prompt = messages.map(m => `${m.role.charAt(0).toUpperCase() + m.role.slice(1)}: ${m.content}`).join('\n') + '\nAssistant: ';
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
          let errBody = '';
          if (isJson) {
            const errData = await res.json();
            errBody = errData.error?.message || errData.message || JSON.stringify(errData);
          } else {
            errBody = await res.text();
          }
          throw new Error(errBody ? `${res.status}: ${errBody.slice(0, 200)}` : `Failed to fetch from OpenAI (${res.status})`);
        }

        if (!isJson) {
          throw new Error('Endpoint returned success but response was not JSON. Please check your Base URL.');
        }

        const data = await res.json();
        let fullText = '';
        let usageCount = 0;

        if (isLegacyModel) {
          fullText = data.choices?.[0]?.text || '';
          usageCount = data.usage?.completion_tokens || 0;
        } else {
          fullText = data.choices?.[0]?.message?.content || '';
          usageCount = data.usage?.completion_tokens || data.usage?.total_tokens || 0;
        }

        const aiMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: fullText,
          timestamp: Date.now(),
          tokenCount: usageCount || undefined,
          modelUsed: model
        };
        
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, aiMessage], updatedAt: Date.now() } : s));
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoadingSessions(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const downloadImage = async (base64Data: string, filename: string) => {
    try {
      if (!FileSystem.cacheDirectory) throw new Error("Cache dir missing");
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        setError('Sharing is not available on this device');
      }
    } catch (e) {
      console.error(e);
      setError('Could not download image.');
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <StyledView className="h-16 flex-row items-center justify-between px-6 border-b border-[#111111] bg-black">
        <StyledTouchableOpacity onPress={() => setSidebarOpen(true)} className="p-2">
          <Layout size={22} color="#3b82f6" />
        </StyledTouchableOpacity>
        <StyledText className="text-white font-black tracking-[0.3em] text-lg uppercase italic">Privé AI</StyledText>
        <StyledTouchableOpacity onPress={() => setShowSettings(true)} className="p-2">
          <Settings2 size={22} color="#3b82f6" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* Chat Area */}
      <StyledScrollView 
        ref={scrollRef}
        className="flex-1"
        style={{ backgroundColor: '#000000' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {(!activeSessionId || getActiveSession()?.messages.length === 0) ? (
          <StyledView className="flex-1 items-center justify-center pt-20">
            <StyledView className="w-24 h-24 rounded-full bg-[#0a0a0a] border border-[#3b82f6]/20 items-center justify-center shadow-2xl shadow-[#3b82f6]/10 mb-8">
              <Sparkles size={50} color="#3b82f6" />
            </StyledView>
            <StyledText className="text-white text-4xl font-black tracking-tighter uppercase italic text-center">Privé AI</StyledText>
            <StyledText className="text-[#a1a1aa] text-center mt-4 font-bold tracking-widest uppercase text-[10px]">Architect of Secure Intelligence</StyledText>
            <StyledView className="mt-12 w-full space-y-4">
              {[
                "Analyze Market Integrity",
                "Strategic Growth Synthesis",
                "Executive Summary Generation"
              ].map((txt, i) => (
                <StyledTouchableOpacity key={i} onPress={() => setInput(txt)} className="bg-[#0a0a0a] border border-[#111111] p-5 rounded-2xl">
                  <StyledText className="text-white font-bold uppercase tracking-widest text-xs text-center">{txt}</StyledText>
                </StyledTouchableOpacity>
              ))}
            </StyledView>
          </StyledView>
        ) : (
          getActiveSession()?.messages.map((m) => (
            <StyledView key={m.id} className={`mb-10 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <StyledView className={`max-w-[90%] p-6 rounded-3xl ${m.role === 'user' ? 'bg-[#3b82f6] shadow-xl shadow-[#3b82f6]/20 rounded-tr-none' : 'bg-[#0a0a0a] border border-[#111111] rounded-tl-none shadow-xl'}`}>
                <Markdown style={{
                  body: { color: 'white', fontSize: 16, lineHeight: 24 },
                  hr: { backgroundColor: '#111111' },
                  code_inline: { backgroundColor: '#111111', color: '#3b82f6', padding: 4, borderRadius: 4 },
                  fence: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#111111' },
                  blockquote: { backgroundColor: '#0a0a0a', borderLeftColor: '#3b82f6', borderLeftWidth: 4, paddingHorizontal: 15 },
                  table: { borderColor: '#111111', borderWidth: 1, borderRadius: 8 },
                  tr: { borderBottomColor: '#111111', borderBottomWidth: 1 },
                  th: { backgroundColor: '#0a0a0a', color: '#3b82f6', fontWeight: 'bold' }
                }}>
                  {m.content}
                </Markdown>
                <StyledView className="flex-row items-center justify-between mt-4">
                  <StyledText className="text-[#a1a1aa] text-[10px] uppercase font-bold tracking-widest">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </StyledText>
                  {m.role === 'assistant' && (m.tokenCount || m.modelUsed) && (
                    <StyledView className="bg-black/50 px-3 py-1 rounded-full border border-[#3b82f6]/20 flex-row items-center">
                       <Sparkles size={8} color="#3b82f6" />
                       <StyledText className="text-[#3b82f6] text-[7px] font-black uppercase tracking-widest ml-1">
                         {m.modelUsed ? `${m.modelUsed} | ` : ''}{m.tokenCount ? `${m.tokenCount} Tokens` : 'Elite Response'}
                       </StyledText>
                    </StyledView>
                  )}
                </StyledView>
                {m.attachments && m.attachments.length > 0 && (
                  <StyledView className="mt-4 flex-row flex-wrap">
                    {m.attachments.map((att, idx) => (
                      <StyledView key={idx} className="mr-2 mb-2 p-1 bg-black/10 rounded-xl relative">
                        {att.type.startsWith('image/') ? (
                          <StyledView>
                            <Image 
                              source={{ uri: `data:${att.type};base64,${att.data}` }} 
                              style={{ width: 250, height: 250, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f655' }} 
                              resizeMode="cover"
                            />
                            <StyledTouchableOpacity 
                              onPress={() => downloadImage(att.data as string, att.name)}
                              className="absolute bottom-2 right-2 bg-black/50 p-2 rounded-full border border-[#3b82f6] backdrop-blur-sm"
                            >
                              <Download size={18} color="white" />
                            </StyledTouchableOpacity>
                          </StyledView>
                        ) : (
                          <StyledView className="flex-row items-center p-2">
                            <FileIcon size={16} color="white" />
                            <StyledText className="text-white text-[10px] ml-2 truncate max-w-[100px]">{att.name}</StyledText>
                          </StyledView>
                        )}
                      </StyledView>
                    ))}
                  </StyledView>
                )}
              </StyledView>
            </StyledView>
          ))
        )}
        {loadingSessions.has(activeSessionId!) && (
          <StyledView className="items-start mb-8">
            <StyledView className="bg-[#0a0a0a] border border-[#111111] p-5 rounded-3xl rounded-tl-none flex-row items-center shadow-xl">
              <ActivityIndicator color="#3b82f6" size="small" />
              <StyledText className="text-[#3b82f6] font-black uppercase tracking-[0.4em] text-[10px] ml-4">Processing Elite Sequence</StyledText>
            </StyledView>
          </StyledView>
        )}
      </StyledScrollView>

      {/* Input & Action Bar */}
      <StyledView className="bg-black/90 p-6 border-t border-[#111111]">
        <StyledView className="flex-row items-center mb-4 space-x-3">
          <StyledTouchableOpacity 
             onPress={() => setShowStrategy(!showStrategy)}
             className="bg-[#0a0a0a] border border-[#111111] rounded-full flex-1 h-10 px-4 flex-row items-center"
          >
             <Sparkles size={14} color="#3b82f6" />
             <StyledText className="text-[#3b82f6] text-xs font-black uppercase tracking-widest ml-3 flex-1" numberOfLines={1}>
               {settings.model || DEFAULT_MODEL}
             </StyledText>
             <ChevronDown size={14} color="#a1a1aa" />
          </StyledTouchableOpacity>
          <StyledTouchableOpacity onPress={() => setShowSettings(true)} className="bg-[#0a0a0a] border border-[#111111] rounded-full h-10 px-4 items-center justify-center">
            <Sliders size={16} color="#a1a1aa" />
          </StyledTouchableOpacity>
        </StyledView>

        {showStrategy && (
           <StyledView className="bg-[#0a0a0a] border border-[#111111] rounded-2xl mb-4 overflow-hidden">
             {(availableModels.length > 0 ? availableModels : [settings.model || DEFAULT_MODEL]).map(m => (
               <StyledTouchableOpacity 
                 key={m} 
                 onPress={() => {
                   setSettings(s => ({ ...s, model: m }));
                   setShowStrategy(false);
                 }}
                 className="p-4 border-b border-[#111111]"
               >
                 <StyledText className={`text-xs font-black uppercase tracking-widest ${settings.model === m ? 'text-[#3b82f6]' : 'text-white'}`}>{m}</StyledText>
               </StyledTouchableOpacity>
             ))}
           </StyledView>
        )}

        {attachments.length > 0 && (
          <StyledScrollView horizontal className="mb-4 flex-row" showsHorizontalScrollIndicator={false}>
            {attachments.map((file, i) => (
              <StyledView key={i} className="bg-[#0a0a0a] border border-[#111111] p-3 rounded-2xl flex-row items-center mr-3">
                <FileIcon size={16} color="#3b82f6" />
                <StyledText className="text-white text-xs ml-2 mr-3 font-bold" numberOfLines={1}>
                  {file.name.slice(0, 15)}
                </StyledText>
                <StyledTouchableOpacity onPress={() => removeAttachment(i)}>
                  <X size={14} color="#71717a" />
                </StyledTouchableOpacity>
              </StyledView>
            ))}
          </StyledScrollView>
        )}

        <StyledView className="flex-row items-center bg-[#0a0a0a] border border-[#111111] rounded-3xl px-5 py-3 space-x-3 shadow-2xl shadow-[#3b82f6]/5">
          <StyledTouchableOpacity onPress={pickDocument} className="p-2">
            <Paperclip size={22} color="#a1a1aa" />
          </StyledTouchableOpacity>
          <StyledTextInput 
            className="flex-1 text-white text-base py-1 font-semibold"
            placeholder="Initiate prompt..."
            placeholderTextColor="#333"
            value={input}
            onChangeText={setInput}
            multiline
            style={{ maxHeight: 120 }}
          />
          <StyledTouchableOpacity 
            className={`p-3 rounded-2xl ${input.trim() ? 'bg-[#3b82f6] shadow-xl shadow-[#3b82f6]/20' : 'bg-[#111111]'}`}
            onPress={handleSendMessage}
            disabled={!input.trim()}
          >
            <Send size={22} color={input.trim() ? 'white' : '#444'} />
          </StyledTouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Sidebar Modal */}
      <Modal visible={sidebarOpen} animationType="fade" transparent>
        <StyledView className="flex-1 bg-black/80 flex-row">
          <StyledView className="w-4/5 bg-card-app border-r border-[#111111] p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <StyledView className="flex-row items-center justify-between mb-8">
              <StyledText className="text-white font-black tracking-widest uppercase text-xl">Sessions</StyledText>
              <StyledTouchableOpacity onPress={() => setSidebarOpen(false)}>
                <X size={24} color="white" />
              </StyledTouchableOpacity>
            </StyledView>
            
            <StyledTouchableOpacity 
              onPress={createNewSession}
              className="bg-[#3b82f6] py-4 rounded-lg flex-row items-center justify-center space-x-2 mb-6"
            >
              <Plus size={20} color="white" />
              <StyledText className="text-white font-bold uppercase tracking-widest">New session</StyledText>
            </StyledTouchableOpacity>

            <StyledScrollView>
              {sessions.map(s => (
                <StyledTouchableOpacity 
                  key={s.id}
                  onPress={() => { setActiveSessionId(s.id); setError(null); setSidebarOpen(false); }}
                  className={`p-4 rounded-lg flex-row items-center space-x-3 mb-2 ${activeSessionId === s.id ? 'bg-[#3b82f6]/20 border border-[#3b82f6]' : 'bg-transparent'}`}
                >
                  <MessageSquare size={18} color={activeSessionId === s.id ? '#3b82f6' : '#71717a'} />
                  <StyledText className={`flex-1 text-sm ${activeSessionId === s.id ? 'text-white font-bold' : 'text-[#71717a]'}`}>{s.title}</StyledText>
                  <StyledTouchableOpacity onPress={() => { setSessions(sessions.filter(ses => ses.id !== s.id)) }}>
                     <Trash2 size={16} color="#ef4444" />
                  </StyledTouchableOpacity>
                </StyledTouchableOpacity>
              ))}
            </StyledScrollView>
          </StyledView>
          <StyledTouchableOpacity className="flex-1" onPress={() => setSidebarOpen(false)} />
        </StyledView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide">
        <StyledView className="flex-1 bg-[#000000] p-6">
          <StyledView className="flex-row items-center justify-between mt-10 mb-8">
            <StyledText className="text-white text-2xl font-black tracking-widest uppercase">Preferences</StyledText>
            <StyledTouchableOpacity onPress={() => setShowSettings(false)}>
              <X size={28} color="white" />
            </StyledTouchableOpacity>
          </StyledView>

          <StyledScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <StyledView className="mb-6 space-y-4">
              <StyledText className="text-[#3b82f6] font-bold uppercase text-[10px] tracking-[0.4em] mb-4">Active Intelligence</StyledText>
              <StyledView className="bg-[#0a0a0a] border border-[#111111] rounded-xl overflow-hidden mb-8">
                {settings.providers.map((p, idx) => (
                  <StyledTouchableOpacity 
                    key={p.id}
                    onPress={() => setSettings(s => ({ ...s, activeProviderId: p.id }))}
                    className={`p-4 border-b border-[#111111] flex-row items-center justify-between ${settings.activeProviderId === p.id || (idx === 0 && !settings.activeProviderId) ? 'bg-[#3b82f6]/10' : ''}`}
                  >
                    <StyledText className={`text-sm font-bold tracking-widest uppercase ${settings.activeProviderId === p.id || (idx === 0 && !settings.activeProviderId) ? 'text-[#3b82f6]' : 'text-white'}`}>
                      {p.name}
                    </StyledText>
                  </StyledTouchableOpacity>
                ))}
              </StyledView>

              <StyledView className="flex-row items-center justify-between mb-4">
                <StyledText className="text-[#71717a] font-bold uppercase text-[10px] tracking-[0.4em]">Manage Providers</StyledText>
                <StyledTouchableOpacity 
                  onPress={() => {
                    const newProv = { id: generateId(), name: 'New Provider', apiKey: '', baseUrl: 'https://api.openai.com', enabled: true };
                    setSettings(s => ({ ...s, providers: [...s.providers, newProv] }));
                  }}
                >
                   <PlusCircle size={16} color="#3b82f6" />
                </StyledTouchableOpacity>
              </StyledView>

              {settings.providers.map((provider, providerIdx) => (
                <StyledView key={provider.id} className="bg-[#0a0a0a] border border-[#111111] rounded-2xl p-5 mb-6 space-y-4">
                  <StyledView className="flex-row items-center justify-between mb-2">
                    <StyledTextInput 
                      className="text-white font-black uppercase text-xs tracking-widest flex-1"
                      value={provider.name}
                      onChangeText={(val) => {
                        const newP = [...settings.providers];
                        newP[providerIdx].name = val;
                        setSettings(s => ({ ...s, providers: newP }));
                      }}
                    />
                    {settings.providers.length > 1 && (
                      <StyledTouchableOpacity 
                        onPress={() => {
                          const newP = settings.providers.filter((_, i) => i !== providerIdx);
                          setSettings(s => ({ ...s, providers: newP, activeProviderId: s.activeProviderId === provider.id ? newP[0].id : s.activeProviderId }));
                        }}
                      >
                         <Trash2 size={16} color="#ef4444" />
                      </StyledTouchableOpacity>
                    )}
                  </StyledView>

                  <StyledView>
                    <StyledText className="text-[#71717a] font-bold uppercase text-[8px] tracking-widest mb-2">Authentication Key</StyledText>
                    <StyledTextInput 
                      className="bg-black/50 border border-[#222] p-3 rounded-lg text-white font-mono text-xs"
                      placeholder="API Key"
                      placeholderTextColor="#444"
                      secureTextEntry
                      value={provider.apiKey}
                      onChangeText={(text) => {
                        const newP = [...settings.providers];
                        newP[providerIdx].apiKey = text;
                        setSettings(s => ({ ...s, providers: newP }));
                      }}
                    />
                  </StyledView>

                  <StyledView>
                    <StyledText className="text-[#71717a] font-bold uppercase text-[8px] tracking-widest mb-2">Base Endpoint URL</StyledText>
                    <StyledTextInput 
                      className="bg-black/50 border border-[#222] p-3 rounded-lg text-white font-mono text-[10px]"
                      placeholder="https://..."
                      placeholderTextColor="#444"
                      value={provider.baseUrl}
                      onChangeText={(text) => {
                        const newP = [...settings.providers];
                        newP[providerIdx].baseUrl = text;
                        setSettings(s => ({ ...s, providers: newP }));
                      }}
                    />
                  </StyledView>
                </StyledView>
              ))}
            </StyledView>
            
            <StyledTouchableOpacity 
              onPress={() => setShowSettings(false)}
              className="bg-[#3b82f6] py-5 rounded-lg mt-6 shadow-2xl shadow-[#3b82f6]/20"
            >
              <StyledText className="text-white text-center font-bold tracking-widest uppercase">Seal Preferences</StyledText>
            </StyledTouchableOpacity>
            <StyledView className="h-20" />
          </StyledScrollView>
        </StyledView>
      </Modal>

      {error && (
        <StyledView className="absolute top-20 left-4 right-4 bg-red-900/80 p-4 border border-red-500 rounded-lg flex-row items-center space-x-3">
          <X size={20} color="white" />
          <StyledText className="text-white text-sm flex-1">{error}</StyledText>
          <StyledTouchableOpacity onPress={() => setError(null)}>
            <StyledText className="text-white font-bold ml-2">X</StyledText>
          </StyledTouchableOpacity>
        </StyledView>
      )}
    </StyledSafeAreaView>
  );
}
