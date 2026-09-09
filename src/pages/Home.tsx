import { Link } from 'react-router-dom';
import { Shield, Zap, Key, Server, Database, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';

export default function Home() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Bring Your Own Key (BYOK) AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "BYOK allows you to use your own API keys from providers like OpenAI and Anthropic to access AI models directly without paying a monthly subscription markup."
        }
      },
      {
         "@type": "Question",
         "name": "Are my API keys safe?",
         "acceptedAnswer": {
           "@type": "Answer",
           "text": "Yes, your keys are stored locally in your browser's local sandbox. They are never sent to our servers."
         }
      }
    ]
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "LUX AI Aggregator",
    "operatingSystem": "Web",
    "applicationCategory": "UtilitiesApplication",
    "description": "Ultra-premium BYOK AI Aggregator. Access GPT-4o, Claude 3.5, and Gemini 3.1 directly via developer APIs at wholesale rates.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "LUX",
    "url": "https://iluvai.online/",
    "logo": "https://iluvai.online/app-interface.png",
    "sameAs": [
      "https://twitter.com/iluvai",
      "https://github.com/iluvai"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "LUX AI",
    "url": "https://iluvai.online/"
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center">
      <Helmet>
        <title>LUX: Ultra-Premium BYOK AI Aggregator | Direct API Access</title>
        <meta name="description" content="Bring your own API key to LUX. Access GPT-4o, Claude 3.5, and Gemini 3.1 directly via developer APIs at wholesale transaction rates." />
        <link rel="canonical" href="https://iluvai.online/" />
        <meta property="og:title" content="LUX: Ultra-Premium BYOK AI Aggregator" />
        <meta property="og:description" content="Access top AI models directly via developer APIs. Absolute local-first privacy where your keys never leave your browser." />
        <meta property="og:url" content="https://iluvai.online/" />
        <meta name="twitter:title" content="LUX: Ultra-Premium BYOK AI Aggregator" />
        <meta name="twitter:description" content="Stop paying full-priced consumer subscriptions and access top AI models directly." />
      </Helmet>
      {/* JSON-LD for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />

      {/* Answer Capsule (TL;DR) */}
      <div className="text-sm bg-[var(--card-app)] border border-[var(--border-app)] p-4 rounded-lg mb-8 max-w-4xl w-full" aria-label="TL;DR Summary">
        <strong>TL;DR:</strong> <em>iluvai.online (LUX) is an ultra-premium AI aggregator utilizing a Bring Your Own Key (BYOK) architecture. Stop paying full-priced consumer subscriptions and access GPT-4o, Claude 3.5, and Gemini 3.1 directly via developer APIs at wholesale transaction rates. Enjoy absolute local-first privacy where your keys and data never leave your browser.</em>
      </div>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-4xl mb-16"
      >
        <span className="px-4 py-1.5 rounded-full border border-[var(--border-app)] text-xs font-bold uppercase tracking-widest text-[var(--accent-app)] bg-[var(--card-app)] inline-block">
          The Ultimate Premium AI Aggregator
        </span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight">
          Bring Your Own API Key.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-500 to-[var(--text-app)]">Command the Models Directly.</span>
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
          Welcome to the future of interaction. iluvai is a top-tier BYOK AI interface designed for power users, developers, and businesses seeking wholesale AI rates and uncompromised private LLM access. Stop paying inflated consumer subscription fees and start interacting directly with the most advanced models on the planet.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-8">
          <Link to="/app" className="bg-[var(--accent-app)] text-[var(--bg-app)] px-8 py-4 text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-all transform hover:-translate-y-1 shadow-xl">
            Launch Platform
          </Link>
          <Link to="/features" className="bg-[var(--card-app)] border border-[var(--border-app)] text-[var(--text-app)] px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-[var(--border-app)] transition-all">
             View Features
          </Link>
        </div>
      </motion.div>

      {/* Hero Image / Audit Target */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-6xl mb-24 rounded-lg overflow-hidden border border-[var(--border-app)] shadow-2xl relative"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-app)] to-transparent z-10 opacity-60 pointer-events-none"></div>
        <img 
          src="/app-interface.png" 
          alt="LUX AI Secure API Management Interface" 
          className="w-full h-auto object-cover aspect-video mix-blend-screen opacity-90"
        />
      </motion.div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-32">
        <div className="p-8 border border-[var(--border-app)] bg-[var(--card-app)] text-left hover:border-[var(--accent-app)] transition-colors group">
          <Key className="w-10 h-10 mb-6 text-[var(--accent-app)] group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">Direct API Access</h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">Control your own cost and limits. Use your API keys to bypass consumer chat rate limits. You talk directly to the provider endpoints, ensuring absolute minimum latency.</p>
        </div>
        <div className="p-8 border border-[var(--border-app)] bg-[var(--card-app)] text-left hover:border-[var(--accent-app)] transition-colors group">
          <Zap className="w-10 h-10 mb-6 text-[var(--accent-app)] group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">Wholesale AI Rates</h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">Stop paying $20/month for locked-down consumer UI. By utilizing a BYOK AI interface, you only pay exactly for what you use at wholesale transaction costs.</p>
        </div>
        <div className="p-8 border border-[var(--border-app)] bg-[var(--card-app)] text-left hover:border-[var(--accent-app)] transition-colors group">
          <Shield className="w-10 h-10 mb-6 text-[var(--accent-app)] group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">Private LLM Access</h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">Your keys and chats are stored locally in your browser. We offer absolute true client-side security architecture without the privacy-invading data collection seen on other platforms.</p>
        </div>
      </div>

      {/* Deep Dive Copy Content */}
      <div className="max-w-4xl text-left space-y-12 prose prose-invert">
        <h2 className="text-3xl font-bold tracking-tight mb-6">Why Choose a Premium AI Aggregator?</h2>
        
        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
          The landscape of Artificial Intelligence is evolving at unprecedented speed. Users are often forced into walled gardens—paying flat subscription fees for a single model or family of models, subjected to arbitrary rate limits, and restricted by platforms that harvest conversational data to train future models. We built iluvai.online to break those walls down. As a premium AI aggregator, we provide a unified, ultra-fast interface that connects you directly to the top players in the industry: OpenAI, Anthropic, Google, Groq, and even local endpoints like Ollama. 
        </p>

        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
          The core innovation of our platform is the <strong>BYOK AI interface</strong> (Bring Your Own Key). This architecture transfers the power of cost management and access control entirely to the user. Instead of being locked into a $20 or $30 monthly tier that limits your prompt capability during peak hours, you plug your securely generated developer API keys straight into our interface. This means you interact with the models via their developer endpoints—bypassing consumer throttles entirely. 
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
           <div className="flex flex-col gap-3">
             <Server className="w-8 h-8 text-[var(--accent-app)]" />
             <h4 className="font-bold text-xl">Wholesale AI Rates</h4>
             <p className="text-sm text-[var(--text-secondary)]">By paying for tokens rather than subscriptions, light users save money while heavy developers get limitless scaling. Enjoy the lowest possible prices offered directly by providers.</p>
           </div>
           <div className="flex flex-col gap-3">
             <Lock className="w-8 h-8 text-[var(--accent-app)]" />
             <h4 className="font-bold text-xl">Uncompromised Private LLM Access</h4>
             <p className="text-sm text-[var(--text-secondary)]">Your keys are heavily guarded, confined only to your local storage. We have no backend databases storing your conversations. Complete sovereign privacy.</p>
           </div>
        </div>

        <h3 className="text-2xl font-bold tracking-tight mb-4">A Zero-Compromise Experience</h3>
        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
          Beyond simply routing messages, iluvai is designed to be an ultra-premium workspace. We offer local context memory, dynamic message routing, visualization charting, and multi-modal handling. When you use iluvai.online, you aren't just using an app—you are hosting a fully responsive, enterprise-grade AI terminal inside your own local instance. Experience the speed, the data ownership, and the absolute freedom of the ultimate AI terminal today.
        </p>
      </div>
    </div>
  );
}
