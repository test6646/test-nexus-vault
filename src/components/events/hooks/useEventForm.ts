import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Event, Client, EventFormData, Quotation } from '@/types/studio';
import { sanitizeUuidFields } from '@/lib/uuid-utils';
import type { Database } from '@/integrations/supabase/types';

type EventType = Database['public']['Enums']['event_type'];

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

export const useEventForm = (
  currentEvent: Event | null,
  open: boolean,
  onSuccess: () => void,
  onOpenChange: (open: boolean) => void
) => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    total_amount: 0,
  });

  const [extendedData, setExtendedData] = useState({
    advance_amount: 0,
    total_days: 1,
    same_day_editor: false,
  });

  const [sameDayEditors, setSameDayEditors] = useState<string[]>(['']);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [existingQuotation, setExistingQuotation] = useState<Quotation | null>(null);
  const [isEventFromQuotation, setIsEventFromQuotation] = useState(false);

  // Load initial data when dialog opens
  useEffect(() => {
    if (open) {
      setFormLoading(true);
      loadAllRequiredData();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        resetForm();
        setSelectedQuotation(null);
        setExistingQuotation(null);
        setIsEventFromQuotation(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const loadAllRequiredData = async () => {
    if (!currentFirmId) return;

    try {
      console.log('=== LOADING ALL REQUIRED DATA ===');
      
      const [clientsResult, staffResult, freelancersResult] = await Promise.all([
        supabase.from('clients').select('*').eq('firm_id', currentFirmId).order('name'),
        supabase.from('profiles').select('id, full_name, role, mobile_number').eq('firm_id', currentFirmId).order('full_name'),
        supabase.from('freelancers').select('id, full_name, role, phone, email').eq('firm_id', currentFirmId).order('full_name')
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (staffResult.error) throw staffResult.error;
      if (freelancersResult.error) throw freelancersResult.error;

      setClients(clientsResult.data || []);
      setAllStaff(staffResult.data || []);
      setFreelancers(freelancersResult.data || []);
      
      console.log('Base data loaded:', {
        clients: clientsResult.data?.length,
        staff: staffResult.data?.length,
        freelancers: freelancersResult.data?.length
      });

      if (currentEvent) {
        console.log('=== LOADING COMPLETE EVENT DATA FOR EDIT ===');
        await populateFormWithCompleteData();
      } else {
        resetForm();
      }
    } catch (error: any) {
      console.error('Error loading required data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const populateFormWithCompleteData = async () => {
    if (!currentEvent) return;

    try {
      console.log('=== FETCHING COMPLETE EVENT DATA ===');
      
      const { data: completeEvent, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(*),
          quotation_source:quotations(
            id,
            quotation_details
          ),
          event_staff_assignments(
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers(id, full_name, role)
          )
        `)
        .eq('id', currentEvent.id)
        .single();

      if (error) throw error;
      
      console.log('Complete event data loaded:', completeEvent);

      // Extract quotation details if event was created from quotation
      let quotationDetails = null;
      let quotationSource = null;
      if (completeEvent.quotation_source && Array.isArray(completeEvent.quotation_source) && completeEvent.quotation_source[0]) {
        quotationDetails = completeEvent.quotation_source[0].quotation_details;
        quotationSource = completeEvent.quotation_source[0];
      }

      // Set existing quotation state for edit mode
      if (quotationSource) {
        setIsEventFromQuotation(true);
        const { data: completeQuotation, error: quotationError } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', quotationSource.id)
          .single();
        
        if (quotationError) {
          console.error('Error fetching complete quotation:', quotationError);
          setExistingQuotation(quotationSource);
        } else {
          setExistingQuotation(completeQuotation);
        }
      } else {
        setIsEventFromQuotation(false);
        setExistingQuotation(null);
      }

      // Populate form with complete data
      setFormData({
        title: completeEvent.title || '',
        client_id: completeEvent.client_id || '',
        event_type: completeEvent.event_type || 'Wedding',
        event_date: completeEvent.event_date || '',
        venue: completeEvent.venue || '',
        description: completeEvent.description || '',
        total_amount: completeEvent.total_amount || 0,
      });

      setExtendedData({
        advance_amount: completeEvent.advance_amount || 0,
        total_days: completeEvent.total_days || 1,
        same_day_editor: completeEvent.same_day_editor || false,
      });

      // Store quotation details for assignment processing
      if (quotationDetails) {
        (completeEvent as any).quotation_details = quotationDetails;
      }

      return { completeEvent, quotationDetails };
    } catch (error: any) {
      console.error('Error loading complete event data:', error);
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      client_id: '',
      event_type: 'Wedding',
      event_date: '',
      venue: '',
      description: '',
      total_amount: 0,
    });
    
    setExtendedData({
      advance_amount: 0,
      total_days: 1,
      same_day_editor: false,
    });

    setSameDayEditors(['']);
  };

  const handleQuotationSelect = (quotation: Quotation | null) => {
    setSelectedQuotation(quotation);
    if (quotation?.quotation_details) {
      const qDetails = quotation.quotation_details;
      
      setFormData(prev => ({
        ...prev,
        client_id: quotation.client_id || prev.client_id,
        event_type: (qDetails.eventType as EventType) || prev.event_type,
        venue: qDetails.venue || prev.venue,
        total_amount: qDetails.totalAmount || prev.total_amount,
      }));

      setExtendedData(prev => ({
        ...prev,
        advance_amount: qDetails.advanceAmount || prev.advance_amount,
        total_days: qDetails.days?.length || prev.total_days,
        same_day_editor: qDetails.sameDayEditing || prev.same_day_editor,
      }));

      return qDetails;
    }
    return null;
  };

  // Combine staff and freelancers, then filter by role
  const allCombinedPeople = [
    ...allStaff.map(s => ({ ...s, source: 'staff' })),
    ...freelancers.map(f => ({ ...f, source: 'freelancer' }))
  ];
  
  const photographers = allCombinedPeople.filter(p => 
    p.role === 'Photographer' || p.role === 'Admin' || p.role?.toLowerCase().includes('photographer')
  );
  const cinematographers = allCombinedPeople.filter(p => 
    p.role === 'Cinematographer' || p.role === 'Admin' || p.role?.toLowerCase().includes('cinematographer')
  );
  const dronePilots = allCombinedPeople.filter(p => 
    p.role === 'Drone Pilot' || p.role === 'Admin' || p.role?.toLowerCase().includes('drone')
  );
  const editors = allCombinedPeople.filter(p => 
    p.role === 'Editor' || p.role === 'Admin' || p.role?.toLowerCase().includes('editor')
  );

  return {
    // State
    loading,
    formLoading,
    clients,
    allStaff,
    freelancers,
    formData,
    extendedData,
    sameDayEditors,
    selectedQuotation,
    existingQuotation,
    isEventFromQuotation,
    
    // Filtered people
    allCombinedPeople,
    photographers,
    cinematographers,
    dronePilots,
    editors,
    
    // Setters
    setLoading,
    setFormData,
    setExtendedData,
    setSameDayEditors,
    
    // Functions
    handleQuotationSelect,
    populateFormWithCompleteData,
    resetForm,
    
    // Utils
    profile,
    toast,
  };
};