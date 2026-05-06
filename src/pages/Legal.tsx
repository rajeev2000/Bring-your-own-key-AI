import { Helmet } from 'react-helmet-async';

export default function Legal() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <Helmet>
        <title>Legal & Privacy Policy | Free Local App Architecture | LUX</title>
        <meta name="description" content="Read our transparent Privacy Policy and Terms of Service. Understand our local-first implementation, API responsibility, and zero-retention infrastructure." />
      </Helmet>

      <h1 className="text-4xl font-bold mb-12 uppercase tracking-tight">Legal & Privacy</h1>
      
      <div className="prose prose-invert max-w-none text-[var(--text-secondary)]">
        <h2 className="text-3xl font-bold mb-4 text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">Privacy Policy</h2>
        <p className="text-sm mb-6 uppercase tracking-widest text-[var(--accent-app)] font-bold">Last Updated: May 6, 2026</p>
        
        <h3 className="text-xl font-bold mt-8 mb-2">Local-First Data Storage</h3>
        <p>
          At iluvai.online, we believe your data is yours. Period. We have engineered our entire platform around a strict local-first, zero-retention architecture. We do <strong>not</strong> collect, process, or store your chat histories, prompt inputs, or system configuration on any remote servers. All your interactions are securely stored locally within your browser's IndexedDB and `localStorage`.
        </p>
        
        <h3 className="text-xl font-bold mt-8 mb-2">API Key Security</h3>
        <p>
          Your provider API keys (OpenAI, Anthropic, Google GenAI, etc.) are critical sensitive data. They are never transmitted to our servers. When you enter an API key into iluvai, it is saved directly to your local device and used exclusively to facilitate direct client-to-API requests. We act entirely as a client-side interface layer.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-2">Third-Party Interactions</h3>
        <p>
          Because our platform communicates directly with third-party LLM providers, your prompts and data are subject to the privacy policies of the specific API provider you use (e.g., OpenAI's API privacy policy, Google Cloud's terms). We recommend reviewing the policies for each provider to understand how your data is handled once it leaves your local browser.
        </p>

        <h2 className="text-3xl font-bold mt-16 mb-4 text-[var(--text-app)] border-b border-[var(--border-app)] pb-2">Terms of Service</h2>
        <p className="text-sm mb-6 uppercase tracking-widest text-[var(--accent-app)] font-bold">Last Updated: May 6, 2026</p>

        <h3 className="text-xl font-bold mt-8 mb-2">1. Bring Your Own Key (BYOK) Accountability</h3>
        <p>
          By utilizing iluvai.online, you acknowledge that you are bringing your own API keys to the service. You are solely responsible for managing the credentials, securing your keys, and covering all associated costs charged by the API providers. We take no responsibility for unexpected billing charges or quota limits triggered by your usage via our interface.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-2">2. Prohibited Content and Provider Terms</h3>
        <p>
          You agree to comply with the terms, conditions, and acceptable use policies of any AI provider you connect to our platform. iluvai provides the UI, but you are the direct customer of the API provider. Do not use our platform to bypass safety guidelines, generate illegal content, or violate any third-party agreements.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-2">3. Limitation of Liability</h3>
        <p>
          This service is provided "as is" without any warranties of any kind. Since the core processing involves external APIs not controlled by iluvai.online, we cannot guarantee constant uptime, uninterrupted service, or perfectly accurate AI responses. In no event shall iluvai.online be liable for any indirect, incidental, or consequential damages arising from the use of the service.
        </p>
      </div>
    </div>
  );
}
