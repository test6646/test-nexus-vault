import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CentralizedErrorHandler } from '@/lib/centralized-error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler = CentralizedErrorHandler.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorResponse = this.errorHandler.handleError(error, {
      component: this.props.context || 'ErrorBoundary',
      operation: 'component_crash',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    // Error handling - production logging
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  handleReportError = () => {
    const { error, errorId } = this.state;
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to error tracking service
    
    // Copy to clipboard for user to share
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    alert('Error details copied to clipboard. Please share with support.');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred in this part of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Error ID: {this.state.errorId}
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert>
                  <AlertDescription className="text-xs font-mono">
                    {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={this.handleReportError} variant="ghost" size="sm">
                  Report Issue
                </Button>
              </div>
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="secondary" 
                className="w-full"
              >
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
