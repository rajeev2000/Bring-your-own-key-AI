import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';

interface InteractiveGazeProps {
  text: string;
  themePreset?: string;
  activeProfileId?: string;
}

export const InteractiveGaze: React.FC<InteractiveGazeProps> = ({ text, themePreset, activeProfileId }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Emojis mapping for reactions
  const [reaction, setReaction] = useState<string | null>(null);

  // Dynamic visual parameters based on props
  const isDark = themePreset === 'dark';
  const hasActiveProfile = Boolean(activeProfileId);
  
  // Pseudo-random seed from profile ID to vary animation slightly
  const profileSeed = activeProfileId ? activeProfileId.charCodeAt(0) + activeProfileId.charCodeAt(activeProfileId.length - 1) : 0;
  
  // Visual Weight
  const borderWidth = isDark ? 'border-[1.5px]' : 'border-2';
  const shadowIntensity = isDark ? 'shadow-none' : 'shadow-sm';
  const opacity = isDark ? 'opacity-90' : 'opacity-100';
  
  // Color Intensity
  const scleraColor = isDark ? 'bg-gray-200' : 'bg-white';
  const pupilBaseColor = hasActiveProfile 
    ? 'bg-[var(--accent-app)]' 
    : (isDark ? 'bg-gray-800' : 'bg-gray-900');
  const loveColor = isDark ? '#f87171' : '#ef4444'; // Adjusted red for contrast
  
  // Animation Speed
  const trackingDuration = hasActiveProfile ? ((profileSeed % 2 === 0) ? 'duration-75' : 'duration-100') : 'duration-150';
  const eyebrowDuration = hasActiveProfile ? 'duration-200' : 'duration-300';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // Detect emojis and words
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
    } else if (textLower.includes('wow') || text.includes('surprised') || text.includes('😮') || text.includes('😲')) {
      setReaction('surprised');
    } else if (textLower.includes('cool') || text.includes('😎')) {
      setReaction('cool');
    } else if (textLower.includes('think') || text.includes('🤔')) {
      setReaction('thinking');
    } else {
      setReaction('normal');
    }
  }, [text]);

  const getEyeOffset = (eyeRef: React.RefObject<HTMLDivElement>) => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    const rect = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top + rect.height / 2;
    
    const dx = mousePosition.x - eyeCenterX;
    const dy = mousePosition.y - eyeCenterY;
    const angle = Math.atan2(dy, dx);
    
    // Max distance pupil can move (slightly larger if active profile)
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

  let eyeClasses = `w-6 h-6 rounded-full ${scleraColor} flex items-center justify-center relative overflow-hidden ${borderWidth} border-[var(--text-app)] ${shadowIntensity} ${opacity} transition-colors ${eyebrowDuration}`;
  let pupilClasses = `w-2.5 h-2.5 rounded-full ${pupilBaseColor} absolute transition-all ${trackingDuration}`;
  let eyebrowClasses = `absolute w-7 h-1.5 rounded-full bg-[var(--text-app)] transition-all ${eyebrowDuration} z-10`;

  let leftEyebrowStyle: React.CSSProperties = { top: '-6px', left: '-2px', transform: 'rotate(-5deg)' };
  let rightEyebrowStyle: React.CSSProperties = { top: '-6px', right: '-2px', transform: 'rotate(5deg)' };

  if (reaction === 'angry') {
    leftEyebrowStyle = { top: '-2px', left: '-2px', transform: 'rotate(20deg)' };
    rightEyebrowStyle = { top: '-2px', right: '-2px', transform: 'rotate(-20deg)' };
  } else if (reaction === 'sad') {
    leftEyebrowStyle = { top: '-4px', left: '-2px', transform: 'rotate(-20deg)' };
    rightEyebrowStyle = { top: '-4px', right: '-2px', transform: 'rotate(20deg)' };
  } else if (reaction === 'surprised') {
    leftEyebrowStyle = { top: '-10px', left: '-2px', transform: 'rotate(-10deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (reaction === 'happy') {
    leftEyebrowStyle = { top: '-8px', left: '-2px', transform: 'rotate(-10deg)' };
    rightEyebrowStyle = { top: '-8px', right: '-2px', transform: 'rotate(10deg)' };
  } else if (reaction === 'thinking') {
    leftEyebrowStyle = { top: '-6px', left: '-2px', transform: 'rotate(-5deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(15deg)' };
  } else if (reaction === 'money') {
    leftEyebrowStyle = { top: '-10px', left: '-2px', transform: 'rotate(-15deg)' };
    rightEyebrowStyle = { top: '-10px', right: '-2px', transform: 'rotate(15deg)' };
  }

  return (
    <div className="flex items-center gap-2 relative mt-2 pt-2 px-1" ref={containerRef} title={reaction || 'normal'}>
      {/* Left Eye */}
      <div className="relative">
        <div style={leftEyebrowStyle} className={eyebrowClasses} />
        <div ref={leftEyeRef} className={eyeClasses}>
          <div 
            className={`${pupilClasses} flex items-center justify-center`}
            style={{ 
              transform: `translate(${leftOffset.x}px, ${leftOffset.y}px)`,
              ...(reaction === 'love' ? { backgroundColor: loveColor, clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', width: '12px', height: '12px', borderRadius: '0' } : {}),
              ...(reaction === 'money' ? { backgroundColor: '#22c55e', width: '12px', height: '12px', borderRadius: '4px' } : {})
            }} 
          >
            {reaction === 'money' && <span className="text-[9px] font-bold text-white leading-none -mt-[0.5px]">$</span>}
          </div>
          {reaction === 'happy' && (
             <div className="absolute top-1 w-4 h-1.5 bg-white rounded-full opacity-80"></div>
          )}
          {reaction === 'sad' && (
             <div className="absolute bottom-0 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
          )}
          {reaction === 'cool' && (
             <div className="absolute top-0 w-8 h-3 bg-[var(--text-app)] z-10 -rotate-12 transform scale-110"></div>
          )}
        </div>
      </div>
      
      {/* Right Eye */}
      <div className="relative">
        <div style={rightEyebrowStyle} className={eyebrowClasses} />
        <div ref={rightEyeRef} className={eyeClasses}>
          <div 
            className={`${pupilClasses} flex items-center justify-center`}
            style={{ 
              transform: `translate(${rightOffset.x}px, ${rightOffset.y}px)`,
              ...(reaction === 'love' ? { backgroundColor: loveColor, clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', width: '12px', height: '12px', borderRadius: '0' } : {}),
              ...(reaction === 'money' ? { backgroundColor: '#22c55e', width: '12px', height: '12px', borderRadius: '4px' } : {})
            }} 
          >
            {reaction === 'money' && <span className="text-[9px] font-bold text-white leading-none -mt-[0.5px]">$</span>}
          </div>
          {reaction === 'happy' && (
             <div className="absolute top-1 w-4 h-1.5 bg-white rounded-full opacity-80"></div>
          )}
          {reaction === 'cool' && (
             <div className="absolute top-0 w-8 h-3 bg-[var(--text-app)] z-10 -rotate-12 transform scale-110"></div>
          )}
        </div>
      </div>
    </div>
  );
};
