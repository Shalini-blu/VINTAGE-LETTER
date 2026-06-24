import React from 'react';
import { cn } from '@/lib/utils';
import { Anchor, Star, Heart, Crown, Flower2, Type } from 'lucide-react';

interface WaxSealProps {
  color?: string;
  symbol?: string;
  className?: string;
  onClick?: () => void;
}

export function WaxSeal({ color = '#8b0000', symbol = 'anchor', className, onClick }: WaxSealProps) {
  const renderSymbol = () => {
    const props = { className: "w-8 h-8 text-white opacity-80 drop-shadow-md" };
    switch (symbol) {
      case 'anchor': return <Anchor {...props} />;
      case 'star': return <Star {...props} />;
      case 'heart': return <Heart {...props} />;
      case 'crown': return <Crown {...props} />;
      case 'fleur': return <Flower2 {...props} />;
      case 'initial': return <Type {...props} />;
      default: return <Anchor {...props} />;
    }
  };

  return (
    <div 
      className={cn(
        "relative rounded-full flex items-center justify-center shadow-lg",
        onClick && "cursor-pointer transition-transform hover:scale-105 active:scale-95",
        className
      )}
      style={{
        backgroundColor: color,
        width: '80px',
        height: '80px',
        boxShadow: `inset 0 0 15px rgba(0,0,0,0.5), inset 0 2px 20px rgba(255,255,255,0.2), 0 4px 10px rgba(0,0,0,0.3)`
      }}
      onClick={onClick}
    >
      <div 
        className="absolute inset-2 rounded-full border border-[rgba(255,255,255,0.1)] shadow-[inset_0_0_10px_rgba(0,0,0,0.3)] flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.1) 100%)`
        }}
      >
        {renderSymbol()}
      </div>
      {/* Irregular edges simulation using multiple box-shadows or pseudo elements */}
      <div className="absolute inset-0 rounded-full blur-[1px] mix-blend-multiply opacity-50" style={{ boxShadow: `inset 0 0 5px ${color}` }}></div>
    </div>
  );
}
