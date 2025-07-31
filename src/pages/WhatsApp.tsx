import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import TopNavbar from '@/components/layout/TopNavbar';

const WhatsApp = () => {
  const { profile } = useAuth();

  // Check if user is admin
  if (profile?.role !== 'Admin') {
    return (
      <TopNavbar>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">Only administrators can access WhatsApp integration.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              WhatsApp Integration
            </h1>
            <p className="text-muted-foreground mt-2">
              WhatsApp integration has been removed. Ready for new implementation.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>
              All WhatsApp-related code has been cleaned up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is now ready for a new WhatsApp integration implementation.
            </p>
          </CardContent>
        </Card>
      </div>
    </TopNavbar>
  );
};

export default WhatsApp;