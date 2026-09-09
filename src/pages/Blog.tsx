import { Helmet } from 'react-helmet-async';

export default function Blog() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <Helmet>
        <title>Blog | Engineering Updates & AI Insights | LUX</title>
        <meta name="description" content="Read the latest engineering updates, feature releases, and insights from the team behind LUX." />
        <link rel="canonical" href="https://iluvai.online/blog" />
        <meta property="og:title" content="Blog | Engineering Updates & AI Insights | LUX" />
        <meta property="og:description" content="Read the latest engineering updates, feature releases, and insights from the team behind LUX." />
        <meta property="og:url" content="https://iluvai.online/blog" />
        <meta name="twitter:title" content="Blog | Engineering Updates & AI Insights | LUX" />
        <meta name="twitter:description" content="Read the latest engineering updates, feature releases, and insights from the team behind LUX." />
      </Helmet>
      <h1 className="text-4xl font-bold mb-8 uppercase tracking-tight">Blog</h1>
      <p className="text-[var(--text-secondary)] text-lg mb-12">Latest updates from iluvai.online.</p>
      
      <div className="space-y-8">
        <article className="border-b border-[var(--border-app)] pb-8">
          <span className="text-[10px] text-[var(--accent-app)] uppercase font-bold tracking-widest block mb-2">May 2026</span>
          <h2 className="text-2xl font-bold hover:underline cursor-pointer mb-3">Introducing Persistent Connections</h2>
          <p className="text-[var(--text-secondary)]">We've radically optimized our BYOK protocol by introducing persistent API connections, dropping latency by up to 40% across all requests.</p>
        </article>
      </div>
    </div>
  );
}
