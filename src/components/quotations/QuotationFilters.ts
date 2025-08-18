
import { Quotation } from '@/types/studio';

export const isExpired = (validUntil: string | null) => {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
};

export const filterAndSortQuotations = (
  quotations: Quotation[],
  searchQuery: string,
  statusFilter: string,
  sortBy: string,
  sortDirection: 'asc' | 'desc'
) => {
  return quotations
    .filter(quotation => {
      // Hide converted quotations completely
      if (quotation.converted_to_event) return false;
      
      // Hide expired quotations completely
      if (quotation.valid_until && isExpired(quotation.valid_until)) return false;
      
      // Search filter
      const matchesSearch = quotation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           quotation.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           quotation.venue?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'event_date':
          aValue = new Date(a.event_date).getTime();
          bValue = new Date(b.event_date).getTime();
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'valid_until':
          aValue = a.valid_until ? new Date(a.valid_until).getTime() : 0;
          bValue = b.valid_until ? new Date(b.valid_until).getTime() : 0;
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
};
