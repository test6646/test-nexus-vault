
import { 
  Edit02Icon, 
  Download01Icon, 
  Share01Icon, 
  Add01Icon,
  Camera01Icon,
  Video01Icon,
  Location01Icon,
  UserIcon,
  Calendar01Icon,
  KidIcon,
  FavouriteIcon,
  Diamond02Icon,
  MountainIcon,
  DashboardCircleAddIcon
} from 'hugeicons-react';
import { Event } from '@/types/studio';
import CentralizedCard from '@/components/common/CentralizedCard';
import { formatEventDateRange } from '@/lib/date-utils';

interface EventPaymentCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onPaymentClick: (event: Event) => void;
  onDownloadInvoice?: (event: Event) => void;
  onSendInvoice?: (event: Event) => void;
}

const EventPaymentCard = ({ event, onEdit, onPaymentClick, onDownloadInvoice, onSendInvoice }: EventPaymentCardProps) => {
const getEventTypeConfig = (eventType: string) => {
    const configs = {
      'Ring-Ceremony': { 
        icon: <Diamond02Icon className="h-4 w-4" />
      },
      'Pre-Wedding': { 
        icon: <MountainIcon className="h-4 w-4" />
      },
      'Wedding': { 
        icon: <FavouriteIcon className="h-4 w-4" />
      },
      'Maternity Photography': { 
        icon: <KidIcon className="h-4 w-4" />
      },
      'Others': { 
        icon: <DashboardCircleAddIcon className="h-4 w-4" />
      }
    };
    return configs[eventType as keyof typeof configs] || configs.Others;
  };

  const eventConfig = getEventTypeConfig(event.event_type);

  // Helper function to create staff display for proper ordering
  const createStaffDisplay = (staffAssignments: any[], role: string, totalDays: number) => {
    const dayGroups: { [key: number]: string[] } = {};
    
    staffAssignments.forEach((assignment: any) => {
      const day = assignment.day_number || 1;
      const assignmentRole = assignment.role;
      const name = assignment.profiles?.full_name;
      
      if (assignmentRole === role && name) {
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(name);
      }
    });
    
    const dayEntries = [];
    for (let day = 1; day <= totalDays; day++) {
      if (dayGroups[day]?.length > 0) {
        const dayStr = day.toString().padStart(2, '0');
        const staffList = dayGroups[day].join(', ');
        dayEntries.push(`${dayStr}: ${staffList}`);
      }
    }
    
    return dayEntries.length > 0 ? (
      <div className="space-y-0.5">
        {dayEntries.map((entry, index) => (
          <div key={index} className="text-sm font-medium leading-tight whitespace-nowrap">
            {entry}
          </div>
        ))}
      </div>
    ) : null;
  };

  const staffAssignments = (event as any).event_staff_assignments || [];
  const totalDays = (event as any).total_days || 1;

  // Enhanced metadata in specific order: CLIENT, DATE, VENUE, PHOTOGRAPHERS, VIDEOGRAPHERS
  const metadata = [
    // Client
    ...(event.client?.name ? [{
      icon: <UserIcon className="h-4 w-4 text-primary" />,
      value: event.client.name
    }] : []),
    // Event Date
    {
      icon: <Calendar01Icon className="h-4 w-4 text-primary" />,
      value: formatEventDateRange(event.event_date, totalDays, (event as any).event_end_date),
      isDate: true
    },
    // Venue
    ...(event.venue ? [{
      icon: <Location01Icon className="h-4 w-4 text-primary" />,
      value: event.venue
    }] : []),
    // Photographers
    ...((() => {
      const photographerDisplay = createStaffDisplay(staffAssignments, 'Photographer', totalDays);
      return photographerDisplay ? [{
        icon: <Camera01Icon className="h-4 w-4 text-primary" />,
        value: photographerDisplay
      }] : [];
    })()),
    // Videographers
    ...((() => {
      const videographerDisplay = createStaffDisplay(staffAssignments, 'Videographer', totalDays);
      return videographerDisplay ? [{
        icon: <Video01Icon className="h-4 w-4 text-primary" />,
        value: videographerDisplay
      }] : [];
    })())
  ];

  const actions = [
    { label: 'Edit', onClick: () => onEdit(event), variant: 'outline' as const, icon: <Edit02Icon className="h-4 w-4" /> },
    { label: 'Collect', onClick: () => onPaymentClick(event), variant: 'default' as const, icon: <Add01Icon className="h-4 w-4" /> },
    ...(onDownloadInvoice ? [{ label: 'Download', onClick: () => onDownloadInvoice(event), variant: 'outline' as const, icon: <Download01Icon className="h-4 w-4" /> }] : []),
    ...(onSendInvoice ? [{ label: 'Share', onClick: () => onSendInvoice(event), variant: 'outline' as const, icon: <Share01Icon className="h-4 w-4" /> }] : [])
  ];

  return (
    <CentralizedCard
      title={event.title}
      metadata={metadata}
      actions={actions}
      className="rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px]"
    >
      {/* Event Type Icon */}
      <div className="absolute top-4 right-4">
        <div className="rounded-full p-3 bg-primary/10">
          <div className="text-primary">
            {eventConfig.icon}
          </div>
        </div>
      </div>
      {/* Progress indicators - with labels */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${event.photo_editing_status ? 'bg-primary' : 'bg-muted'}`} />
          <span className="text-xs font-medium text-muted-foreground">PHOTO</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${event.video_editing_status ? 'bg-primary' : 'bg-muted'}`} />
          <span className="text-xs font-medium text-muted-foreground">VIDEO</span>
        </div>
      </div>
      
      {/* Amount section - single row format: Total - Advance = Balance */}
      <div className="absolute bottom-16 left-0 right-0 px-3">
        <div className="w-full bg-card border-2 border-primary/30 rounded-full px-5 py-2.5">
          <div className="flex items-center justify-center gap-4 text-sm font-bold">
            <span className="text-primary">₹{event.total_amount?.toLocaleString('en-IN') || '0'}</span>
            <span className="text-muted-foreground/60">-</span>
            <span className="text-orange-500">₹{(event.advance_amount || 0).toLocaleString('en-IN')}</span>
            <span className="text-muted-foreground/60">=</span>
            <span className="text-green-600">₹{(event.balance_amount || event.total_amount || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </CentralizedCard>
  );
};

export default EventPaymentCard;
