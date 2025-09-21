import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import EventStats from './EventStats';
import EventTableView from './EventTableView';
import CleanEventFormDialog from './CleanEventFormDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useEventExportConfig } from '@/hooks/useExportConfigs';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEvents } from './hooks/useEvents';


const EventManagementWithPayments = () => {
  const { profile, currentFirmId } = useAuth();
  const isMobile = useIsMobile();
  const eventExportConfig = useEventExportConfig();
  const { canCreateNew, canExport } = useSubscriptionAccess();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { events, loading, loadEvents } = useEvents();

  // Simple function to handle create dialog success
  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    loadEvents();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Events
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="icon"
            className="h-10 w-10 rounded-full"
            disabled={!canCreateNew}
          >
            <Add01Icon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <EventStats />

      {/* Events List */}
      <EventTableView 
        events={events}
        loading={loading}
        onRefetch={loadEvents}
        onNewEvent={() => setCreateDialogOpen(true)}
      />

      {/* Create Event Dialog */}
      <CleanEventFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default EventManagementWithPayments;
