import { Outlet, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, FileText, Home, Star, Shield, Columns } from 'lucide-react';

export default function Layout() {
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "iluvai.online",
    "url": "https://iluvai.online"
  };

  const schemaSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "iluvai.online (LUX)",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "WebBrowser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Ultra-Premium BYOK AI Aggregator providing direct API access to LLMs."
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-app)] font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaSoftware) }} />

      <header className="border-b border-[var(--border-app)] sticky top-0 bg-[var(--bg-app)]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2 text-[var(--accent-app)] hover:opacity-80 transition-opacity">
              <span className="w-8 h-8 rounded-full bg-[var(--accent-app)] text-[var(--bg-app)] flex items-center justify-center text-sm">il</span>
              <span>iluvai.online</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <Link to="/" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><Home size={14} /> Home</Link>
            <Link to="/features" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><Star size={14} /> Features</Link>
            <Link to="/compare" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><Columns size={14} /> Compare</Link>
            <Link to="/pricing" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><Lock size={14} /> Pricing</Link>
            <Link to="/news" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><FileText size={14} /> News</Link>
            <Link to="/docs" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><FileText size={14} /> Docs</Link>
            <Link to="/trust-center" className="hover:text-[var(--accent-app)] hover:underline flex items-center gap-1"><Shield size={14} /> Trust Center</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/app" className="bg-[var(--accent-app)] text-[var(--bg-app)] px-4 py-2 text-sm font-bold uppercase tracking-wide hover:opacity-90 transition-opacity">
              Launch App
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border-app)] bg-[var(--card-app)] py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[var(--accent-app)]">iluvai.online</h3>
            <p className="text-sm text-[var(--text-secondary)]">Ultra-Premium AI. Bring Your Own API Key. No Subscriptions. Total Privacy.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 uppercase text-xs tracking-widest text-[var(--text-secondary)]">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features" className="hover:text-[var(--accent-app)] transition-colors">Features</Link></li>
              <li><Link to="/compare" className="hover:text-[var(--accent-app)] transition-colors">Compare</Link></li>
              <li><Link to="/news" className="hover:text-[var(--accent-app)] transition-colors">AI News</Link></li>
              <li><Link to="/pricing" className="hover:text-[var(--accent-app)] transition-colors">Pricing</Link></li>
              <li><Link to="/app" className="hover:text-[var(--accent-app)] transition-colors">App</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 uppercase text-xs tracking-widest text-[var(--text-secondary)]">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/docs" className="hover:text-[var(--accent-app)] transition-colors">Documentation</Link></li>
              <li><Link to="/blog" className="hover:text-[var(--accent-app)] transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 uppercase text-xs tracking-widest text-[var(--text-secondary)]">Legal & Trust</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/trust-center" className="hover:text-[var(--accent-app)] transition-colors">Trust Center</Link></li>
              <li><Link to="/legal" className="hover:text-[var(--accent-app)] transition-colors">Privacy & Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-[var(--border-app)] text-xs text-[var(--text-secondary)] flex justify-between items-center">
          <p>© {new Date().getFullYear()} iluvai.online framework. All rights reserved.</p>
          <div className="flex gap-4">
             <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest">System Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
