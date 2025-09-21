import { useState, useCallback, useMemo } from 'react';
import { 
  ContactIcon, 
  Calendar01Icon, 
  Location01Icon, 
  Edit02Icon, 
  Download01Icon, 
  Share08Icon,
  CreditCardIcon,
  PercentIcon,
  Delete02Icon,
  FavouriteIcon,
  Diamond02Icon,
  KidIcon,
  MountainIcon,
  Building06Icon,
  Camera02Icon,
  DashboardCircleAddIcon,
  Loading03Icon
} from 'hugeicons-react';
import { Quotation } from '@/types/studio';
import { useToast } from '@/hooks/use-toast';
import { shareQuotationDetails } from './QuotationPDFRenderer';
import ShareOptionsDialog from '@/components/common/ShareOptionsDialog';
import { downloadQuotationPDF } from './QuotationPDFRenderer';
import CentralizedCard from '@/components/common/CentralizedCard';
import CleanQuotationDiscountDialog, { DiscountData } from './CleanQuotationDiscountDialog';

interface QuotationCardGridProps {
  quotation: Quotation;
  onUpdate: () => void;
  onEdit?: (quotation: Quotation) => void;
  onDelete?: (id: string) => void;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  } | null;
}

const QuotationCardGrid = ({ quotation, onUpdate, onEdit, onDelete, firmData }: QuotationCardGridProps) => {
  const { toast } = useToast();
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedQuotationForShare, setSelectedQuotationForShare] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Memoize expiry check to prevent recalculation
  const isExpired = useMemo(() => {
    if (!quotation.valid_until) return false;
    const expiryDate = new Date(quotation.valid_until);
    const today = new Date();
    
    // Set both dates to midnight for date-only comparison
    expiryDate.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);
    
    return expiryDate < today;
  }, [quotation.valid_until]);

  const generatePDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const result = await downloadQuotationPDF(quotation);
      if (result.success) {
        toast({
          title: "PDF Downloaded!",
          description: "Quotation PDF has been downloaded successfully.",
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      toast({
        title: "Error generating PDF",
        description: "Failed to create PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [quotation, toast]);

  const handleShare = useCallback((quotation: any) => {
    setSelectedQuotationForShare(quotation);
    setShareDialogOpen(true);
    setIsSharing(true);
  }, []);

  const handleDirectToClient = async () => {
    if (!selectedQuotationForShare) return;
    
    const clientPhone = selectedQuotationForShare.client?.phone;
    if (!clientPhone || clientPhone.trim() === '') {
      toast({
        title: "No Phone Number",
        description: "Client doesn't have a phone number for WhatsApp sharing. Please add a phone number to the client profile first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await shareQuotationDetails(selectedQuotationForShare, 'direct');
      if (result.success) {
        toast({
          title: "Sent to Client!",
          description: `Quotation sent to ${selectedQuotationForShare.client.name} via WhatsApp`
        });
      } else {
        toast({
          title: "WhatsApp Error",
          description: result.error || "Failed to send quotation to client",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send quotation to client';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCustomShare = async () => {
    if (!selectedQuotationForShare) return;
    
    try {
      const result = await shareQuotationDetails(selectedQuotationForShare, 'custom');
      if (result.success) {
        let title = "Shared Successfully!";
        let description = "Quotation shared successfully";
        
        if ('method' in result) {
          const shareResult = result as any;
          if (shareResult.method === 'download') {
            title = "Download Complete!";
            description = "PDF downloaded successfully";
          } else if (shareResult.method === 'text_share_with_download') {
            title = "Shared with PDF!";
            description = "Details shared and PDF downloaded for manual sharing";
          }
        }
        
        toast({
          title,
          description
        });
      } else {
        throw new Error('Share failed');
      }
    } catch (error) {
      console.error('Error sharing quotation:', error);
      toast({
        title: "Error", 
        description: "Failed to share quotation",
        variant: "destructive"
      });
    }
  };

  const originalAmount = quotation.amount || 0;
  const hasDiscount = quotation.discount_type && quotation.discount_value && quotation.discount_value > 0;
  const discountedAmount = hasDiscount ? originalAmount - (quotation.discount_amount || 0) : originalAmount;

  // Memoize event type icon and styling
  const eventTypeInfo = useMemo(() => {
    const iconConfig = {
      'Wedding': <FavouriteIcon className="h-4 w-4" />,
      'Pre-Wedding': <MountainIcon className="h-4 w-4" />,
      'Ring-Ceremony': <Diamond02Icon className="h-4 w-4" />,
      'Maternity Photography': <KidIcon className="h-4 w-4" />,
      'Birthday': <KidIcon className="h-4 w-4" />,
      'Corporate': <Building06Icon className="h-4 w-4" />,
      'Product': <Camera02Icon className="h-4 w-4" />,
      'Portrait': <ContactIcon className="h-4 w-4" />,
      'Other': <DashboardCircleAddIcon className="h-4 w-4" />
    };
    
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

    return {
      icon: iconConfig[quotation.event_type as keyof typeof iconConfig] || iconConfig.Other,
      style: iconStyles[quotation.event_type as keyof typeof iconStyles] || iconStyles.Other
    };
  }, [quotation.event_type]);

  // Memoize status calculations
  const statusInfo = useMemo(() => {
    const getStatusColor = () => {
      if (quotation.converted_to_event) return 'bg-green-100 text-green-800';
      if (quotation.valid_until && isExpired) return 'bg-red-100 text-red-800';
      return 'bg-blue-100 text-blue-800';
    };

    const getStatusText = () => {
      if (quotation.converted_to_event) return 'Converted';
      if (quotation.valid_until && isExpired) return 'Expired';
      return 'Active';
    };

    return {
      color: getStatusColor(),
      text: getStatusText()
    };
  }, [quotation.converted_to_event, quotation.valid_until, isExpired]);

  // No badges needed for simple quotation layout

  // Extract crew counts and add-ons from quotation_details
  const quotationDetails = quotation.quotation_details as any;
  const photographerCount = quotationDetails?.photographers || 0;
  const cinematographerCount = quotationDetails?.cinematographers || 0;
  const addOns = quotationDetails?.addOns || [];
  const addOnCount = Array.isArray(addOns) ? addOns.length : 0;
  const days = quotationDetails?.days || [];
  const totalDays = days.length || 1;

  // Memoize date formatting
  const formattedDateRange = useMemo(() => {
    const startDate = new Date(quotation.event_date);
    
    if (totalDays === 1) {
      return startDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      }).toUpperCase();
    } else {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + totalDays - 1);
      
      const startFormatted = startDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
      
      const endFormatted = endDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      }).toUpperCase();
      
      return `${startFormatted} - ${endFormatted}`;
    }
  }, [quotation.event_date, totalDays]);

  // Memoize metadata array
  const metadata = useMemo(() => [
    // Client (always show)
    {
      icon: <ContactIcon className="h-3.5 w-3.5 text-primary" />,
      value: quotation.client?.name || '~'
    },
    // Event Date Range (always show)
    {
      icon: <Calendar01Icon className="h-3.5 w-3.5 text-primary" />,
      value: formattedDateRange,
      isDate: true
    },
    // Venue (always show)
    {
      icon: <Location01Icon className="h-3.5 w-3.5 text-primary" />,
      value: quotation.venue || '~'
    },
    // Amount (always show) - with discount display
    {
      icon: <CreditCardIcon className="h-3.5 w-3.5 text-primary" />,
      value: hasDiscount ? (
        <div className="flex flex-col gap-1">
          <span className="line-through text-muted-foreground text-sm">
            ₹{originalAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-green-600 font-medium">
            ₹{discountedAmount.toLocaleString('en-IN')}
          </span>
        </div>
      ) : `₹${originalAmount.toLocaleString('en-IN')}`
    }
  ], [quotation.client?.name, formattedDateRange, quotation.venue, hasDiscount, originalAmount, discountedAmount]);

  // Memoize action handlers
  const handleEdit = useCallback(() => onEdit && onEdit(quotation), [onEdit, quotation]);
  const handleOpenDiscountDialog = useCallback(() => setDiscountDialogOpen(true), []);
  const handleShareClick = useCallback(() => handleShare(quotation), [handleShare, quotation]);
  const handleDelete = useCallback(() => onDelete && onDelete(quotation.id), [onDelete, quotation.id]);

  // Memoize actions array
  const actions = useMemo(() => [
    { label: 'Edit', onClick: handleEdit, variant: 'outline' as const, icon: <Edit02Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    { label: 'Discount', onClick: handleOpenDiscountDialog, variant: 'outline' as const, icon: <PercentIcon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} /> },
    { 
      label: 'Download', 
      onClick: generatePDF, 
      variant: 'outline' as const, 
      icon: isDownloading ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download01Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isDownloading
    },
    { 
      label: 'Share', 
      onClick: handleShareClick, 
      variant: 'outline' as const, 
      icon: isSharing ? (
        <Loading03Icon className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Share08Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.5} />
      ),
      disabled: isSharing
    },
    ...(onDelete ? [{ label: 'Delete', onClick: handleDelete, variant: 'outline' as const, icon: <Delete02Icon className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} /> }] : [])
  ], [handleEdit, handleOpenDiscountDialog, generatePDF, isDownloading, handleShareClick, isSharing, onDelete, handleDelete]);

  return (
    <CentralizedCard
      title={quotation.title}
      badges={[]} // Remove badges from top
      metadata={metadata}
      actions={actions}
      className="rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px]"
    >
      {/* Event Type Icon */}
      <div className="absolute top-4 right-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eventTypeInfo.style}`}>
          {eventTypeInfo.icon}
        </div>
      </div>
      {/* Status indicators - only show for active quotations */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {quotation.valid_until && !isExpired && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {Math.ceil((new Date(quotation.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} DAYS LEFT
            </span>
          </div>
        )}
      </div>
      
        <CleanQuotationDiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        quotation={quotation}
        onDiscountApplied={onUpdate}
      />

      <ShareOptionsDialog
        isOpen={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) setIsSharing(false);
        }}
        onDirectToClient={handleDirectToClient}
        onCustomShare={handleCustomShare}
        title="Share Quotation"
      />
    </CentralizedCard>
  );
};

export default QuotationCardGrid;