
import { 
  Edit02Icon, 
  Download01Icon, 
  Share08Icon, 
  MoneyAdd01Icon,
  Location01Icon,
  ContactIcon,
  Calendar01Icon,
  KidIcon,
  FavouriteIcon,
  Diamond02Icon,
  MountainIcon,
  DashboardCircleAddIcon,
  UserGroupIcon,
  Delete02Icon,
  File01Icon,
  Building06Icon,
  Camera02Icon,
  CheckmarkCircle02Icon,
  HardDriveIcon,
  Loading03Icon
} from 'hugeicons-react';
import { Eye } from 'lucide-react';
import { Event } from '@/types/studio';
import CentralizedCard from '@/components/common/CentralizedCard';
import { formatEventDateRange } from '@/lib/date-utils';
import { getEventStatus } from '@/lib/event-status-utils';
import EventCrewDialog from '@/components/events/EventCrewDialog';
import { generateIndividualEventReport } from '@/components/events/IndividualEventReportPDF';
import BalanceDisplay from '@/components/ui/balance-display';
import { calculateTotalPaid } from '@/lib/payment-calculator';
import { useState } from 'react';
import PDFDownloadOptionsDialog from '@/components/common/PDFDownloadOptionsDialog';


interface EventPaymentCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onPaymentClick: (event: Event) => void;
  onViewDetails: (event: Event) => void;
  onDownloadInvoice?: (event: Event) => void;
  onSendInvoice?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

import DiskManagementDialog from '@/components/events/DiskManagementDialog';

