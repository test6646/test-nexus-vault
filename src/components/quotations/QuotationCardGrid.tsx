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
import { generateQuotationPDF, shareQuotationDetails, downloadQuotationPDF } from './QuotationPDFRenderer';
import CentralizedCard from '@/components/common/CentralizedCard';
import QuotationDiscountDialog, { DiscountData } from './QuotationDiscountDialog';

interface QuotationCardGridProps {
  quotation: Quotation;
  onUpdate: () => void;
  onEdit?: (quotation: Quotation) => void;
  
}

const QuotationCardGrid = ({ quotation, onUpdate, onEdit }: QuotationCardGridProps) => {
  const { toast } = useToast();
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);

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

  const handleShare = async () => {
    try {
      const result = await shareQuotationDetails(quotation);
      if (result.success) {
        let title = "Shared successfully!";
        let description = "Quotation has been shared";
        
        switch (result.method) {
          case 'file_share':
            title = "PDF Shared!";
            description = "Quotation PDF has been shared directly";
            break;
          case 'text_share_with_download':
            title = "Shared with PDF!";
            description = "Details shared and PDF downloaded for manual sharing";
            break;
          case 'clipboard_with_download':
            title = "Copied & Downloaded!";
            description = "Details copied to clipboard and PDF downloaded";
            break;
          case 'download_only':
            title = "PDF Downloaded!";
            description = "PDF downloaded - share it manually from your downloads";
            break;
        }
        
        toast({
          title,
          description,
        });
      } else {
        throw new Error('Sharing failed');
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to share quotation details",
        variant: "destructive",
      });
    }
  };

  const originalAmount = quotation.amount || 0;
  const hasDiscount = quotation.discount_type && quotation.discount_value;
  const discountedAmount = hasDiscount ? originalAmount - (quotation.discount_amount || 0) : originalAmount;

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      'Wedding': 'bg-red-100 text-red-800',
      'Pre-Wedding': 'bg-pink-100 text-pink-800',
      'Birthday': 'bg-yellow-100 text-yellow-800',
      'Corporate': 'bg-blue-100 text-blue-800',
      'Product': 'bg-green-100 text-green-800',
      'Portrait': 'bg-purple-100 text-purple-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[eventType as keyof typeof colors] || colors.Other;
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

  // Remove badges from card and include all details in metadata instead
  const badges = [
    { label: quotation.event_type, color: getEventTypeColor(quotation.event_type) },
    { label: getStatusText(), color: getStatusColor() }
  ];

  // Extract crew counts and add-ons from quotation_details
  const quotationDetails = quotation.quotation_details as any;
  const photographerCount = quotationDetails?.photographers || 0;
  const videographerCount = quotationDetails?.videographers || 0;
  const addOns = quotationDetails?.addOns || [];
  const addOnCount = Array.isArray(addOns) ? addOns.length : 0;

  const metadata = [
    // Event Type
    {
      icon: <HardDriveIcon className="h-4 w-4 text-primary" />,
      value: quotation.event_type
    },
    // Client
    ...(quotation.client?.name ? [{
      icon: <UserIcon className="h-4 w-4 text-primary" />,
      value: quotation.client.name
    }] : []),
    // Event Date
    {
      icon: <Calendar01Icon className="h-4 w-4 text-primary" />,
      value: new Date(quotation.event_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      }),
      isDate: true
    },
    // Venue
    ...(quotation.venue ? [{
      icon: <Location01Icon className="h-4 w-4 text-primary" />,
      value: quotation.venue
    }] : []),
    // Photographers
    ...(photographerCount > 0 ? [{
      icon: <Camera01Icon className="h-4 w-4 text-primary" />,
      value: `${photographerCount} Photographer${photographerCount > 1 ? 's' : ''}`
    }] : []),
    // Videographers
    ...(videographerCount > 0 ? [{
      icon: <Video01Icon className="h-4 w-4 text-primary" />,
      value: `${videographerCount} Videographer${videographerCount > 1 ? 's' : ''}`
    }] : []),
    // Add-ons
    ...(addOnCount > 0 ? [{
      icon: <Add01Icon className="h-4 w-4 text-primary" />,
      value: `${addOnCount} Add-on${addOnCount > 1 ? 's' : ''} included`
    }] : []),
    // Valid Until
    ...(quotation.valid_until ? [{
      icon: <Clock03Icon className="h-4 w-4 text-primary" />,
      value: `Valid until ${new Date(quotation.valid_until).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      })}`
    }] : []),
    // Amount - with discount display
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
    { label: 'Edit', onClick: () => onEdit && onEdit(quotation), variant: 'default' as const, icon: <Edit02Icon className="h-4 w-4" /> },
    { label: 'Discount', onClick: () => setDiscountDialogOpen(true), variant: 'outline' as const, icon: <Discount01Icon className="h-4 w-4" /> },
    { label: 'Download', onClick: generatePDF, variant: 'outline' as const, icon: <Download01Icon className="h-4 w-4" /> },
    { label: 'Share', onClick: handleShare, variant: 'outline' as const, icon: <Share01Icon className="h-4 w-4" /> }
  ];

  return (
    <CentralizedCard
      title={quotation.title}
      badges={[]} // Remove badges from top
      metadata={metadata}
      actions={actions}
      className="rounded-2xl border border-border relative min-h-[500px] sm:min-h-[520px]"
    >
      {/* Status indicators */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {quotation.converted_to_event && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-muted-foreground">CONVERTED</span>
          </div>
        )}
        {quotation.valid_until && !quotation.converted_to_event && (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${!isExpired(quotation.valid_until) ? 'bg-primary' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-muted-foreground">
              {!isExpired(quotation.valid_until) 
                ? `${Math.ceil((new Date(quotation.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} DAYS LEFT`
                : 'EXPIRED'
              }
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
    </CentralizedCard>
  );
};

export default QuotationCardGrid;