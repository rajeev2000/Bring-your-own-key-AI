export default function Blog() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
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
