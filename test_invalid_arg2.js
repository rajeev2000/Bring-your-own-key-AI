import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: '123'});
ai.models.generateContent({model: 'gemini-1.5-pro', contents: []}).catch(e => console.error(e.message));