const EventPaymentCard = ({ event, onEdit, onPaymentClick, onViewDetails, onDownloadInvoice, onSendInvoice, onDelete }: EventPaymentCardProps) => {
  const [crewDialogOpen, setCrewDialogOpen] = useState(false);
  const [diskDialogOpen, setDiskDialogOpen] = useState(false);
  const [pdfDownloadDialogOpen, setPdfDownloadDialogOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const getEventTypeIcon = (eventType: string) => {
    const iconConfig = {
      'Wedding': <FavouriteIcon className="h-3.5 w-3.5" />,
      'Pre-Wedding': <MountainIcon className="h-3.5 w-3.5" />,
      'Ring-Ceremony': <Diamond02Icon className="h-3.5 w-3.5" />,
      'Maternity Photography': <KidIcon className="h-3.5 w-3.5" />,
      'Birthday': <KidIcon className="h-3.5 w-3.5" />,
      'Corporate': <Building06Icon className="h-3.5 w-3.5" />,
      'Product': <Camera02Icon className="h-3.5 w-3.5" />,
      'Portrait': <ContactIcon className="h-3.5 w-3.5" />,
      'Other': <DashboardCircleAddIcon className="h-3.5 w-3.5" />
    };
    return iconConfig[eventType as keyof typeof iconConfig] || iconConfig.Other;
  };

  const getEventTypeIconStyle = (eventType: string) => {
    const iconStyles = {
      'Wedding': 'bg-wedding-color text-white',
      'Pre-Wedding': 'bg-pre-wedding-color text-white',
      'Ring-Ceremony': 'bg-ring-ceremony-color text-white',
      'Maternity Photography': 'bg-maternity-color text-white',
      'Birthday': 'bg-maternity-color text-white',
      'Corporate': 'bg-ring-ceremony-color text-white',
      'Product': 'bg-maternity-color text-white',
      'Portrait': 'bg-pre-wedding-color text-white',
      'Other': 'bg-others-color text-white'
    };
    return iconStyles[eventType as keyof typeof iconStyles] || iconStyles.Other;
  };

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


  const eventStatus = getEventStatus(event);

  // Enhanced metadata in specific order: STATUS, CLIENT, DATE, VENUE (always show all)
  const metadata = [
    // Status (always show) - with colored text only
    {
      icon: <CheckmarkCircle02Icon className="h-3.5 w-3.5 text-primary" />,
      value: eventStatus.label,
      className: `font-medium ${eventStatus.colorClass}`
    },
    // Client (always show)
    {
      icon: <ContactIcon className="h-3.5 w-3.5 text-primary" />,
      value: event.client?.name || '~'
    },
    // Event Date (always show)
    {
      icon: <Calendar01Icon className="h-3.5 w-3.5 text-primary" />,
      value: formatEventDateRange(event.event_date, totalDays, (event as any).event_end_date),
      isDate: true
    },
    // Venue (always show)
    {
      icon: <Location01Icon className="h-3.5 w-3.5 text-primary" />,
      value: event.venue || '~'
    }
  ];

  // Enhanced crew completeness check based on quotation requirements
  const checkCrewCompleteness = () => {
    const eventWithStaff = event as any;
    
    
    // Get quotation details to check required crew counts
    const quotationDetails = eventWithStaff.quotation_details;
    if (!quotationDetails || !quotationDetails.days) {
      
      // If event has quotation_source_id but no quotation_details, it means data is incomplete
      if (eventWithStaff.quotation_source_id) {
        
        return true;
      }
      return false;
    }
    
    const staffAssignments = eventWithStaff.event_staff_assignments || [];
    const totalDays = eventWithStaff.total_days || 1;
    
    // Check each day's requirements vs actual assignments
    for (let day = 1; day <= totalDays; day++) {
      const dayConfig = quotationDetails.days?.[day - 1];
      
      if (!dayConfig) continue;
      
      // Count actual assignments for this specific day only
      const dayAssignments = staffAssignments.filter((assignment: any) => 
        assignment.day_number === day
      );
      
      
      
      const actualPhotographers = dayAssignments.filter((a: any) => a.role === 'Photographer').length;
      const actualCinematographers = dayAssignments.filter((a: any) => a.role === 'Cinematographer').length;
      const actualDronePilots = dayAssignments.filter((a: any) => a.role === 'Drone Pilot').length;
      const actualSameDayEditors = dayAssignments.filter((a: any) => a.role === 'Same Day Editor').length;
      
      // Check if any role is understaffed
      const requiredPhotographers = dayConfig.photographers || 0;
      const requiredCinematographers = dayConfig.cinematographers || 0;
      const requiredDrone = dayConfig.drone || 0;
      const requiredSameDayEditors = dayConfig.sameDayEditors || (quotationDetails?.sameDayEditing ? 1 : 0);
      
      
      if (actualPhotographers < requiredPhotographers ||
          actualCinematographers < requiredCinematographers ||
          actualDronePilots < requiredDrone ||
          actualSameDayEditors < requiredSameDayEditors) {
        
        return true; // Crew is incomplete
      }
    }
    
    
    return false; // All requirements met
  };

  const isCrewIncomplete = checkCrewCompleteness();

  const handleViewDetails = async () => {
    if (onViewDetails) {
      setIsViewing(true);
      try {
        await onViewDetails(event);
      } finally {
        setIsViewing(false);
      }
    }
  };

  const handleDownloadInvoice = async () => {
    if (onDownloadInvoice) {
      setIsDownloading(true);
      try {
        await onDownloadInvoice(event);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleDownloadEventReport = async () => {
    setIsDownloading(true);
    try {
      await generateIndividualEventReport(event as any);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (onSendInvoice) {
      setIsSharing(true);
      try {
        await onSendInvoice(event);
      } finally {
        setIsSharing(false);
      }
    }
  };

  const actions = [
    { 
      label: 'View', 
      onClick: handleViewDetails, 
      variant: 'outline' as const, 
      icon: isViewing ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Eye className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isViewing
    },
    { label: 'Edit', onClick: () => onEdit(event), variant: 'outline' as const, icon: <Edit02Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    { 
      label: 'Crew', 
      onClick: () => setCrewDialogOpen(true), 
      variant: 'outline' as const, 
      icon: <UserGroupIcon className={`h-3.5 w-3.5 ${isCrewIncomplete ? 'text-white' : 'text-foreground'}`} strokeWidth={1.5} />,
      className: isCrewIncomplete ? 'border-red-500 bg-red-500 hover:bg-red-600 text-white' : ''
    },
    { label: 'Disk', onClick: () => setDiskDialogOpen(true), variant: 'outline' as const, icon: <HardDriveIcon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    { label: 'Collect', onClick: () => onPaymentClick(event), variant: 'outline' as const, icon: <MoneyAdd01Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    ...(onDownloadInvoice ? [{ 
      label: 'Download', 
      onClick: () => setPdfDownloadDialogOpen(true), 
      variant: 'outline' as const, 
      icon: isDownloading ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download01Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isDownloading
    }] : []),
    ...(onSendInvoice ? [{ 
      label: 'Share', 
      onClick: handleShare, 
      variant: 'outline' as const, 
      icon: isSharing ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Share08Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isSharing
    }] : []),
    ...(onDelete ? [{ label: 'Delete', onClick: () => onDelete(event), variant: 'outline' as const, icon: <Delete02Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> }] : [])
  ];

  return (
    <>
      <CentralizedCard
        title={event.title}
        metadata={metadata}
        actions={actions}
        className="rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px]"
      >
        {/* Event Type Icon */}
        <div className="absolute top-4 right-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventTypeIconStyle(event.event_type)}`}>
            {getEventTypeIcon(event.event_type)}
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
              <span className="text-orange-500">₹{calculateTotalPaid(event as any).toLocaleString('en-IN')}</span>
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
      <DiskManagementDialog
        event={event}
        open={diskDialogOpen}
        onOpenChange={setDiskDialogOpen}
      />
      <PDFDownloadOptionsDialog
        isOpen={pdfDownloadDialogOpen}
        onOpenChange={setPdfDownloadDialogOpen}
        onDownloadInvoice={handleDownloadInvoice}
        onDownloadEventReport={handleDownloadEventReport}
        title="Download PDF"
      />
    </>
  );
};

export default EventPaymentCard;
