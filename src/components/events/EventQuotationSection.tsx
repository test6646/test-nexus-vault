import { Quotation } from '@/types/studio';
import SmartClientQuotationSelector from './SmartClientQuotationSelector';

interface EventQuotationSectionProps {
  currentEvent: any;
  selectedQuotation: Quotation | null;
  existingQuotation: Quotation | null;
  onQuotationSelect: (quotation: Quotation | null) => void;
  clientId: string;
}

const EventQuotationSection: React.FC<EventQuotationSectionProps> = ({
  currentEvent,
  selectedQuotation,
  existingQuotation,
  onQuotationSelect,
  clientId
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Quotation Selection</h3>
      
      <SmartClientQuotationSelector
        selectedClientId={clientId}
        onQuotationSelect={onQuotationSelect}
        selectedQuotationId={selectedQuotation?.id}
        isEditMode={!!currentEvent}
        existingQuotation={existingQuotation}
      />
    </div>
  );
};

export default EventQuotationSection;