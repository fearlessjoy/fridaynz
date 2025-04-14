import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppData } from '@/hooks/useAppData';
import { RefreshCcw } from 'lucide-react';

export default function RefreshButton() {
  const { refreshConnection } = useAppData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshConnection();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full w-9 h-9"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh connection</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refresh Firebase connection</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 