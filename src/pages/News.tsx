import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Clock, Share2, Bookmark, BookmarkCheck, TrendingUp, Zap, Server, Cpu, Lightbulb, Rocket, Filter } from 'lucide-react';

// Define our types
interface Article {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string;
  source: string;
  category: string;
  description: string;
  readingTime: number;
}

// Feeds to fetch
const FEEDS = [
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch', defaultCategory: 'Startups' },
  { url: 'https://www.artificialintelligence-news.com/feed/', source: 'AI News', defaultCategory: 'Latest' },
];

const CATEGORIES = ['Latest', 'Trending', 'LLMs', 'Robotics', 'Chips', 'Startups', 'Research'];

// Helper to estimate reading time
const estimateReadingTime = (text: string) => {
  const words = text.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

// Helper to strip HTML for snippets
const stripHtml = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Fallback articles just in case feeds fail or rate limit
const FALLBACK_ARTICLES: Article[] = [
  {
    id: 'fb1',
    title: 'OpenAI announces groundbreaking new frontier model capabilities',
    link: '#',
    pubDate: new Date().toISOString(),
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    source: 'Tech Insider',
    category: 'LLMs',
    description: 'The latest iteration of generative models showcases unprecedented reasoning abilities across complex STEM domains, pushing the boundaries of artificial general intelligence.',
    readingTime: 4
  },
  {
    id: 'fb2',
    title: 'Nvidia unveils next-generation AI accelerators with 4x memory bandwidth',
    link: '#',
    pubDate: new Date(Date.now() - 3600000).toISOString(),
    thumbnail: 'https://images.unsplash.com/photo-1591405351990-4726e331f264?auto=format&fit=crop&q=80&w=800',
    source: 'Hardware Weekly',
    category: 'Chips',
    description: 'Aiming to solve the memory wall, the new architecture delivers massive scaling capabilities for training trillion-parameter models efficiently.',
    readingTime: 6
  },
  {
    id: 'fb3',
    title: 'New robotics startup raises $200M to build humanoid foundation models',
    link: '#',
    pubDate: new Date(Date.now() - 7200000).toISOString(),
    thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
    source: 'Venture Beat',
    category: 'Robotics',
    description: 'Investors are doubling down on physical AI as a major player exits stealth with a novel approach to robotic learning and spatial intelligence.',
    readingTime: 3
  }
];

export default function News() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Latest');
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(12);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = async (article: Article, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: article.link,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(article.link);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        let allArticles: Article[] = [];
        
        // Fetch from rss2json
        const promises = FEEDS.map(async (feed) => {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          if (data.status === 'ok') {
            return data.items.map((item: any) => ({
              id: item.guid || item.link,
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              thumbnail: item.thumbnail || item.enclosure?.link,
              source: feed.source,
              category: determineCategory(item.title, item.categories, feed.defaultCategory),
              description: stripHtml(item.description).substring(0, 150) + '...',
              readingTime: estimateReadingTime(item.description || item.content || '')
            }));
          }
          return [];
        });

        const results = await Promise.allSettled(promises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            allArticles = [...allArticles, ...result.value];
          }
        });

        // Ensure thumbnails are mostly present
        allArticles = allArticles.map(a => ({
          ...a,
          thumbnail: a.thumbnail || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800'
        }));

        // Sort by date descending
        allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        // Deduplicate by title similarity or strict IDs
        const uniqueArticles = Array.from(new Map(allArticles.map(item => [item.title, item])).values());

        if (uniqueArticles.length > 0) {
          setArticles(uniqueArticles);
        } else {
          setArticles(FALLBACK_ARTICLES);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
        setArticles(FALLBACK_ARTICLES);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Helper to categorize based on keywords
  const determineCategory = (title: string, tags: string[] = [], defaultCat: string) => {
    const t = title.toLowerCase();
    const tagString = tags.join(' ').toLowerCase();
    const combined = t + ' ' + tagString;
    
    if (combined.includes('llm') || combined.includes('gpt') || combined.includes('claude') || combined.includes('model')) return 'LLMs';
    if (combined.includes('robot') || combined.includes('boston dynamics') || combined.includes('humanoid')) return 'Robotics';
    if (combined.includes('chip') || combined.includes('nvidia') || combined.includes('amd') || combined.includes('gpu')) return 'Chips';
    if (combined.includes('startup') || combined.includes('fund') || combined.includes('raise')) return 'Startups';
    if (combined.includes('research') || combined.includes('paper') || combined.includes('mit') || combined.includes('stanford')) return 'Research';
    return defaultCat;
  };

  const filteredArticles = useMemo(() => {
    if (activeCategory === 'Latest') return articles;
    if (activeCategory === 'Trending') return articles.slice(0, 10); // Mock trending
    return articles.filter(a => a.category === activeCategory);
  }, [articles, activeCategory]);

  const displayedArticles = filteredArticles.slice(0, visibleCount);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'LLMs': return <Server size={14} />;
      case 'Robotics': return <Filter size={14} />;
      case 'Chips': return <Cpu size={14} />;
      case 'Startups': return <Rocket size={14} />;
      case 'Research': return <Lightbulb size={14} />;
      case 'Trending': return <TrendingUp size={14} />;
      default: return <Zap size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-app)]">
      <Helmet>
        <title>Breaking AI News | Latest LLMs, Robotics & Tech Updates | LUX</title>
        <meta name="description" content="Stay ahead with real-time AI news. Live updates on LLMs, generative AI, chips, robotics, and startup funding. High-signal, dopamine-driven tech journalism." />
        <link rel="canonical" href="https://www.iluvai.online/news" />
        <meta property="og:title" content="Breaking AI News | LUX" />
        <meta property="og:description" content="Real-time AI news. Live updates on LLMs, generative AI, chips, robotics, and startup funding." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="alternate" type="application/rss+xml" title="Breaking AI News | LUX RSS Feed" href="https://iluvai.online/news-feed.xml" />
      </Helmet>

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Breaking AI News",
        "description": "Latest updates in Artificial Intelligence, LLMs, and Robotics.",
        "url": "https://www.iluvai.online/news"
      })}} />

      {/* Ticker Tape */}
      <div className="w-full bg-[var(--accent-app)] text-[var(--bg-app)] overflow-hidden h-8 flex items-center border-b border-[var(--border-app)]">
        <motion.div 
          animate={{ x: [0, -1000] }} 
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          className="whitespace-nowrap flex gap-8 items-center text-xs font-bold uppercase tracking-widest px-4"
        >
          {articles.slice(0, 5).map((a, i) => (
            <div key={`ticker-${i}`} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {a.title}
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {articles.slice(0, 5).map((a, i) => (
            <div key={`ticker-dup-${i}`} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {a.title}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-[var(--text-secondary)]">
            AI Pulse
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl border-l-4 border-[var(--accent-app)] pl-4">
            The high-signal feed. Live updates from the frontier of artificial intelligence, computing, and automation.
          </p>
        </div>

        {/* Sticky Filters */}
        <div className="sticky top-16 z-30 bg-[var(--bg-app)]/90 backdrop-blur-md py-4 mb-8 border-b border-[var(--border-app)] flex overflow-x-auto hide-scrollbar gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setVisibleCount(12); }}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                activeCategory === cat 
                  ? 'bg-[var(--text-app)] text-[var(--bg-app)]' 
                  : 'bg-[var(--card-app)] text-[var(--text-secondary)] border border-[var(--border-app)] hover:border-[var(--accent-app)] hover:text-[var(--text-app)]'
              }`}
            >
              {getCategoryIcon(cat)}
              {cat}
            </button>
          ))}
        </div>

        {/* Grid Feed */}
        {loading && articles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="animate-pulse bg-[var(--card-app)] rounded-xl border border-[var(--border-app)] h-96"></div>
            ))}
          </div>
        ) : (
          <>
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {displayedArticles.map((article, idx) => (
                  <motion.a
                    key={article.id}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="group flex flex-col bg-[var(--card-app)] border border-[var(--border-app)] rounded-xl overflow-hidden hover:border-[var(--accent-app)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:-translate-y-1 relative"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-48 w-full overflow-hidden bg-gray-900">
                      <img 
                        src={article.thumbnail} 
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                        loading="lazy"
                      />
                      <div className="absolute top-4 left-4 bg-[var(--bg-app)]/80 backdrop-blur-md px-3 py-1 rounded-full border border-[var(--border-app)] text-xs font-bold tracking-widest uppercase flex items-center gap-1">
                        {getCategoryIcon(article.category)} {article.category}
                      </div>
                      <button 
                        onClick={(e) => toggleBookmark(article.id, e)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-[var(--bg-app)]/80 backdrop-blur-md border border-[var(--border-app)] hover:text-[var(--accent-app)] transition-colors z-10"
                        aria-label="Bookmark"
                      >
                        {bookmarks.has(article.id) ? <BookmarkCheck size={16} className="text-[var(--accent-app)]"/> : <Bookmark size={16} />}
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-3 font-mono">
                        <span className="text-[var(--accent-app)] font-bold">{article.source}</span>
                        <span>•</span>
                        <span>{new Date(article.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
                      </div>
                      
                      <h2 className="text-xl font-bold leading-snug mb-3 group-hover:text-[var(--accent-app)] transition-colors line-clamp-3">
                        {article.title}
                      </h2>
                      
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-6 flex-1">
                        {article.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--border-app)]/50 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} /> {article.readingTime} min read
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => handleShare(article, e)}
                            className="hover:text-[var(--text-app)] transition-colors"
                            aria-label="Share"
                          >
                            <Share2 size={16} />
                          </button>
                          <ExternalLink size={16} className="text-[var(--accent-app)] opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </div>
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </motion.div>
            
            {/* Load More */}
            {visibleCount < filteredArticles.length && (
              <div className="mt-12 flex justify-center">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="px-8 py-3 rounded-full border border-[var(--border-app)] bg-[var(--card-app)] text-sm font-bold uppercase tracking-widest hover:border-[var(--accent-app)] hover:text-[var(--accent-app)] text-[var(--text-app)] transition-all"
                >
                  Load More Stories
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
