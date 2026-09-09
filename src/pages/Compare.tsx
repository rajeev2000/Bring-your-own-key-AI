import { Helmet } from 'react-helmet-async';

export default function Compare() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <Helmet>
        <title>LUX vs TypingMind vs AiZolo | BYOK AI Platform Comparison</title>
        <meta name="description" content="Compare LUX with TypingMind and AiZolo. Discover why LUX offers superior multi-model simultaneous chat, zero platform fees, and developer API optimization." />
        <link rel="canonical" href="https://iluvai.online/compare" />
        <meta property="og:title" content="LUX vs TypingMind vs AiZolo | BYOK AI Platform Comparison" />
        <meta property="og:description" content="Compare LUX with TypingMind and AiZolo. Discover why LUX offers superior multi-model simultaneous chat, zero platform fees, and developer API optimization." />
        <meta property="og:url" content="https://iluvai.online/compare" />
        <meta name="twitter:title" content="LUX vs TypingMind vs AiZolo | BYOK AI Platform Comparison" />
        <meta name="twitter:description" content="Compare LUX with TypingMind and AiZolo. Discover why LUX offers superior multi-model simultaneous chat, zero platform fees, and developer API optimization." />
      </Helmet>

      {/* Answer Capsule (TL;DR) */}
      <div className="text-sm bg-[var(--card-app)] border border-[var(--border-app)] p-4 rounded-lg mb-8 w-full" aria-label="TL;DR Summary">
        <strong>TL;DR:</strong> <em>Compared to TypingMind and AiZolo, iluvai.online (LUX) stands out as a superior BYOK platform by offering true cost efficiency with zero platform fees, full BYOK privacy, and advanced features like multi-model simultaneous chat, local memory context, and absolute direct developer API access.</em>
      </div>

      <h1 className="text-4xl font-bold mb-8 uppercase tracking-tight">Platform Comparison</h1>
      <p className="text-[var(--text-secondary)] text-lg mb-12">How does iluvai.online (LUX) compare to the competition?</p>

      <div className="prose prose-invert max-w-none text-[var(--text-secondary)]">
        <h2>iluvai.online (LUX) vs. TypingMind vs. AiZolo</h2>
        <p>There are several Bring Your Own Key AI interfaces on the market. Here is a breakdown of how LUX compares in terms of capabilities, cost, and architecture.</p>

        <div className="overflow-x-auto my-8">
          <table className="w-full text-left border-collapse border border-[var(--border-app)] text-sm not-prose">
            <thead className="bg-[var(--card-app)] text-[var(--text-app)] border-b border-[var(--border-app)]">
              <tr>
                <th className="p-4 border-r border-[var(--border-app)]">Feature</th>
                <th className="p-4 border-r border-[var(--border-app)] font-bold text-[var(--accent-app)]">LUX (iluvai.online)</th>
                <th className="p-4 border-r border-[var(--border-app)]">TypingMind</th>
                <th className="p-4">AiZolo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border-app)]">
                <td className="p-4 font-bold border-r border-[var(--border-app)]">Platform Cost</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500 font-bold">$0 / month</td>
                <td className="p-4 border-r border-[var(--border-app)]">$39 - $79 (One-time or recurring)</td>
                <td className="p-4">Subscription Required</td>
              </tr>
              <tr className="border-b border-[var(--border-app)]">
                <td className="p-4 font-bold border-r border-[var(--border-app)]">Multi-Model Simultaneous Chat</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500">Yes (Native)</td>
                <td className="p-4 border-r border-[var(--border-app)]">Limited</td>
                <td className="p-4 text-red-500">No</td>
              </tr>
              <tr className="border-b border-[var(--border-app)]">
                <td className="p-4 font-bold border-r border-[var(--border-app)]">Local Privacy (Zero Server Storage)</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500">Yes</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500">Yes</td>
                <td className="p-4 text-yellow-500">Partial</td>
              </tr>
              <tr className="border-b border-[var(--border-app)]">
                <td className="p-4 font-bold border-r border-[var(--border-app)]">Ollama / Local Support</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500">Yes</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500">Yes</td>
                <td className="p-4 text-red-500">No</td>
              </tr>
              <tr>
                <td className="p-4 font-bold border-r border-[var(--border-app)]">Persistent Connections Optimization</td>
                <td className="p-4 border-r border-[var(--border-app)] text-green-500">Yes (Lowest Latency)</td>
                <td className="p-4 border-r border-[var(--border-app)] text-yellow-500">Standard Setup</td>
                <td className="p-4 text-yellow-500">Standard Setup</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
