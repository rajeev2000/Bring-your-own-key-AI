import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """      // Hardcode standard providers
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
      }"""

replacement = """      // Safely merge providers: keep custom ones, ensure defaults exist
      const savedProviders = parsed.providers || [];
      
      const hasGemini = savedProviders.some((p: any) => p.id === 'gemini');
      const hasOpenAI = savedProviders.some((p: any) => p.id === 'openai');

      if (!hasGemini) {
        savedProviders.unshift({
          id: 'gemini',
          name: 'Google AI',
          apiKey: parsed.apiKey || '',
          baseUrl: DEFAULT_BASE_URL,
          enabled: true
        });
      }
      
      if (!hasOpenAI) {
        savedProviders.push({
          id: 'openai',
          name: 'OpenAI',
          apiKey: '',
          baseUrl: 'https://api.openai.com',
          enabled: true
        });
      }

      parsed.providers = savedProviders;

      if (!parsed.activeProviderId || !parsed.providers.some((p: any) => p.id === parsed.activeProviderId)) { 
         parsed.activeProviderId = 'gemini';
      }"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Replaced perfectly.")
else:
    print("Target not found. Let's find what's actually there.")

