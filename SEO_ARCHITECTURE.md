# Technical SEO & Content Architecture Report

## 1. Technical Infrastructure & Crawlability
- **Discovery Files**: `robots.txt` and `sitemap.xml` have been generated and deployed in the `/public` directory. They protect the `/app` subdirectory from indexing while explicitly allowing AI web crawlers (`GPTBot`, `PerplexityBot`) and search engines to index the landing pages, docs, blog, and trust center.
- **Route Architecture**: Client-side routing has been established using a Pillar and Cluster model for `/features`, `/pricing`, `/docs`, `/blog`, and `/trust-center`.
- **Global Navigation**: Header and footer have been integrated across SEO-relevant routes, isolating the core chat application at `/app` for maximum performance and full-screen layout.

## 2. Server-Side Rendering (SSR) Suggestion
Currently, the application is bundled using **Vite** (Client-Side Rendering). This provides a great app experience but can introduce "client-side jank" or indexing delays for search engine bots evaluating the marketing pages.

### Migration Path to Next.js (Recommended for Scale)
To ensure optimal SEO performance, we suggest migrating the marketing layers to **Next.js (App Router)**:
1. **Next.js Pages**: Use React Server Components for `/app/page.tsx` (Home), `/app/pricing/page.tsx`, etc., ensuring zero-JS HTML is delivered to Googlebot.
2. **Next.js API Routes**: (Not strictly necessary for BYOK, but useful for edge computing).
3. **App Isolation**: The core chat client (`/app`) can be moved into a "use client" boundary within Next.js or remain as a standalone Vite app served on a separate subdomain (e.g., `app.iluvai.online`), keeping the main domain pure SSR.

## 3. SEO Content Strategy (Pillar and Cluster Model)
- **Pillar**: Home page targeting "BYOK AI Interface" & "Ultra-Premium AI".
- **Clusters**:
  - **Trust Center**: Explains local storage, keys security, and privacy (targets "Private AI Chat").
  - **Features**: Covers local context memory, model routing, etc. (targets "GPT-4 Client", "Gemini 3.1 BYOK").
  - **Docs**: Explains how to integrate API keys.

By ensuring HTML renders before JavaScript execution, you maximize Crawl Budget and Core Web Vitals (LCP, CLS, INP).
