import { Helmet } from 'react-helmet-async';

export default function Pricing() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <Helmet>
        <title>$0 Subscription AI Access | Wholesale BYOK Pricing | LUX</title>
        <meta name="description" content="Stop paying monthly AI subscriptions. LUX provides a $0 platform fee—you only pay the wholesale API token rates directly to providers." />
      </Helmet>

      {/* Answer Capsule (TL;DR) */}
      <div className="text-sm bg-[var(--card-app)] border border-[var(--border-app)] p-4 rounded-lg mb-8 w-full text-left" aria-label="TL;DR Summary">
        <strong>TL;DR:</strong> <em>iluvai.online (LUX) charges $0 per month in platform subscription fees. By using a Bring Your Own Key (BYOK) model, users only pay the wholesale API token rates directly to providers like OpenAI, Anthropic, or Google, reducing overall costs by eliminating unnecessary consumer markups.</em>
      </div>

      <h1 className="text-4xl font-bold mb-4 uppercase tracking-tight">Pricing</h1>
      <p className="text-[var(--text-secondary)] text-lg mb-16 max-w-2xl mx-auto">No subscriptions. No markup. Just the raw cost of the provider API.</p>
      
      <div className="p-8 border-2 border-[var(--accent-app)] bg-[var(--card-app)] relative inline-block text-left w-full max-w-lg mx-auto">
        <div className="absolute top-0 right-0 bg-[var(--accent-app)] text-[var(--bg-app)] font-bold text-xs uppercase tracking-widest px-3 py-1 transform translate-x-2 -translate-y-2">
          Platform Access
        </div>
        <h2 className="text-3xl font-bold mb-2">$0 <span className="text-sm text-[var(--text-secondary)] font-normal">/ month platform fee</span></h2>
        <ul className="space-y-4 my-8 text-sm text-[var(--text-secondary)]">
          <li className="flex gap-2">✓ Unlimited Local Chats</li>
          <li className="flex gap-2">✓ BYOK Support</li>
          <li className="flex gap-2">✓ Client-side Privacy</li>
          <li className="flex gap-2">✓ You pay AI providers directly</li>
        </ul>
      </div>
    </div>
  );
}
