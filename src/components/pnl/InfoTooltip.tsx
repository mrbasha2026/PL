'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InfoTooltipProps {
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ text, side = 'top' }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors mr-1"
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
