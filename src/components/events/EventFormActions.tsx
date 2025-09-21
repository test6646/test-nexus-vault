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
    <div className="flex flex-row gap-3 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="flex-1 rounded-full"
      >
        Cancel
      </Button>
      <Button type="submit" disabled={loading} className="flex-1 rounded-full">
        {loading ? 'Saving...' : currentEvent ? 'Update' : 'Create'}
      </Button>
    </div>
  );
};

export default EventFormActions;