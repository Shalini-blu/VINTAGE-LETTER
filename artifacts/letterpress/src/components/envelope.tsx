import React from 'react';
import { cn } from '@/lib/utils';
import { WaxSeal } from './wax-seal';

interface EnvelopeProps {
  style?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
  waxColor?: string;
  waxSymbol?: string;
  isOpen?: boolean;
  className?: string;
  onSealClick?: () => void;
}

export function Envelope({ 
  style = 'classic', 
  recipientName, 
  recipientEmail, 
  senderName, 
  waxColor, 
  waxSymbol, 
  isOpen = false,
  className,
  onSealClick
}: EnvelopeProps) {
  
  const styleClass = `envelope-${style}`;

  return (
    <div className={cn("relative w-full max-w-2xl aspect-[3/2] mx-auto perspective-1000", className)}>
      {/* Envelope Back (what you see when closed) */}
      <div className={cn(
        "absolute inset-0 shadow-xl transition-all duration-700 transform-style-3d",
        styleClass
      )}>
        {/* Flap */}
        <div 
          className={cn(
            "absolute top-0 left-0 w-full h-[60%] origin-top transition-transform duration-1000 z-20 overflow-hidden",
            isOpen ? "envelope-flap-open" : ""
          )}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.1))'
          }}
        >
          <div className={cn("w-full h-full", styleClass)} style={{ filter: 'brightness(0.95)' }} />
        </div>

        {/* Bottom Fold */}
        <div 
          className={cn("absolute bottom-0 left-0 w-full h-[70%] z-10", styleClass)}
          style={{
            clipPath: 'polygon(0 100%, 100% 100%, 50% 0)',
            filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.05))'
          }}
        />

        {/* Left Fold */}
        <div 
          className={cn("absolute top-0 left-0 w-[60%] h-full z-10", styleClass)}
          style={{
            clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
          }}
        />

        {/* Right Fold */}
        <div 
          className={cn("absolute top-0 right-0 w-[60%] h-full z-10", styleClass)}
          style={{
            clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
          }}
        />

        {/* Addressing on the back (optional, usually front, but we'll show it here for UI purposes) */}
        {!isOpen && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 opacity-80 mix-blend-multiply pointer-events-none">
            <div className="w-full h-full border border-dashed border-current opacity-20 rounded-sm m-4" />
            <div className="absolute top-12 left-12 text-sm font-mono text-current opacity-70">
              {senderName || 'Anonymous'}
            </div>
            <div className="absolute bottom-1/4 right-1/4 text-xl font-serif text-current transform -rotate-2">
              {recipientName || 'To someone special'}
              <div className="text-sm font-sans opacity-70 mt-1">{recipientEmail}</div>
            </div>
          </div>
        )}

        {/* Wax Seal */}
        {!isOpen && (
          <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 transition-transform hover:scale-105">
            <WaxSeal color={waxColor} symbol={waxSymbol} onClick={onSealClick} />
          </div>
        )}
      </div>
    </div>
  );
}
