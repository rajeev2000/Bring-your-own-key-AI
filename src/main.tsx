import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import Layout from './pages/Layout.tsx';
import Home from './pages/Home.tsx';
import Compare from './pages/Compare.tsx';
import Features from './pages/Features.tsx';
import Pricing from './pages/Pricing.tsx';
import Docs from './pages/Docs.tsx';
import TrustCenter from './pages/TrustCenter.tsx';
import Blog from './pages/Blog.tsx';
import Legal from './pages/Legal.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/trust-center" element={<TrustCenter />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/legal" element={<Legal />} />
          </Route>
          {/* Chat App remains independent of Layout to keep its full-height interface */}
          <Route path="/app" element={<App />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
