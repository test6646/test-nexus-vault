
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Add01Icon, OfficeIcon, UserIcon } from 'hugeicons-react';
import FirmCreationDialog from './FirmCreationDialog';
// GoogleSheetsSync component removed - using automatic real-time sync only

interface Firm {
  id: string;
  name: string;
  created_at: string;
  spreadsheet_id?: string;
}

interface FirmManagementProps {
  firms: Firm[];
  onRefresh: () => void;
}

const FirmManagement = ({ firms, onRefresh }: FirmManagementProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleFirmCreated = () => {
    setCreateDialogOpen(false);
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <OfficeIcon className="h-5 w-5" />
          Firm Management
        </CardTitle>
        <CardDescription>
          Manage your photography firms and team collaboration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-4">
          <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
            <Add01Icon className="mr-2 h-4 w-4" />
            Create New Firm
          </Button>
        </div>
        
        {firms.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium">Your Firms</h4>
            
            <div className="space-y-2">
              {firms.map((firm) => (
                <div key={firm.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{firm.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(firm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <UserIcon className="h-4 w-4" />
            <AlertDescription>
              No firms created yet. Create your first firm to start managing your photography business.
            </AlertDescription>
          </Alert>
        )}

        {/* Automatic real-time Google Sheets sync is handled by database triggers - no manual sync needed */}
      </CardContent>
      
      <FirmCreationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onFirmCreated={handleFirmCreated}
      />
    </Card>
  );
};

export default FirmManagement;
