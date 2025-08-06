import React from 'react';
import { Button } from '@/components/ui/button';

interface EventFormActionsProps {
  loading: boolean;
  currentEvent: any;
  onCancel: () => void;
}

const EventFormActions: React.FC<EventFormActionsProps> = ({
  loading,
  currentEvent,
  onCancel
}) => {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="rounded-full"
      >
        Cancel
      </Button>
      <Button type="submit" disabled={loading} className="rounded-full">
        {loading ? 'Saving...' : currentEvent ? 'Update Event' : 'Create Event'}
      </Button>
    </div>
  );
};

export default EventFormActions;