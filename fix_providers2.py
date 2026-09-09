import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r"      // Hardcode standard providers\s*parsed\.providers = \[.*?\];\s*if \(\!parsed\.activeProviderId \|\| \(parsed\.activeProviderId \!\=\= 'gemini' \&\& parsed\.activeProviderId \!\=\= 'openai'\)\) \{\s*parsed\.activeProviderId = 'gemini';\s*\}", re.DOTALL)

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

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Replaced perfectly.")
else:
    print("Target not found.")

