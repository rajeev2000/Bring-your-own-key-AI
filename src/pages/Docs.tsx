import { Helmet } from 'react-helmet-async';

export default function Docs() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row gap-12 items-start">
      <Helmet>
        <title>Setup Guide & API Integration Documentation | LUX</title>
        <meta name="description" content="Learn how to connect OpenAI, Anthropic, Google GenAI, and Ollama API keys to the LUX interface in under a minute." />
      </Helmet>

      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 flex-shrink-0 sticky top-24 border-r border-[var(--border-app)] pr-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-app)] mb-4">Documentation</h3>
        <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
          <li><a href="#setup-guide" className="hover:text-[var(--text-app)] transition-colors block">1. Setup Guide</a></li>
          <li><a href="#openai" className="hover:text-[var(--text-app)] transition-colors block">2. OpenAI Integration</a></li>
          <li><a href="#anthropic" className="hover:text-[var(--text-app)] transition-colors block">3. Anthropic Claude</a></li>
          <li><a href="#ollama" className="hover:text-[var(--text-app)] transition-colors block">4. Local Model Setup</a></li>
          <li><a href="#cost-comparison" className="hover:text-[var(--text-app)] transition-colors block">5. Cost Comparison</a></li>
        </ul>
      </nav>

      {/* Content Area */}
      <div className="flex-1 prose prose-invert max-w-none text-[var(--text-secondary)] w-full">
        {/* Answer Capsule (TL;DR) */}
        <div className="text-sm bg-[var(--card-app)] border border-[var(--border-app)] p-4 rounded-lg mb-8 w-full not-prose" aria-label="TL;DR Summary">
          <strong>TL;DR:</strong> <em>Setting up iluvai.online (LUX) takes under a minute. Simply generate an API key from your preferred provider (OpenAI, Anthropic, Google GenAI, or local Ollama), paste it into the secure local settings panel, and instantly access advanced LLMs without any proxy servers or middlemen.</em>
        </div>

        <h1 className="text-4xl font-bold mb-4 uppercase tracking-tight text-[var(--text-app)]">Platform Guides</h1>
        <p className="text-lg mb-12">Learn how to connect your keys, optimize your workflow, and maximize your BYOK AI interface.</p>

        <section id="setup-guide" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">1. General Setup Guide</h2>
          <p>Welcome to the ultimate premium AI aggregator. Setting up your environment only takes a minute.</p>
          <ol className="list-decimal list-inside space-y-2 mt-4 ml-4">
            <li>Navigate to the <strong>App</strong> via the top navigation bar.</li>
            <li>Click the Gear Icon (⚙️) located in the left sidebar to open the <strong>Settings</strong> panel.</li>
            <li>Select the provider tab (Google, OpenAI, Anthropic, Custom/Local).</li>
            <li>Paste your <strong>API Key</strong> into the designated input field.</li>
            <li>Wait a second for the platform to dynamically fetch the available models for your provider.</li>
            <li>Select your preferred model from the dropdown above the chat interface and start typing!</li>
          </ol>
        </section>

        <section id="openai" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">2. OpenAI API Integration</h2>
          <p>Integrate GPT-4o, GPT-4o-Mini, and DALL-E into your workspace seamlessly.</p>
          <ol className="list-decimal list-inside space-y-2 mt-4 ml-4">
            <li>Log into your <a href="https://platform.openai.com/" target="_blank" rel="noreferrer" className="text-[var(--accent-app)] font-bold">OpenAI Developer Platform</a> account.</li>
            <li>Navigate to the API Keys section on the dashboard.</li>
            <li>Click <strong>"Create new secret key"</strong>. Name it "iluvai-interface" for clarity.</li>
            <li>Copy the generated key immediately (it usually starts with `sk-...`).</li>
            <li>Open the iluvai Settings panel, choose the "OpenAI" tab, and paste your key.</li>
          </ol>
          <p className="mt-4 italic">Note: Ensure you have sufficient credits loaded into your OpenAI developer account, as API access is billed separately from ChatGPT Plus subscriptions.</p>
        </section>

        <section id="anthropic" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">3. Anthropic Claude Integration</h2>
          <p>If you prefer Claude 3.5 Sonnet or Opus for superior coding capabilities, hook up Anthropic directly.</p>
          <ol className="list-decimal list-inside space-y-2 mt-4 ml-4">
            <li>Sign in to the <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-[var(--accent-app)] font-bold">Anthropic Console</a>.</li>
            <li>Navigate to the "Get API Keys" section.</li>
            <li>Create a new API Key and copy it to your clipboard.</li>
            <li>In the iluvai Settings panel, hit the "Anthropic" tab and input your key.</li>
            <li>Select your model of choice from the chat interface.</li>
          </ol>
        </section>

        <section id="ollama" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">4. Local Model (Ollama) Setup</h2>
          <p>Prefer totally private, offline LLMs running on your own hardware? We fully support Ollama.</p>
          <ol className="list-decimal list-inside space-y-2 mt-4 ml-4">
            <li>Download and install <a href="https://ollama.com/" target="_blank" rel="noreferrer" className="text-[var(--accent-app)] font-bold">Ollama</a> on your machine.</li>
            <li>Pull a model via your local terminal, e.g., `ollama run llama3`.</li>
            <li>Ensure the Ollama API server is running locally (usually on port `11434`).<br/> <span className="text-xs text-[var(--text-secondary)]">Note: To allow a web app to access a local endpoint, you may need to configure Ollama CORS settings to allow `https://iluvai.online` or `*`.</span></li>
            <li>In iluvai Settings, go to the "Custom/Local" tab.</li>
            <li>Set the provider name to "Ollama Local".</li>
            <li>Set the Base URL to `http://localhost:11434/v1`. Keep the API key blank or input "ollama" if requested.</li>
            <li>Close settings and start chatting privately at 0 web latency!</li>
          </ol>
        </section>

        <section id="cost-comparison" className="mb-16 scroll-mt-24">
          <h2 className="text-2xl font-bold text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">5. Cost Comparison: Subscription vs API</h2>
          <p>Why do we champion the wholesale BYOK model? Because standard subscriptions often charge you a premium for an interface, regardless of how much you use it.</p>
          
          <div className="overflow-x-auto my-8">
            <table className="w-full text-left border-collapse border border-[var(--border-app)] text-sm">
              <thead className="bg-[var(--card-app)] text-[var(--text-app)] border-b border-[var(--border-app)]">
                <tr>
                  <th className="p-4 border-r border-[var(--border-app)]">Model Approach</th>
                  <th className="p-4 border-r border-[var(--border-app)]">Fixed Cost</th>
                  <th className="p-4 border-r border-[var(--border-app)]">Typical Light User</th>
                  <th className="p-4 border-r border-[var(--border-app)]">Typical Heavy Dev</th>
                  <th className="p-4">Rate Limits</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-app)]">
                  <td className="p-4 font-bold border-r border-[var(--border-app)]">Consumer Subscription<br/><span className="text-xs font-normal text-[var(--text-secondary)]">ChatGPT Plus / Claude Pro</span></td>
                  <td className="p-4 border-r border-[var(--border-app)]">$20/mo</td>
                  <td className="p-4 border-r border-[var(--border-app)]">$20/mo</td>
                  <td className="p-4 border-r border-[var(--border-app)]">$20/mo</td>
                  <td className="p-4">High<br/><span className="text-xs text-[var(--text-secondary)]">Strict Prompts/Hour caps</span></td>
                </tr>
                <tr>
                  <td className="p-4 font-bold border-r border-[var(--border-app)] text-[var(--accent-app)]">iluvai BYOK<br/><span className="text-xs font-normal text-[var(--text-secondary)]">API Billing</span></td>
                  <td className="p-4 border-r border-[var(--border-app)]">$0/mo</td>
                  <td className="p-4 border-r border-[var(--border-app)] text-green-500">~$1.50 - $4.00/mo</td>
                  <td className="p-4 border-r border-[var(--border-app)]">~$15.00 - $35.00/mo</td>
                  <td className="p-4 text-green-500">Zero<br/><span className="text-xs text-[var(--text-secondary)]">Bypass throttles</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>The Verdict:</strong> If you are a light user, you save immense money by using an API key because you pay micro-cents per 1000 tokens. If you are a high-volume power user, you might pay slightly more than $20, but you <strong>gain unthrottled access</strong>, avoiding platform timeouts during your critical workflow sprints.
          </p>
        </section>

      </div>
    </div>
  );
}
