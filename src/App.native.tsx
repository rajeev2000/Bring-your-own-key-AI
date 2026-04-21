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
  Sliders
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { GoogleGenAI } from '@google/genai';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { styled } from 'nativewind';

import { Message, ChatSession, AppSettings, DEFAULT_MODEL, DEFAULT_BASE_URL } from './types';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);

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
  
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    baseUrl: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    temperature: 0.7,
    maxOutputTokens: 2048
  });

  const scrollRef = useRef<ScrollView>(null);

  const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

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
        setSettings(JSON.parse(savedSettings));
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
    if (!settings.apiKey) {
      setError("Provide an API key before syncing models.");
      return;
    }
    setFetchingModels(true);
    try {
      const ai = new GoogleGenAI({ apiKey: settings.apiKey });
      const modelsResult = await ai.models.list();
      const modelsArray: string[] = [];
      for await (const m of modelsResult) {
        modelsArray.push((m.name || '').replace('models/', ''));
      }
      setAvailableModels(modelsArray);
    } catch (e: any) {
      setError(`Model sync failed: ${e.message}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);

  const createNewSession = () => {
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
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets) {
        // In a real app, process file to base64
        // For brevity, using placeholder
        setAttachments(prev => [...prev, { name: result.assets[0].name, type: result.assets[0].mimeType || 'application/octet-stream', data: '' }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (!settings.apiKey) {
      setError('Provide an API key in preferences.');
      setShowSettings(true);
      return;
    }

    const currentInput = input;
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
    };

    if (!activeSession) {
      const newSession: ChatSession = {
        id: sessionId,
        title: currentInput.slice(0, 30) || 'New Session',
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setSessions([newSession, ...sessions]);
      setActiveSessionId(sessionId);
    } else {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, userMessage], updatedAt: Date.now() } : s));
    }

    setLoadingSessions(prev => new Set(prev).add(sessionId));

    try {
      const ai = new GoogleGenAI({ apiKey: settings.apiKey });
      const model = ai.getGenerativeModel({ model: settings.model || DEFAULT_MODEL });
      
      const result = await model.generateContent(currentInput);
      const response = await result.response;
      const text = response.text();

      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
      };

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: [...s.messages, aiMessage], updatedAt: Date.now() } : s));
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

  return (
    <SafeAreaView className="flex-1 bg-bg-app">
      <StatusBar style="light" />
      
      {/* Header */}
      <StyledView className="h-14 flex-row items-center justify-between px-4 border-b border-border-app bg-card-app">
        <TouchableOpacity onPress={() => setSidebarOpen(true)}>
          <Layout size={24} color="#3b82f6" />
        </TouchableOpacity>
        <StyledText className="text-white font-bold tracking-[0.2em] text-lg uppercase">Privé AI</StyledText>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Settings2 size={24} color="#3b82f6" />
        </TouchableOpacity>
      </StyledView>

      {/* Chat Area */}
      <StyledScrollView 
        ref={scrollRef}
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {(!activeSessionId || getActiveSession()?.messages.length === 0) ? (
          <StyledView className="flex-1 items-center justify-center pt-20">
            <Sparkles size={48} color="#3b82f6" fill="#3b82f622" />
            <StyledText className="text-white text-3xl font-black mt-4 tracking-tighter uppercase italic text-center">Welcome to Privé AI</StyledText>
            <StyledText className="text-gray-400 text-center mt-2 font-medium">The ultimate secure assistant. All data is stored locally.</StyledText>
          </StyledView>
        ) : (
          getActiveSession()?.messages.map((m) => (
            <StyledView key={m.id} className={`mb-6 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <StyledView className={`max-w-[85%] p-4 rounded-lg ${m.role === 'user' ? 'bg-accent-app' : 'bg-card-app border border-border-app'}`}>
                <Markdown style={{
                  body: { color: 'white', fontSize: 16 },
                  hr: { backgroundColor: '#1a1a1a' },
                  code_inline: { backgroundColor: '#1a1a1a', color: '#ff79c6' },
                  fence: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10 },
                }}>
                  {m.content}
                </Markdown>
                <StyledText className="text-gray-400 text-[10px] mt-2 text-right">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </StyledText>
              </StyledView>
            </StyledView>
          ))
        )}
        {loadingSessions.has(activeSessionId!) && (
          <StyledView className="items-start mb-6">
            <StyledView className="bg-card-app border border-border-app p-4 rounded-lg flex-row items-center space-x-3">
              <ActivityIndicator color="#3b82f6" size="small" />
              <StyledText className="text-accent-app font-bold uppercase tracking-widest text-[10px]">Privé AI is crafting...</StyledText>
            </StyledView>
          </StyledView>
        )}
      </StyledScrollView>

      {/* Input */}
      <StyledView className="absolute bottom-0 left-0 right-0 p-4 bg-bg-app border-t border-border-app">
        <StyledView className="flex-row items-center bg-card-app border border-border-app rounded-full px-4 py-2 space-x-2">
          <TouchableOpacity onPress={pickDocument}>
            <Paperclip size={20} color="#666" />
          </TouchableOpacity>
          <StyledTextInput 
            className="flex-1 text-white text-base py-1"
            placeholder="Compose a prompt..."
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity 
            className={`p-2 rounded-full ${input.trim() ? 'bg-accent-app' : 'bg-transparent'}`}
            onPress={handleSendMessage}
            disabled={!input.trim()}
          >
            <Send size={20} color={input.trim() ? 'white' : '#666'} />
          </TouchableOpacity>
        </StyledView>
      </StyledView>

      {/* Sidebar Modal */}
      <Modal visible={sidebarOpen} animationType="fade" transparent>
        <StyledView className="flex-1 bg-black/80 flex-row">
          <StyledView className="w-4/5 bg-card-app border-r border-border-app p-6">
            <StyledView className="flex-row items-center justify-between mb-8">
              <StyledText className="text-white font-black tracking-widest uppercase text-xl">Sessions</StyledText>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </StyledView>
            
            <TouchableOpacity 
              onPress={createNewSession}
              className="bg-accent-app py-4 rounded-lg flex-row items-center justify-center space-x-2 mb-6"
            >
              <Plus size={20} color="white" />
              <StyledText className="text-white font-bold uppercase">New session</StyledText>
            </TouchableOpacity>

            <StyledScrollView>
              {sessions.map(s => (
                <TouchableOpacity 
                  key={s.id}
                  onPress={() => { setActiveSessionId(s.id); setSidebarOpen(false); }}
                  className={`p-4 rounded-lg flex-row items-center space-x-3 mb-2 ${activeSessionId === s.id ? 'bg-accent-app/20 border border-accent-app' : 'bg-transparent'}`}
                >
                  <MessageSquare size={18} color={activeSessionId === s.id ? '#3b82f6' : '#666'} />
                  <StyledText className={`flex-1 text-sm ${activeSessionId === s.id ? 'text-white font-bold' : 'text-gray-400'}`}>{s.title}</StyledText>
                </TouchableOpacity>
              ))}
            </StyledScrollView>
          </StyledView>
          <TouchableOpacity className="flex-1" onPress={() => setSidebarOpen(false)} />
        </StyledView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide">
        <StyledView className="flex-1 bg-bg-app p-6">
          <StyledView className="flex-row items-center justify-between mt-10 mb-8">
            <StyledText className="text-white text-2xl font-black tracking-widest uppercase">Preferences</StyledText>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <X size={28} color="white" />
            </TouchableOpacity>
          </StyledView>

          <StyledScrollView className="flex-1">
            <StyledView className="mb-6">
              <StyledText className="text-accent-app font-bold uppercase text-xs mb-2 tracking-widest">API Key</StyledText>
              <StyledTextInput 
                className="bg-card-app border border-border-app p-4 rounded-lg text-white font-mono"
                placeholder="Enter Gemini API Key"
                placeholderTextColor="#444"
                secureTextEntry
                value={settings.apiKey}
                onChangeText={(text) => setSettings(s => ({ ...s, apiKey: text }))}
              />
            </StyledView>

            <StyledView className="mb-6">
              <StyledView className="flex-row items-center justify-between mb-2">
                <StyledText className="text-accent-app font-bold uppercase text-xs tracking-widest">Designation</StyledText>
                <TouchableOpacity onPress={fetchModels}>
                    <StyledText className="text-accent-app text-[10px] uppercase font-bold">Sync Models</StyledText>
                </TouchableOpacity>
              </StyledView>
              <StyledView className="bg-card-app border border-border-app rounded-lg overflow-hidden">
                <Picker
                  selectedValue={settings.model}
                  onValueChange={(itemValue) => setSettings(s => ({ ...s, model: itemValue }))}
                  style={{ color: '#3b82f6', height: 50 }}
                  dropdownIconColor="#3b82f6"
                >
                  <Picker.Item label="Select Model" value="" color="#666" />
                  {availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <Picker.Item key={m} label={m} value={m} />
                    ))
                  ) : (
                    <Picker.Item label={settings.model || DEFAULT_MODEL} value={settings.model || DEFAULT_MODEL} />
                  )}
                </Picker>
              </StyledView>
              <StyledText className="text-gray-500 text-[10px] mt-1 uppercase">Sync to populate models.</StyledText>
            </StyledView>
            
            <TouchableOpacity 
              onPress={() => setShowSettings(false)}
              className="bg-accent-app py-5 rounded-lg mt-10"
            >
              <StyledText className="text-white text-center font-bold tracking-widest uppercase">Apply Changes</StyledText>
            </TouchableOpacity>
          </StyledScrollView>
        </StyledView>
      </Modal>

      {error && (
        <StyledView className="absolute top-20 left-4 right-4 bg-red-900/80 p-4 border border-red-500 rounded-lg flex-row items-center space-x-3">
          <X size={20} color="white" />
          <StyledText className="text-white text-sm flex-1">{error}</StyledText>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text className="text-white font-bold ml-2">X</Text>
          </TouchableOpacity>
        </StyledView>
      )}
    </SafeAreaView>
  );
}
