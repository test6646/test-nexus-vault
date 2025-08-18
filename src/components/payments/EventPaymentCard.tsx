
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
  DashboardCircleAddIcon,
  UserGroupIcon,
  Delete02Icon,
  Note01Icon
} from 'hugeicons-react';
import { Event } from '@/types/studio';
import CentralizedCard from '@/components/common/CentralizedCard';
import { formatEventDateRange } from '@/lib/date-utils';
import EventCrewDialog from '@/components/events/EventCrewDialog';
import { generateIndividualEventReport } from '@/components/events/IndividualEventReportPDF';
import BalanceDisplay from '@/components/ui/balance-display';
import { useState } from 'react';

interface EventPaymentCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onPaymentClick: (event: Event) => void;
  onDownloadInvoice?: (event: Event) => void;
  onSendInvoice?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

const EventPaymentCard = ({ event, onEdit, onPaymentClick, onDownloadInvoice, onSendInvoice, onDelete }: EventPaymentCardProps) => {
  const [crewDialogOpen, setCrewDialogOpen] = useState(false);
const getEventTypeConfig = (eventType: string) => {
    const configs = {
      'Ring-Ceremony': { 
        icon: <Diamond02Icon className="h-4 w-4" />,
        bgColor: 'bg-white',
        borderColor: 'border-2 border-[hsl(var(--ring-ceremony-border))]',
        iconBgColor: 'bg-[hsl(var(--ring-ceremony-color))]/20',
        iconColor: 'text-[hsl(var(--ring-ceremony-color))]'
      },
      'Pre-Wedding': { 
        icon: <MountainIcon className="h-4 w-4" />,
        bgColor: 'bg-white',
        borderColor: 'border-2 border-[hsl(var(--pre-wedding-border))]',
        iconBgColor: 'bg-[hsl(var(--pre-wedding-color))]/20',
        iconColor: 'text-[hsl(var(--pre-wedding-color))]'
      },
      'Wedding': { 
        icon: <FavouriteIcon className="h-4 w-4" />,
        bgColor: 'bg-white',
        borderColor: 'border-2 border-[hsl(var(--wedding-border))]',
        iconBgColor: 'bg-[hsl(var(--wedding-color))]/20',
        iconColor: 'text-[hsl(var(--wedding-color))]'
      },
      'Maternity Photography': { 
        icon: <KidIcon className="h-4 w-4" />,
        bgColor: 'bg-white',
        borderColor: 'border-2 border-[hsl(var(--maternity-border))]',
        iconBgColor: 'bg-[hsl(var(--maternity-color))]/20',
        iconColor: 'text-[hsl(var(--maternity-color))]'
      },
      'Others': { 
        icon: <DashboardCircleAddIcon className="h-4 w-4" />,
        bgColor: 'bg-white',
        borderColor: 'border-2 border-[hsl(var(--others-border))]',
        iconBgColor: 'bg-[hsl(var(--others-color))]/20',
        iconColor: 'text-[hsl(var(--others-color))]'
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
          <div key={index} className="text-sm font-medium leading-tight">
            {entry}
          </div>
        ))}
      </div>
    ) : null;
  };

  const staffAssignments = (event as any).event_staff_assignments || [];
  const totalDays = (event as any).total_days || 1;

  // Enhanced metadata in specific order: CLIENT, DATE, VENUE
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
    }] : [])
  ];

  // Enhanced crew completeness check based on quotation requirements
  const checkCrewCompleteness = () => {
    const eventWithStaff = event as any;
    
    console.log('=== CREW COMPLETENESS CHECK FOR EVENT ===', event.title);
    console.log('Event quotation_source_id:', eventWithStaff.quotation_source_id);
    console.log('Event quotation_details:', eventWithStaff.quotation_details);
    console.log('Event staff_assignments:', eventWithStaff.event_staff_assignments);
    console.log('Event total_days:', eventWithStaff.total_days);
    
    // Get quotation details to check required crew counts
    const quotationDetails = eventWithStaff.quotation_details;
    if (!quotationDetails || !quotationDetails.days) {
      console.log('No quotation details or days, cannot check completeness');
      // If event has quotation_source_id but no quotation_details, it means data is incomplete
      if (eventWithStaff.quotation_source_id) {
        console.log('Event has quotation source but no details - marking as incomplete');
        return true;
      }
      return false;
    }
    
    const staffAssignments = eventWithStaff.event_staff_assignments || [];
    const totalDays = eventWithStaff.total_days || 1;
    
    // Check each day's requirements vs actual assignments
    for (let day = 1; day <= totalDays; day++) {
      const dayConfig = quotationDetails.days?.[day - 1];
      console.log(`Day ${day} config:`, dayConfig);
      if (!dayConfig) continue;
      
      // Count actual assignments for this specific day only
      const dayAssignments = staffAssignments.filter((assignment: any) => 
        assignment.day_number === day
      );
      
      console.log(`Day ${day} assignments:`, dayAssignments);
      
      const actualPhotographers = dayAssignments.filter((a: any) => a.role === 'Photographer').length;
      const actualCinematographers = dayAssignments.filter((a: any) => a.role === 'Cinematographer').length;
      const actualDronePilots = dayAssignments.filter((a: any) => a.role === 'Drone Pilot').length;
      
      // Check if any role is understaffed
      const requiredPhotographers = dayConfig.photographers || 0;
      const requiredCinematographers = dayConfig.cinematographers || 0;
      const requiredDrone = dayConfig.drone || 0;
      
      console.log(`Day ${day} requirements:`, {
        requiredPhotographers,
        requiredCinematographers,
        requiredDrone,
        actualPhotographers,
        actualCinematographers,
        actualDronePilots
      });
      
      if (actualPhotographers < requiredPhotographers ||
          actualCinematographers < requiredCinematographers ||
          actualDronePilots < requiredDrone) {
        console.log(`Day ${day} is INCOMPLETE!`);
        return true; // Crew is incomplete
      }
    }
    
    console.log('All days are complete, returning false');
    return false; // All requirements met
  };

  const isCrewIncomplete = checkCrewCompleteness();

  const actions = [
    { label: 'Edit', onClick: () => onEdit(event), variant: 'outline' as const, icon: <Edit02Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> },
    { 
      label: 'Crew', 
      onClick: () => setCrewDialogOpen(true), 
      variant: 'outline' as const, 
      icon: <UserGroupIcon className={`h-4 w-4 ${isCrewIncomplete ? 'text-white' : 'text-foreground'}`} strokeWidth={1.5} />,
      className: isCrewIncomplete ? 'border-red-500 bg-red-500 hover:bg-red-600 text-white' : ''
    },
    { label: 'Report', onClick: () => generateIndividualEventReport(event as any), variant: 'outline' as const, icon: <Note01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> },
    { label: 'Collect', onClick: () => onPaymentClick(event), variant: 'outline' as const, icon: <Add01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> },
    ...(onDownloadInvoice ? [{ label: 'Download', onClick: () => onDownloadInvoice(event), variant: 'outline' as const, icon: <Download01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> }] : []),
    ...(onSendInvoice ? [{ label: 'Share', onClick: () => onSendInvoice(event), variant: 'outline' as const, icon: <Share01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> }] : []),
    ...(onDelete ? [{ label: 'Delete', onClick: () => onDelete(event), variant: 'outline' as const, icon: <Delete02Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> }] : [])
  ];

  return (
    <>
      <CentralizedCard
        title={event.title}
        metadata={metadata}
        actions={actions}
        className={`rounded-2xl border relative min-h-[500px] sm:min-h-[520px] ${eventConfig.bgColor} ${eventConfig.borderColor}`}
      >
        {/* Event Type Icon */}
        <div className="absolute top-4 right-4">
          <div className={`rounded-full p-3 ${eventConfig.iconBgColor}`}>
            <div className={eventConfig.iconColor}>
              {eventConfig.icon}
            </div>
          </div>
        </div>
        {/* Status Badge */}
        <div className="flex items-center justify-center pt-1">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            new Date(event.event_date) <= new Date() 
              ? 'bg-status-completed-bg text-status-completed border border-status-completed-border' 
              : 'bg-status-pending-bg text-status-pending border border-status-pending-border'
          }`}>
            {new Date(event.event_date) <= new Date() ? 'COMPLETED' : 'UPCOMING'}
          </div>
        </div>
        
        {/* Progress indicators - with labels */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${event.photo_editing_status ? 'bg-primary' : 'bg-muted'}`} />
            <span className="text-xs font-medium text-muted-foreground">PHOTO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${event.video_editing_status ? 'bg-primary' : 'bg-muted'}`} />
            <span className="text-xs font-medium text-muted-foreground">VIDEO</span>
          </div>
        </div>
        
        {/* Amount section - single row format: Total - Paid = Balance */}
        <div className="absolute bottom-20 left-0 right-0 px-3">
          <div className="w-full bg-card border-2 border-primary/30 rounded-full px-5 py-2.5">
            <div className="flex items-center justify-center gap-4 text-sm font-bold">
              <span className="text-primary">₹{event.total_amount?.toLocaleString('en-IN') || '0'}</span>
              <span className="text-muted-foreground/60">-</span>
              <span className="text-orange-500">₹{((event as any).payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || event.advance_amount || 0).toLocaleString('en-IN')}</span>
              <span className="text-muted-foreground/60">=</span>
              <div className="text-green-600">
                <BalanceDisplay event={event as any} showIcon={true} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </CentralizedCard>

      <EventCrewDialog
        event={event}
        open={crewDialogOpen}
        onOpenChange={setCrewDialogOpen}
      />
    </>
  );
};

export default EventPaymentCard;
