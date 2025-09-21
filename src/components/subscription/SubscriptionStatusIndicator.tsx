import React from 'react';
import { Shield01Icon, Loading03Icon } from 'hugeicons-react';
import { Badge } from '@/components/ui/badge';

interface SubscriptionStatusIndicatorProps {
  loading?: boolean;
  backgroundLoading?: boolean;
  status?: 'trial' | 'active' | 'expired';
  className?: string;
}

export const SubscriptionStatusIndicator: React.FC<SubscriptionStatusIndicatorProps> = ({
  loading = false,
  backgroundLoading = false,
  status,
  className = ""
}) => {
  if (loading) {
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Loading03Icon className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking...</span>
      </Badge>
    );
  }

  if (backgroundLoading && status) {
    return (
      <Badge 
        variant={status === 'active' ? 'default' : status === 'trial' ? 'secondary' : 'destructive'} 
        className={`gap-1 ${className}`}
      >
        <Loading03Icon className="h-3 w-3 animate-spin" />
        <Shield01Icon className="h-3 w-3" />
        <span className="text-xs capitalize">{status}</span>
      </Badge>
    );
  }

  if (status) {
    return (
      <Badge 
        variant={status === 'active' ? 'default' : status === 'trial' ? 'secondary' : 'destructive'} 
        className={`gap-1 ${className}`}
      >
        <Shield01Icon className="h-3 w-3" />
        <span className="text-xs capitalize">{status}</span>
      </Badge>
    );
  }

  return null;
};