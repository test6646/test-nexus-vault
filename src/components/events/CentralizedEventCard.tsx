import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserIcon, Calendar01Icon, Location01Icon, UserGroupIcon, Add01Icon, Edit02Icon, Delete01Icon } from 'hugeicons-react';
import { CentralizedEvent } from '@/hooks/useCentralizedEvents';
import { EVENT_TYPE_COLORS } from '@/types/studio';

interface CentralizedEventCardProps {
  event: CentralizedEvent;
  onEdit: (event: CentralizedEvent) => void;
  onPayment: (event: CentralizedEvent) => void;
  onDelete: (eventId: string) => void;
}

const CentralizedEventCard = ({ event, onEdit, onPayment, onDelete }: CentralizedEventCardProps) => {
  const isCrewIncomplete = !event.crew_complete;
  
  const getPaymentStatusColor = () => {
    switch (event.payment_status) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'pending': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEventStatusColor = () => {
    switch (event.event_status) {
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ongoing': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'upcoming': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const metadata = [
    // Client
    ...(event.client_name ? [{
      icon: <UserIcon className="h-4 w-4" />,
      value: event.client_name
    }] : []),
    // Event Date
    {
      icon: <Calendar01Icon className="h-4 w-4" />,
      value: new Date(event.event_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    // Venue
    ...(event.venue ? [{
      icon: <Location01Icon className="h-4 w-4" />,
      value: event.venue
    }] : [])
  ];

  const actions = [
    {
      label: 'Crew',
      onClick: () => onEdit(event),
      variant: 'outline' as const,
      icon: <UserGroupIcon className={`h-4 w-4 ${isCrewIncomplete ? 'text-white' : ''}`} />,
      className: isCrewIncomplete ? 'border-red-500 bg-red-500 hover:bg-red-600 text-white' : ''
    },
    {
      label: 'Payment',
      onClick: () => onPayment(event),
      variant: 'default' as const,
      icon: <Add01Icon className="h-4 w-4" />
    },
    {
      label: 'Edit',
      onClick: () => onEdit(event),
      variant: 'outline' as const,
      icon: <Edit02Icon className="h-4 w-4" />
    }
  ];

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-4">
        {/* Header with title and event type */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-base line-clamp-2 flex-1">{event.title}</h3>
          <Badge 
            variant="outline" 
            className={`shrink-0 text-xs ${EVENT_TYPE_COLORS[event.event_type as keyof typeof EVENT_TYPE_COLORS] || EVENT_TYPE_COLORS.Others}`}
          >
            {event.event_type}
          </Badge>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <Badge variant="outline" className={`text-xs ${getPaymentStatusColor()}`}>
            {event.payment_status === 'paid' ? 'Paid' : event.payment_status === 'partial' ? 'Partial' : 'Pending'}
          </Badge>
          <Badge variant="outline" className={`text-xs ${getEventStatusColor()}`}>
            {event.event_status}
          </Badge>
          {isCrewIncomplete && (
            <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
              Crew Incomplete
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          {metadata.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              {item.icon}
              <span className="truncate">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Financial summary */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="font-medium">₹{event.total_amount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Balance</div>
              <div className={`font-medium ${event.balance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{event.balance_amount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Staff summary */}
        {event.assignments && event.assignments.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">Assigned Staff</div>
            <div className="flex flex-wrap gap-1">
              {event.assignments.slice(0, 3).map((assignment, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {assignment.person_name}
                </Badge>
              ))}
              {event.assignments.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{event.assignments.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              className={`flex-1 min-w-0 ${action.className || ''}`}
            >
              {action.icon}
              <span className="ml-1 truncate">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Delete button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(event.id)}
          className="w-full mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Delete01Icon className="h-4 w-4 mr-1" />
          Delete Event
        </Button>
      </CardContent>
    </Card>
  );
};

export default CentralizedEventCard;