import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DuplicateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: string;
  existingEventTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateEventDialog({
  open,
  onOpenChange,
  eventType,
  existingEventTitle,
  onConfirm,
  onCancel,
}: DuplicateEventDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Duplicate Event Type Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This client already has a <span className="font-semibold text-primary">{eventType}</span> event titled "{existingEventTitle}".
            <br /><br />
            Do you want to create another <span className="font-semibold text-primary">{eventType}</span> event for the same client?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Create Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}