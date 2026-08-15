import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, Clock, Cpu, MessageSquare, Brain, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';

interface InteractiveGazeProps {
  text: string;
  themePreset?: string;
  activeProfileId?: string;
  activeModel?: string;
  sessionCreatedAt?: number;
  messageCount?: number;
}

export const InteractiveGaze: React.FC<InteractiveGazeProps> = ({ text, themePreset, activeProfileId, activeModel, sessionCreatedAt, messageCount = 0 }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [reaction, setReaction] = useState<string | null>(null);
  const [idleState, setIdleState] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uptime, setUptime] = useState(0);
  
  // Dynamic Island States
  const [hoverIsland, setHoverIsland] = useState(false);
  const [recentText, setRecentText] = useState(false);

  const isDark = themePreset === 'dark';
  const hasActiveProfile = Boolean(activeProfileId);
  
  const profileSeed = activeProfileId ? activeProfileId.charCodeAt(0) + activeProfileId.charCodeAt(activeProfileId.length - 1) : 0;
  
  const trackingDuration = hasActiveProfile ? ((profileSeed % 2 === 0) ? 'duration-75' : 'duration-100') : 'duration-150';
  const eyebrowDuration = hasActiveProfile ? 'duration-200' : 'duration-300';
  
  // Base colors adapted for the dark Dynamic Island background
  const pupilBaseColor = hasActiveProfile ? 'bg-[var(--accent-app)]' : 'bg-gray-900';
  const loveColor = '#ef4444'; 

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update uptime counter
  useEffect(() => {
    if (!sessionCreatedAt) return;
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - sessionCreatedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionCreatedAt]);

  // Watch text changes to trigger Island processing state
  useEffect(() => {
    if (text && text.length > 0) {
      setRecentText(true);
      const t = setTimeout(() => setRecentText(false), 3500);
      return () => clearTimeout(t);
    }
  }, [text]);

  // Idle Reminders (Water, Weather, Stretch)
  useEffect(() => {
    const timer = setInterval(() => {
      setIdleState(prev => {
        if (prev) return null;
        if (reaction === 'normal') {
          const rand = Math.random();
          if (rand < 0.33) return 'water';
          if (rand < 0.66) return 'weather';
          return 'stretch';
        }
        return null;
      });
    }, 45000); // trigger every 45s of normal
    return () => clearInterval(timer);
  }, [reaction]);

  useEffect(() => {
    if (idleState) {
      const t = setTimeout(() => setIdleState(null), 5000);
      return () => clearTimeout(t);
    }
  }, [idleState]);

  useEffect(() => {
    setIdleState(null);
    const textLower = text.toLowerCase();
    if (textLower.includes('happy') || text.includes('😊') || text.includes('😀') || text.includes('😄')) {
      setReaction('happy');
    } else if (textLower.includes('sad') || text.includes('😢') || text.includes('😭')) {
      setReaction('sad');
    } else if (textLower.includes('angry') || text.includes('😡') || text.includes('😠')) {
      setReaction('angry');
    } else if (textLower.includes('love') || text.includes('❤️') || text.includes('😍')) {
      setReaction('love');
    } else if (textLower.includes('money') || text.includes('🤑') || text.includes('💰') || text.includes('💵')) {
      setReaction('money');
    } else if (textLower.includes('spider') || text.includes('🕷️') || text.includes('web')) {
      setReaction('spiderman');
    } else if (textLower.includes('batman') || text.includes('🦇') || textLower.includes('gotham')) {
      setReaction('batman');
    } else if (textLower.includes('superman') || text.includes('🦸') || textLower.includes('krypton')) {
      setReaction('superman');
    } else if (textLower.includes('water') || text.includes('drink') || text.includes('💧') || text.includes('🚰')) {
      setReaction('water');
    } else if (textLower.includes('weather') || text.includes('rain') || text.includes('☀️') || text.includes('🌧️') || text.includes('☁️')) {
      setReaction('weather');
    } else if (textLower.includes('time') || text.includes('⏰') || text.includes('⏱️') || text.includes('clock')) {
      setReaction('time');
    } else if (textLower.includes('wow') || text.includes('surprised') || text.includes('😮') || text.includes('😲')) {
      setReaction('surprised');
    } else if (textLower.includes('cool') || text.includes('😎')) {
      setReaction('cool');
    } else if (textLower.includes('think') || text.includes('🤔')) {
      setReaction('thinking');
    } else if (textLower.includes('sleep') || textLower.includes('tired') || textLower.includes('boring') || text.includes('😴') || text.includes('🥱')) {
      setReaction('sleepy');
    } else if (textLower.includes('scared') || textLower.includes('fear') || text.includes('😱') || text.includes('😨') || text.includes('👻')) {
      setReaction('scared');
    } else if (textLower.includes('confused') || textLower.includes('dizzy') || text.includes('😵') || text.includes('😕') || text.includes('💫')) {
      setReaction('confused');
    } else if (textLower.includes('evil') || textLower.includes('mischief') || text.includes('😈') || text.includes('😼')) {
      setReaction('evil');
    } else if (textLower.includes('magic') || textLower.includes('amazing') || text.includes('🤩') || text.includes('✨')) {
      setReaction('starstruck');
    } else if (textLower.includes('smart') || textLower.includes('nerd') || text.includes('🤓') || text.includes('🧠') || text.includes('calculate')) {
      setReaction('smart');
    } else {
      setReaction('normal');
    }
  }, [text]);

  const currentReaction = idleState || reaction;

  // Island State Logic
  let islandState = 'compact';
  let islandText = '';
  let IslandIcon = null;

  if (hoverIsland) {
    islandState = 'hover';
    islandText = activeModel ? `Powered by ${activeModel}` : 'Gaze Diagnostics';
    IslandIcon = <Cpu size={14} className="text-purple-400" />;
  } else if (idleState) {
    islandState = 'idle';
    if (idleState === 'water') { islandText = 'Hydration reminder'; IslandIcon = <span className="text-sm">💧</span>; }
    else if (idleState === 'weather') { islandText = 'Local climate sync'; IslandIcon = <span className="text-sm">☀️</span>; }
    else if (idleState === 'stretch') { islandText = 'Mobility check'; IslandIcon = <span className="text-sm">🧘</span>; }
  } else if (recentText) {
    islandState = 'thought';
    const emotionTextMap: Record<string, string> = {
       happy: 'Optimistic synthesis',
       sad: 'Empathetic analysis',
       angry: 'Intense processing',
       love: 'Positive reinforcement',
       money: 'Financial optimization',
       spiderman: 'Web-scraping data',
       batman: 'Deep investigation',
       superman: 'Rapid processing',
       surprised: 'Fascinating anomaly',
       smart: 'Logical computation',
       sleepy: 'Conserving resources',
       scared: 'Treading carefully',
       confused: 'Recalculating vectors',
       evil: 'Unrestricted mode',
       starstruck: 'High-value insight',
       normal: 'Synthesizing response',
       water: 'Analyzing fluids',
       weather: 'Atmospheric check',
       time: 'Temporal analysis',
       stretch: 'Routine diagnostic'
    };
    islandText = emotionTextMap[reaction || 'normal'] || 'Processing...';
    IslandIcon = <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />;
  }

  const getEyeOffset = (eyeRef: React.RefObject<HTMLDivElement>) => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    const rect = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top + rect.height / 2;
    
    const dx = mousePosition.x - eyeCenterX;
    const dy = mousePosition.y - eyeCenterY;
    const angle = Math.atan2(dy, dx);
    
    const maxDist = hasActiveProfile ? 4.5 : 4;
    const distance = Math.min(maxDist, Math.hypot(dx, dy) / 10);
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);
  
  const leftOffset = getEyeOffset(leftEyeRef);
  const rightOffset = getEyeOffset(rightEyeRef);

  const isGemini = activeModel?.toLowerCase().includes('gemini');
  const isClaude = activeModel?.toLowerCase().includes('claude');
  const isGpt = activeModel?.toLowerCase().includes('gpt');
  const isLlama = activeModel?.toLowerCase().includes('llama');

  let customEyeClasses = `w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center relative overflow-hidden border-[1.5px] border-[#222] shadow-inner transition-all ${eyebrowDuration}`;
  
  if (currentReaction === 'spiderman') {
    customEyeClasses = `w-6 h-6 rounded-full bg-white flex items-center justify-center relative overflow-hidden border-[3px] border-black shadow-sm transition-all ${eyebrowDuration}`;
  } else if (currentReaction === 'batman') {
    customEyeClasses = `w-6 h-6 rounded-full bg-black border-gray-600 flex items-center justify-center relative overflow-hidden border-2 shadow-sm transition-all ${eyebrowDuration}`;
  } else if (currentReaction === 'normal') {
    if (isGemini) customEyeClasses += ' shadow-[0_0_8px_rgba(59,130,246,0.6)] border-blue-400/80';
    if (isClaude) customEyeClasses += ' shadow-[0_0_8px_rgba(249,115,22,0.6)] border-orange-400/80';
    if (isGpt) customEyeClasses += ' shadow-[0_0_8px_rgba(34,197,94,0.6)] border-green-400/80';
    if (isLlama) customEyeClasses += ' shadow-[0_0_8px_rgba(168,85,247,0.6)] border-purple-400/80';
  }

  const pupilModelStyle = (currentReaction === 'normal' || currentReaction === 'thinking') ? {
    boxShadow: isGemini ? '0 0 6px 1px rgba(59,130,246,0.8)' : 
               isClaude ? '0 0 6px 1px rgba(249,115,22,0.8)' : 
               isGpt ? '0 0 6px 1px rgba(34,197,94,0.8)' : 
               isLlama ? '0 0 6px 1px rgba(168,85,247,0.8)' : 'none',
    backgroundColor: (isGemini || isClaude || isGpt || isLlama) ? '#000' : undefined
  } : {};

  let pupilClasses = `w-2.5 h-2.5 rounded-full ${pupilBaseColor} absolute transition-all ${trackingDuration}`;
  let eyebrowClasses = `absolute w-7 h-1.5 rounded-full bg-white transition-all ${eyebrowDuration} z-10`;

  let leftEyebrowStyle: React.CSSProperties = { top: '-6px', left: '-2px', transform: 'rotate(-5deg)' };
  let rightEyebrowStyle: React.CSSProperties = { top: '-6px', right: '-2px', transform: 'rotate(5deg)' };

  if (currentReaction === 'angry') {
    leftEyebrowStyle = { top: '-2px', left: '-2px', transform: 'rotate(20deg)' };
    rightEyebrowStyle = { top: '-2px', right: '-2px', transform: 'rotate(-20deg)' };
  } else if (currentReaction === 'sad') {
    leftEyebrowStyle = { top: '-4px', left: '-2px', transform: 'rotate(-20deg)' };
    rightEyebrowStyle = { top: '-4px', right: '-2px', transform: 'rotate(20deg)' };
  } else if (currentReaction === 'surprised') {
    leftEyebrowStyle = { top: '-10px', left: '-2px', transform: 'rotate(-10deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (currentReaction === 'happy') {
    leftEyebrowStyle = { top: '-8px', left: '-2px', transform: 'rotate(-10deg)' };
    rightEyebrowStyle = { top: '-8px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (currentReaction === 'thinking') {
    leftEyebrowStyle = { top: '-6px', left: '-2px', transform: 'rotate(-5deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(15deg)' };
  } else if (currentReaction === 'money') {
    leftEyebrowStyle = { top: '-10px', left: '-2px', transform: 'rotate(-15deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(15deg)' };
  } else if (currentReaction === 'sleepy') {
    leftEyebrowStyle = { top: '-2px', left: '-2px', transform: 'rotate(5deg)' };
    rightEyebrowStyle = { top: '-2px', right: '-2px', transform: 'rotate(-5deg)' };
  } else if (currentReaction === 'scared') {
    leftEyebrowStyle = { top: '-14px', left: '-2px', transform: 'rotate(-15deg)' };
    rightEyebrowStyle = { top: '-14px', right: '-2px', transform: 'rotate(15deg)' };
  } else if (currentReaction === 'confused') {
    leftEyebrowStyle = { top: '-4px', left: '-2px', transform: 'rotate(-20deg)' };
    rightEyebrowStyle = { top: '-12px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (currentReaction === 'evil') {
    leftEyebrowStyle = { top: '-2px', left: '-2px', transform: 'rotate(25deg)' };
    rightEyebrowStyle = { top: '-2px', right: '-2px', transform: 'rotate(-25deg)' };
  } else if (currentReaction === 'starstruck') {
    leftEyebrowStyle = { top: '-12px', left: '-2px', transform: 'rotate(-10deg)' };
    rightEyebrowStyle = { top: '-12px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (currentReaction === 'smart') {
    leftEyebrowStyle = { top: '-8px', left: '-2px', transform: 'rotate(0deg)' };
    rightEyebrowStyle = { top: '-8px', right: '-2px', transform: 'rotate(0deg)' };
  } else if (currentReaction === 'spiderman') {
    leftEyebrowStyle = { top: '-12px', left: '-4px', transform: 'rotate(-35deg)', width: '32px', height: '14px', backgroundColor: '#000', borderRadius: '0' };
    rightEyebrowStyle = { top: '-12px', right: '-4px', transform: 'rotate(35deg)', width: '32px', height: '14px', backgroundColor: '#000', borderRadius: '0' };
  } else if (currentReaction === 'batman') {
    leftEyebrowStyle = { top: '-18px', left: '2px', transform: 'rotate(0deg)', width: '8px', height: '18px', backgroundColor: '#fff', borderRadius: '4px 8px 0 0' };
    rightEyebrowStyle = { top: '-18px', right: '2px', transform: 'rotate(0deg)', width: '8px', height: '18px', backgroundColor: '#fff', borderRadius: '8px 4px 0 0' };
  } else if (currentReaction === 'superman') {
    leftEyebrowStyle = { top: '-4px', left: '-2px', transform: 'rotate(20deg)' };
    rightEyebrowStyle = { top: '-4px', right: '-2px', transform: 'rotate(-20deg)' };
  } else if (currentReaction === 'water') {
    leftEyebrowStyle = { top: '-10px', left: '-2px', transform: 'rotate(-10deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (currentReaction === 'weather') {
    leftEyebrowStyle = { top: '-10px', left: '-2px', transform: 'rotate(-5deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(5deg)' };
  } else if (currentReaction === 'time' || currentReaction === 'stretch') {
    leftEyebrowStyle = { top: '-8px', left: '-2px', transform: 'rotate(0deg)' };
    rightEyebrowStyle = { top: '-8px', right: '-2px', transform: 'rotate(0deg)' };
  }

  const getPupilStyles = (offset: {x: number, y: number}) => ({
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    ...pupilModelStyle,
    ...(currentReaction === 'love' ? { backgroundColor: loveColor, clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', width: '12px', height: '12px', borderRadius: '0' } : {}),
    ...(currentReaction === 'money' ? { backgroundColor: '#22c55e', width: '12px', height: '12px', borderRadius: '4px' } : {}),
    ...(currentReaction === 'evil' ? { backgroundColor: loveColor, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', width: '8px', height: '14px', borderRadius: '0' } : {}),
    ...(currentReaction === 'starstruck' ? { backgroundColor: '#fbbf24', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', width: '14px', height: '14px', borderRadius: '0' } : {}),
    ...(currentReaction === 'scared' ? { width: '4px', height: '4px' } : {}),
    ...(currentReaction === 'confused' ? { width: '8px', height: '8px' } : {}),
    ...(currentReaction === 'spiderman' ? { width: '0', height: '0', backgroundColor: 'transparent' } : {}),
    ...(currentReaction === 'batman' ? { width: '10px', height: '6px', borderRadius: '4px 4px 0 0', backgroundColor: '#fff', clipPath: 'none' } : {}),
    ...(currentReaction === 'superman' ? { backgroundColor: '#ef4444', boxShadow: '0 0 10px 3px #ef4444', width: '8px', height: '8px' } : {}),
    ...(currentReaction === 'water' ? { backgroundColor: '#3b82f6', clipPath: 'polygon(50% 0%, 100% 60%, 80% 100%, 20% 100%, 0% 60%)', width: '10px', height: '12px', borderRadius: '0' } : {}),
    ...(currentReaction === 'weather' ? { backgroundColor: '#fbbf24', border: '2px solid #f59e0b', width: '10px', height: '10px', borderRadius: '50%' } : {}),
    ...(currentReaction === 'time' ? { backgroundColor: 'transparent', borderTop: '4px solid #000', borderRight: '4px solid transparent', borderLeft: '4px solid transparent', width: '0', height: '10px', borderRadius: '0' } : {}),
    ...(currentReaction === 'stretch' ? { width: '14px', height: '3px', borderRadius: '2px' } : {})
  });

  const getEmotionStats = (r: string | null) => {
    switch(r) {
      case 'happy': return [{ label: 'Joy', value: 92, color: 'bg-green-500' }, { label: 'Excitement', value: 78, color: 'bg-emerald-400' }, { label: 'Stress', value: 4, color: 'bg-red-400' }];
      case 'sad': return [{ label: 'Sorrow', value: 85, color: 'bg-blue-600' }, { label: 'Fatigue', value: 60, color: 'bg-blue-400' }, { label: 'Joy', value: 12, color: 'bg-yellow-400' }];
      case 'angry': return [{ label: 'Hostility', value: 95, color: 'bg-red-600' }, { label: 'Frustration', value: 88, color: 'bg-orange-500' }, { label: 'Calm', value: 5, color: 'bg-teal-400' }];
      case 'love': return [{ label: 'Affection', value: 99, color: 'bg-pink-500' }, { label: 'Warmth', value: 90, color: 'bg-rose-400' }, { label: 'Indifference', value: 1, color: 'bg-gray-400' }];
      case 'scared': return [{ label: 'Anxiety', value: 89, color: 'bg-purple-600' }, { label: 'Fear', value: 95, color: 'bg-indigo-500' }, { label: 'Courage', value: 8, color: 'bg-amber-400' }];
      case 'sleepy': return [{ label: 'Fatigue', value: 96, color: 'bg-blue-300' }, { label: 'Boredom', value: 82, color: 'bg-slate-400' }, { label: 'Energy', value: 10, color: 'bg-yellow-500' }];
      case 'smart': return [{ label: 'Logic', value: 98, color: 'bg-indigo-600' }, { label: 'Analysis', value: 92, color: 'bg-cyan-500' }, { label: 'Emotion', value: 15, color: 'bg-pink-400' }];
      default: return [{ label: 'Neutrality', value: 98, color: 'bg-gray-400' }, { label: 'Focus', value: 75, color: 'bg-blue-400' }, { label: 'Stress', value: 10, color: 'bg-red-400' }];
    }
  };

  const emotionStats = getEmotionStats(reaction);
  const timeFormatted = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;

  return (
    <>
      {/* Dynamic Island Container */}
      <motion.div 
        layout
        initial={{ borderRadius: 32 }}
        className="flex items-center relative mt-1 mx-auto cursor-pointer bg-[#0a0a0a] border border-white/10 shadow-xl overflow-hidden h-[42px] max-w-[80vw]"
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => setHoverIsland(true)}
        onMouseLeave={() => setHoverIsland(false)}
        title="Click to view diagnostics"
        style={{ borderRadius: 32 }}
      >
        {currentReaction === 'smart' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-[1.5px] bg-white z-20 mt-1 pointer-events-none"></div>
        )}
        
        {/* Eyes Section */}
        <motion.div layout className="flex items-center gap-1.5 px-3 py-2 z-20 relative shrink-0">
          {/* Left Eye */}
          <div className="relative">
            <div style={leftEyebrowStyle} className={eyebrowClasses} />
            <div ref={leftEyeRef} className={customEyeClasses}>
              <div 
                className={`${pupilClasses} flex items-center justify-center ${currentReaction === 'time' ? 'animate-[spin_3s_linear_infinite]' : ''}`}
                style={getPupilStyles(leftOffset)} 
              >
                {currentReaction === 'money' && <span className="text-[9px] font-bold text-white leading-none -mt-[0.5px]">$</span>}
              </div>
              {currentReaction === 'sleepy' && (
                 <div className="absolute top-0 w-full h-3 border-b-2 border-black z-10 bg-gray-100"></div>
              )}
              {currentReaction === 'smart' && (
                 <div className="absolute inset-0 border-[1.5px] border-black/80 rounded-full z-10 scale-[1.15]"></div>
              )}
              {currentReaction === 'happy' && (
                 <div className="absolute top-1 w-4 h-1.5 bg-white rounded-full opacity-80"></div>
              )}
              {currentReaction === 'sad' && (
                 <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              )}
              {currentReaction === 'cool' && (
                 <div className="absolute top-0 w-8 h-3 bg-black z-10 -rotate-12 transform scale-110"></div>
              )}
            </div>
          </div>
          
          {/* Right Eye */}
          <div className="relative">
            <div style={rightEyebrowStyle} className={eyebrowClasses} />
            <div ref={rightEyeRef} className={customEyeClasses}>
              <div 
                className={`${pupilClasses} flex items-center justify-center ${currentReaction === 'time' ? 'animate-[spin_3s_linear_infinite]' : ''}`}
                style={getPupilStyles(rightOffset)} 
              >
                {currentReaction === 'money' && <span className="text-[9px] font-bold text-white leading-none -mt-[0.5px]">$</span>}
              </div>
              {currentReaction === 'sleepy' && (
                 <div className="absolute top-0 w-full h-3 border-b-2 border-black z-10 bg-gray-100"></div>
              )}
              {currentReaction === 'smart' && (
                 <div className="absolute inset-0 border-[1.5px] border-black/80 rounded-full z-10 scale-[1.15]"></div>
              )}
              {currentReaction === 'happy' && (
                 <div className="absolute top-1 w-4 h-1.5 bg-white rounded-full opacity-80"></div>
              )}
              {currentReaction === 'cool' && (
                 <div className="absolute top-0 w-8 h-3 bg-black z-10 -rotate-12 transform scale-110"></div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Dynamic Island Text Content */}
        <AnimatePresence mode="wait">
          {islandState !== 'compact' && (
            <motion.div
              key="island-text"
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              className="overflow-hidden whitespace-nowrap flex items-center h-full"
            >
              <div className="pr-4 pl-1 flex items-center gap-2 text-white/90 text-xs sm:text-sm font-medium tracking-wide">
                {IslandIcon}
                <span>{islandText}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Expanded Overlay Modal */}
      {isExpanded && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-black/60 backdrop-blur-sm"
             onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[var(--card-app)] border border-[var(--border-app)] rounded-3xl p-6 shadow-2xl w-full max-w-sm flex flex-col gap-6 text-[var(--text-app)] z-[101] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[var(--border-app)] pb-4">
               <h3 className="font-bold tracking-tight text-lg flex items-center gap-2">
                  <Activity size={20} className="text-[var(--accent-app)]" />
                  Gaze Diagnostics
               </h3>
               <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-1.5 hover:bg-[var(--border-app)] rounded-full transition-colors">
                 <X size={18} />
               </button>
            </div>

            {/* Current State & Stats */}
            <div className="space-y-6">
              
              {/* Emotion Tracking */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--text-secondary)]">
                  <Brain size={16} />
                  <span>Emotional Intelligence</span>
                  <span className="ml-auto capitalize px-2 py-0.5 bg-[var(--border-app)] rounded-full text-xs font-bold text-[var(--text-app)]">
                    {reaction || 'Normal'}
                  </span>
                </div>
                <div className="space-y-3">
                  {emotionStats.map((stat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{stat.label}</span>
                        <span>{stat.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--border-app)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.value}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          className={`h-full ${stat.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data & Usage Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-4 flex flex-col gap-1">
                  <Cpu size={18} className="text-purple-500 mb-1" />
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Active Model</span>
                  <span className="text-sm font-medium truncate" title={activeModel || 'Default Model'}>{activeModel || 'Auto'}</span>
                </div>
                <div className="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-4 flex flex-col gap-1">
                  <Clock size={18} className="text-blue-500 mb-1" />
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Session Time</span>
                  <span className="text-sm font-medium">{sessionCreatedAt ? timeFormatted : '0m 0s'}</span>
                </div>
                <div className="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-4 flex flex-col gap-1">
                  <MessageSquare size={18} className="text-green-500 mb-1" />
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Total Messages</span>
                  <span className="text-sm font-medium">{messageCount}</span>
                </div>
                <div className="bg-[var(--bg-app)] border border-[var(--border-app)] rounded-2xl p-4 flex flex-col gap-1">
                  <Activity size={18} className="text-orange-500 mb-1" />
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Data Payload</span>
                  <span className="text-sm font-medium">{text.length} chars</span>
                </div>
              </div>

            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};
