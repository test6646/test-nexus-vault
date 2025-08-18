import { useState } from 'react';
import { 
  UserIcon, 
  Calendar01Icon, 
  Location01Icon, 
  Edit02Icon, 
  Download01Icon, 
  Share01Icon,
  Clock03Icon,
  Camera01Icon,
  Video01Icon,
  Add01Icon,
  HardDriveIcon,
  CreditCardIcon,
  Discount01Icon
} from 'hugeicons-react';
import { Quotation } from '@/types/studio';
import { useToast } from '@/hooks/use-toast';
import { shareQuotationDetails } from './QuotationPDFRenderer';
import ShareOptionsDialog from '@/components/common/ShareOptionsDialog';
import { downloadQuotationPDF } from './QuotationPDFDownloader';
import CentralizedCard from '@/components/common/CentralizedCard';
import QuotationDiscountDialog, { DiscountData } from './QuotationDiscountDialog';

interface QuotationCardGridProps {
  quotation: Quotation;
  onUpdate: () => void;
  onEdit?: (quotation: Quotation) => void;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  } | null;
}

const QuotationCardGrid = ({ quotation, onUpdate, onEdit, firmData }: QuotationCardGridProps) => {
  const { toast } = useToast();
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedQuotationForShare, setSelectedQuotationForShare] = useState<any>(null);

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const generatePDF = async () => {
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
    }
  };

  const handleShare = (quotation: any) => {
    setSelectedQuotationForShare(quotation);
    setShareDialogOpen(true);
  };

  const handleDirectToClient = async () => {
    if (!selectedQuotationForShare) return;
    
    if (!selectedQuotationForShare.client?.phone) {
      toast({
        title: "No Phone Number",
        description: "Client doesn't have a phone number for WhatsApp sharing.",
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
  const hasDiscount = quotation.discount_type && quotation.discount_value;
  const discountedAmount = hasDiscount ? originalAmount - (quotation.discount_amount || 0) : originalAmount;

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

  const getStatusColor = () => {
    if (quotation.converted_to_event) return 'bg-green-100 text-green-800';
    if (quotation.valid_until && isExpired(quotation.valid_until)) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (quotation.converted_to_event) return 'Converted';
    if (quotation.valid_until && isExpired(quotation.valid_until)) return 'Expired';
    return 'Active';
  };

  // No badges needed for simple quotation layout

  // Extract crew counts and add-ons from quotation_details
  const quotationDetails = quotation.quotation_details as any;
  const photographerCount = quotationDetails?.photographers || 0;
  const cinematographerCount = quotationDetails?.cinematographers || 0;
  const addOns = quotationDetails?.addOns || [];
  const addOnCount = Array.isArray(addOns) ? addOns.length : 0;
  const days = quotationDetails?.days || [];
  const totalDays = days.length || 1;

  // Helper function to format date range
  const formatDateRange = () => {
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
  };

  const metadata = [
    // Event Type (always show) - with colored icon
    {
      icon: (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventTypeIconStyle(quotation.event_type)}`}>
          <HardDriveIcon className="h-4 w-4" />
        </div>
      ),
      value: quotation.event_type
    },
    // Client (always show)
    {
      icon: <UserIcon className="h-4 w-4 text-primary" />,
      value: quotation.client?.name || 'Client Not Set'
    },
    // Event Date Range (always show)
    {
      icon: <Calendar01Icon className="h-4 w-4 text-primary" />,
      value: formatDateRange(),
      isDate: true
    },
    // Venue (always show)
    {
      icon: <Location01Icon className="h-4 w-4 text-primary" />,
      value: quotation.venue || 'Venue Not Set'
    },
    // Add-ons (always show)
    {
      icon: <Add01Icon className="h-4 w-4 text-primary" />,
      value: addOnCount > 0 
        ? `${addOnCount} Add-on${addOnCount > 1 ? 's' : ''} included` 
        : 'No Add-ons'
    },
    // Amount (always show) - with discount display
    {
      icon: <CreditCardIcon className="h-4 w-4 text-primary" />,
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
  ];

  const actions = [
    { label: 'Edit', onClick: () => onEdit && onEdit(quotation), variant: 'outline' as const, icon: <Edit02Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> },
    { label: 'Discount', onClick: () => setDiscountDialogOpen(true), variant: 'outline' as const, icon: <Discount01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> },
    { label: 'Download', onClick: generatePDF, variant: 'outline' as const, icon: <Download01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> },
    { label: 'Share', onClick: () => handleShare(quotation), variant: 'outline' as const, icon: <Share01Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} /> }
  ];

  return (
    <CentralizedCard
      title={quotation.title}
      badges={[]} // Remove badges from top
      metadata={metadata}
      actions={actions}
      className="rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px]"
    >
      {/* Status indicators - only show for active quotations */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {quotation.valid_until && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {Math.ceil((new Date(quotation.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} DAYS LEFT
            </span>
          </div>
        )}
      </div>
      
        <QuotationDiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        quotation={quotation}
        onDiscountApplied={onUpdate}
      />

      <ShareOptionsDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onDirectToClient={handleDirectToClient}
        onCustomShare={handleCustomShare}
        title="Share Quotation"
      />
    </CentralizedCard>
  );
};

export default QuotationCardGrid;