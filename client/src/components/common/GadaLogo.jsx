import React from 'react';

/**
 * Official Gada Electronics Brand Identity Component
 * High-fidelity vector emblem with modern retail electronics crest
 */
export default function GadaLogo({ 
  size = 'md', 
  theme = 'dark', 
  showSubtext = true, 
  className = '' 
}) {
  const sizeMap = {
    sm: { icon: 'w-7 h-7 text-xs', text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9 text-sm', text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 'w-11 h-11 text-base', text: 'text-xl', sub: 'text-xs' },
    xl: { icon: 'w-14 h-14 text-lg', text: 'text-2xl', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const isLight = theme === 'light';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon Crest */}
      <div className={`relative ${currentSize.icon} flex items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 font-black shadow-md shadow-amber-500/20 border border-amber-200/50 flex-shrink-0`}>
        {/* Subtle inner circuit lines */}
        <svg 
          viewBox="0 0 40 40" 
          className="w-full h-full p-1" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="40" height="40" rx="8" fill="url(#gada-grad)" />
          {/* GE Monogram & Lightning Circuit */}
          <path 
            d="M12 14C12 12.3431 13.3431 11 15 11H25C26.6569 11 28 12.3431 28 14V16H16V24H24V21H20V19H26C27.1046 19 28 19.8954 28 21V25C28 26.6569 26.6569 28 25 28H15C13.3431 28 12 26.6569 12 25V14Z" 
            fill="#0F172A" 
          />
          <path 
            d="M27 10L31 6M31 6H28M31 6V9" 
            stroke="#0F172A" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <circle cx="20" cy="20" r="1.5" fill="#F59E0B" />
          <defs>
            <linearGradient id="gada-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FBBF24" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col leading-tight">
        <div className={`font-black tracking-wider uppercase font-sans flex items-center gap-1 ${currentSize.text} ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <span>GADA</span>
          <span className="text-amber-500 font-extrabold">ELECTRONICS</span>
        </div>
        {showSubtext && (
          <span className={`font-semibold tracking-widest uppercase opacity-75 ${currentSize.sub} ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            DealFlow360 B2B Enterprise
          </span>
        )}
      </div>
    </div>
  );
}
