import { Helmet } from 'react-helmet-async';

export default function Features() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <Helmet>
        <title>AI Aggregator Features | Local Memory & Multi-Model Routing | LUX</title>
        <meta name="description" content="Explore LUX's BYOK features: local-first memory, multi-provider routing (OpenAI, Anthropic, Google, Ollama), and unhindered VIP access." />
      </Helmet>

      {/* Answer Capsule (TL;DR) */}
      <div className="text-sm bg-[var(--card-app)] border border-[var(--border-app)] p-4 rounded-lg mb-8 w-full" aria-label="TL;DR Summary">
        <strong>TL;DR:</strong> <em>Key features of iluvai.online (LUX) include a local-first memory context allowing fast chat retrieval without remote databases, a multi-provider router to instantly switch between OpenAI, Anthropic, Google, and Ollama, and a fully private BYOK environment designed for unhindered developer-grade access.</em>
      </div>

      <h1 className="text-4xl font-bold mb-8 uppercase tracking-tight">Features</h1>
      <p className="text-[var(--text-secondary)] text-lg mb-12">Discover the robust toolset that powers iluvai.online.</p>
      
      <div className="space-y-8">
        <div className="border-b border-[var(--border-app)] pb-8">
          <h2 className="text-2xl font-semibold mb-4">BYOK Architecture</h2>
          <p className="text-[var(--text-secondary)]">Bring Your Own Key architecture guarantees you only pay for what you use, without fixed subscriptions. It ensures you have 100% data ownership.</p>
        </div>
        <div className="border-b border-[var(--border-app)] pb-8">
          <h2 className="text-2xl font-semibold mb-4">Local Context Memory</h2>
          <p className="text-[var(--text-secondary)]">Your chat history is persisted locally using cutting-edge storage mechanisms. Fast retrieval without exposing your data to external databases.</p>
        </div>
        <div className="border-b border-[var(--border-app)] pb-8">
          <h2 className="text-2xl font-semibold mb-4">Multi-Provider Router</h2>
          <p className="text-[var(--text-secondary)]">Switch between Gemini 3.1 Pro, GPT-4o, Claude 3.5, and Groq instantly, or even use local models running on your rig via Ollama.</p>
        </div>
      </div>
    </div>
  );
}
