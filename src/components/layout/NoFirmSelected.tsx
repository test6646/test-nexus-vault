
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Users } from 'lucide-react';
import FirmCreationDialog from '@/components/FirmCreationDialog';

interface NoFirmSelectedProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const NoFirmSelected = ({ 
  title = "No Firm Selected", 
  description = "Please select a firm from the dropdown in the navbar to access this feature, or create a new firm to get started.",
  icon = <Building2 className="h-8 w-8 text-primary" />
}: NoFirmSelectedProps) => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showFirmDialog, setShowFirmDialog] = useState(false);

  const handleFirmCreated = async () => {
    setShowFirmDialog(false);
    // Profile should already be refreshed in the dialog
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {description}
        </p>
        <div className="flex justify-center space-x-4">
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
          <Button onClick={() => setShowFirmDialog(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Firm
          </Button>
        </div>
        
        <FirmCreationDialog
          open={showFirmDialog}
          onOpenChange={setShowFirmDialog}
          onFirmCreated={handleFirmCreated}
        />
      </CardContent>
    </Card>
  );
};

export default NoFirmSelected;
