import { Shield, Lock, FileKey2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function TrustCenter() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <Helmet>
        <title>Zero Data Retention Privacy & Security Architecture | LUX</title>
        <meta name="description" content="Discover LUX's local-first architecture. Your API keys and conversational data never leave your browser. Absolute sovereign AI privacy." />
        <link rel="canonical" href="https://iluvai.online/trust-center" />
        <meta property="og:title" content="Zero Data Retention Privacy & Security Architecture | LUX" />
        <meta property="og:description" content="Discover LUX's local-first architecture. Your API keys and conversational data never leave your browser. Absolute sovereign AI privacy." />
        <meta property="og:url" content="https://iluvai.online/trust-center" />
        <meta name="twitter:title" content="Zero Data Retention Privacy & Security Architecture | LUX" />
        <meta name="twitter:description" content="Discover LUX's local-first architecture. Your API keys and conversational data never leave your browser. Absolute sovereign AI privacy." />
      </Helmet>

      {/* Answer Capsule (TL;DR) */}
      <div className="text-sm bg-[var(--card-app)] border border-[var(--border-app)] p-4 rounded-lg mb-12 w-full text-left" aria-label="TL;DR Summary">
        <strong>TL;DR:</strong> <em>iluvai.online (LUX) guarantees zero data retention. Designed around a client-side architecture, your API keys and conversational data are stored only within your browser's local sandbox. Requests communicate directly with LLM endpoints, eliminating man-in-the-middle proxy servers for absolute sovereign privacy.</em>
      </div>

      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 uppercase tracking-tight">Trust Center</h1>
        <p className="text-[var(--text-secondary)] text-xl max-w-2xl mx-auto">
          Security and Privacy Architecture at iluvai.online. Discover how we protect your keys, data, and access.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-[var(--card-app)] border border-[var(--border-app)] p-8">
          <Shield className="w-10 h-10 text-[var(--accent-app)] mb-4" />
          <h3 className="text-xl font-bold mb-3">Zero Data Retention</h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            We operate a strict zero data retention policy on our operational infrastructure. Your chats, prompts, and system configurations remain exclusively on your device within your browser's local sandbox.
          </p>
        </div>

        <div className="bg-[var(--card-app)] border border-[var(--border-app)] p-8">
          <Lock className="w-10 h-10 text-[var(--accent-app)] mb-4" />
          <h3 className="text-xl font-bold mb-3">Client-Side Architecture</h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            All requests to the LLM backend providers are made directly from your browser interface. We do not proxy your requests, ensuring there is no backend man-in-the-middle server intercepting or reading your data.
          </p>
        </div>
      </div>

      <div className="mt-20 border-t border-[var(--border-app)] pt-16">
        <div className="flex items-center gap-4 mb-8">
          <FileKey2 className="w-8 h-8 text-[var(--accent-app)]" />
          <h2 className="text-3xl font-bold uppercase tracking-tight">Security Whitepaper</h2>
        </div>
        
        <div className="prose prose-invert max-w-none text-[var(--text-secondary)]">
          <h3>Encrypted Key Management & The BYOK Model</h3>
          <p>
            The Bring Your Own Key (BYOK) model transfers authorization authority directly back to the user. From a platform security perspective, iluvai takes the stance that we do not want your API keys. We consider developer credentials to be radioactive material—highly useful, but dangerous to handle and store centrally.
          </p>
          
          <h4>1. Local Storage Security</h4>
          <p>
            When you enter an API key into the iluvai.online settings panel, the data is pushed solely into your browser's `localStorage` dictionary. This sandbox is domain-isolated, preventing malicious scripts from external domains from accessing the state. Your keys remain resident in memory and disk specifically for `iluvai.online`.
          </p>

          <h4>2. Direct Connection Topology</h4>
          <p>
            When you initiate a prompt, the HTTP or WebSockets request is minted client-side. The `Authorization: Bearer &lt;KEY&gt;` header is attached locally, and the TLS connection occurs between your client and the provider (e.g., `api.openai.com` or `generativelanguage.googleapis.com`). Because there is no intermediary proxy server, iluvai servers never see the contents of your prompts, your returned generations, or the keys themselves. 
          </p>

          <h4>3. Mitigating Cross-Site Scripting (XSS)</h4>
          <p>
            Our core frontend is compiled using heavily hardened React constraints. We utilize robust encoding when rendering Markdown and Code blocks returned by the AI, heavily mitigating XSS injection capabilities that might attempt to scrape `localStorage`. We do not serve third-party ad networks or unvetted analytics scripts that often introduce supply-chain vulnerabilities.
          </p>

          <h4>4. Persistent Connections</h4>
          <p>
            To optimize performance securely, iluvai utilizes a local Connection Manager that handles HTTP Keep-Alives and session pooling. These connection persistence objects drop out of memory intelligently during idle timeouts, preventing stale authorization tokens from living in active memory indefinitely.
          </p>
        </div>
      </div>
    </div>
  );
}
