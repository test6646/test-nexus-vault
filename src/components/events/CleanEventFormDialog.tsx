import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar03Icon, UserGroupIcon, Camera02Icon, VideoReplayIcon, AdobePremierIcon, Add01Icon, Remove01Icon, DroneIcon } from 'hugeicons-react';
import { Switch } from '@/components/ui/switch';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Event, Client, EventFormData, Quotation } from '@/types/studio';
import { sanitizeUuidFields } from '@/lib/uuid-utils';

import type { Database } from '@/integrations/supabase/types';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import SmartClientQuotationSelector from './SmartClientQuotationSelector';
import { DEFAULT_PAYMENT_METHOD, getPaymentMethodOptions, PaymentMethod } from '@/lib/payment-method-validator';


type EventType = Database['public']['Enums']['event_type'];

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

interface CleanEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  editingEvent?: Event | null;
  onSuccess: () => void;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'Ring-Ceremony', label: 'Ring Ceremony' },
  { value: 'Pre-Wedding', label: 'Pre-Wedding' },
  { value: 'Wedding', label: 'Wedding' },
  { value: 'Maternity Photography', label: 'Maternity Photography' },
  { value: 'Others', label: 'Others' }
];

const CleanEventFormDialog = ({ open, onOpenChange, event, editingEvent, onSuccess }: CleanEventFormDialogProps) => {
  const currentEvent = editingEvent || event;
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const { syncItemToSheets } = useGoogleSheetsSync();
  
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  
  // Initialize form data with proper default values
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    total_amount: 0,
    // Using event_staff_assignments table instead
  });

  const [extendedData, setExtendedData] = useState({
    advance_amount: 0,
    total_days: 1,
    same_day_editor: false,
    advance_payment_method: DEFAULT_PAYMENT_METHOD as PaymentMethod,
  });

  const [sameDayEditors, setSameDayEditors] = useState<string[]>(['']);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [existingQuotation, setExistingQuotation] = useState<Quotation | null>(null);
  const [isEventFromQuotation, setIsEventFromQuotation] = useState(false);
  const [venueSuggestions, setVenueSuggestions] = useState<string[]>([]);

  // Check if quotation has same day editing enabled
  const quotationHasSameDayEditing = selectedQuotation?.quotation_details?.sameDayEditing === true;

  const [multiDayAssignments, setMultiDayAssignments] = useState<Array<{
    day: number;
    photographer_ids: string[];
    cinematographer_ids: string[];
    editor_id: string;
    drone_pilot_id: string;
  }>>([]);

  // Combine staff and freelancers, then filter by role - more inclusive filtering
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
  
  // Load initial data when dialog opens - WAIT FOR ALL DATA BEFORE PROCEEDING
  useEffect(() => {
    if (open) {
      setFormLoading(true);
      loadAllRequiredData();
    }
  }, [open]);

  // Combined data loading and form population effect
  const loadAllRequiredData = async () => {
    if (!currentFirmId) return;

    try {
      // STEP 1: Load all base data first
      // Loading all required data
      
      const [clientsResult, staffResult, freelancersResult, venuesResult] = await Promise.all([
        supabase.from('clients').select('*').eq('firm_id', currentFirmId).order('name'),
        supabase.from('profiles').select('id, full_name, role, mobile_number').eq('firm_id', currentFirmId).order('full_name'),
        supabase.from('freelancers').select('id, full_name, role, phone, email').eq('firm_id', currentFirmId).order('full_name'),
        // Load unique venues from both events and quotations
        Promise.all([
          supabase.from('events').select('venue').eq('firm_id', currentFirmId).not('venue', 'is', null).not('venue', 'eq', ''),
          supabase.from('quotations').select('venue').eq('firm_id', currentFirmId).not('venue', 'is', null).not('venue', 'eq', '')
        ])
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (staffResult.error) throw staffResult.error;
      if (freelancersResult.error) throw freelancersResult.error;

      setClients(clientsResult.data || []);
      setAllStaff(staffResult.data || []);
      setFreelancers(freelancersResult.data || []);
      
      // Process venue suggestions
      const venues = new Set<string>();
      const [eventsData, quotationsData] = venuesResult;
      
      if (eventsData.data) {
        eventsData.data.forEach(item => {
          if (item.venue && item.venue.trim()) venues.add(item.venue.trim());
        });
      }
      
      if (quotationsData.data) {
        quotationsData.data.forEach(item => {
          if (item.venue && item.venue.trim()) venues.add(item.venue.trim());
        });
      }
      
      setVenueSuggestions(Array.from(venues).sort());
      
      console.log('Base data loaded:', {
        clients: clientsResult.data?.length,
        staff: staffResult.data?.length,
        freelancers: freelancersResult.data?.length
      });

      // STEP 2: If editing, fetch complete event data and populate form
      if (currentEvent) {
        // Loading complete event data for edit
        await populateFormWithCompleteData();
      } else {
        // STEP 3: If creating new, just reset form
        resetForm();
      }
    } catch (error: any) {
      // Error loading required data
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

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

  const loadData = async () => {
    if (!currentFirmId) return;
    
    try {
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('name');

      if (clientsError) throw clientsError;

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, role, mobile_number')
        .eq('firm_id', currentFirmId)
        .order('full_name');

      if (staffError) throw staffError;

      // Load freelancers
      const { data: freelancersData, error: freelancersError } = await supabase
        .from('freelancers')
        .select('id, full_name, role, phone, email')
        .eq('firm_id', currentFirmId)
        .order('full_name');

      if (freelancersError) throw freelancersError;

      setClients(clientsData || []);
      setAllStaff(staffData || []);
      setFreelancers(freelancersData || []);
    } catch (error: any) {
      
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const populateFormWithCompleteData = async () => {
    if (!currentEvent) return;

    try {
      
      
      // Fetch complete event with all relations including staff assignments with freelancer data AND quotation details
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
      
      

      // Extract quotation details if event was created from quotation
      let quotationDetails = null;
      let quotationSource = null;
      

      // Set existing quotation state for edit mode
      if (quotationSource) {
        setIsEventFromQuotation(true);
        // Fetch complete quotation details
        const { data: completeQuotation, error: quotationError } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', quotationSource.id)
          .single();
        
        if (quotationError) {
          
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
        // Using event_staff_assignments table instead
      });

      setExtendedData({
        advance_amount: completeEvent.advance_amount || 0,
        total_days: completeEvent.total_days || 1,
        same_day_editor: completeEvent.same_day_editor || false,
        advance_payment_method: (completeEvent as any).advance_payment_method || (DEFAULT_PAYMENT_METHOD as PaymentMethod),
      });

      // Store quotation details in currentEvent for use in assignment processing
      if (quotationDetails) {
        (completeEvent as any).quotation_details = quotationDetails;
      }

      // CRITICAL: Wait a moment for React to process the state updates
      // before processing assignments to ensure allCombinedPeople is available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Load and process staff assignments with proper freelancer support
      if (completeEvent.event_staff_assignments?.length > 0) {
        await processExistingStaffAssignments(completeEvent.event_staff_assignments, completeEvent);
      } else {
        // CRITICAL FIX: Always use the hook's processExistingStaffAssignments method
        // even when no assignments exist, so it properly applies quotation details
        await processExistingStaffAssignments([], completeEvent);
      }

      
    } catch (error: any) {
      
      throw error;
    }
  };

  const processExistingStaffAssignments = async (assignments: any[], eventData?: any) => {
    console.log('=== PROCESSING EXISTING STAFF ASSIGNMENTS ===');
    console.log('Raw assignments:', assignments);
    console.log('Available staff and freelancers:', {
      staff: allStaff.length,
      freelancers: freelancers.length,
      combinedPeople: allCombinedPeople.length
    });
    
    // Group assignments by day and role, handling both staff and freelancers
    const groupedByDay = new Map();
    
    assignments.forEach(assignment => {
      const dayKey = assignment.day_number;
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          day: dayKey,
          photographer_ids: [],
          cinematographer_ids: [],
          editor_id: '',
          drone_pilot_id: '',
          same_day_editor_ids: []
        });
      }
      
      const dayData = groupedByDay.get(dayKey);
      
      // FIXED: Get the correct ID - either staff_id or freelancer_id
      const assigneeId = assignment.staff_id || assignment.freelancer_id;
      const staffType = assignment.staff_id ? 'staff' : 'freelancer';
      
      console.log(`Processing assignment: Role=${assignment.role}, Day=${assignment.day_number}, AssigneeId=${assigneeId}, Type=${staffType}`);
      
      // Verify the assignee exists in our combined list
      const assigneeExists = allCombinedPeople.find(person => person.id === assigneeId);
      if (!assigneeExists) {
        console.warn(`⚠️ Assignee ${assigneeId} not found in available staff/freelancers`);
      }
      
      if (assigneeId) {
        if (assignment.role === 'Photographer') {
          dayData.photographer_ids.push(assigneeId);
        } else if (assignment.role === 'Cinematographer') {
          dayData.cinematographer_ids.push(assigneeId);
        } else if (assignment.role === 'Editor') {
          dayData.editor_id = assigneeId;
        } else if (assignment.role === 'Drone Pilot') {
          dayData.drone_pilot_id = assigneeId;
        } else if (assignment.role === 'Same Day Editor') {
          dayData.same_day_editor_ids.push(assigneeId);
        }
      } else {
        console.warn('⚠️ Assignment with no valid ID:', assignment);
      }
    });
    
    // Get quotation details for proper slot calculation
    const quotationDetails = eventData?.quotation_details || (currentEvent as any)?.quotation_details;
    console.log('Event quotation details:', quotationDetails);
    
    // Convert map to array and ensure all days are represented
    const totalDays = eventData?.total_days || (currentEvent as any)?.total_days || 1;
    const processedAssignments = [];
    
    for (let day = 1; day <= totalDays; day++) {
      const dayData = groupedByDay.get(day) || {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        editor_id: '',
        drone_pilot_id: '',
        same_day_editor_ids: []
      };
      
      // CRITICAL FIX: Use quotation data to determine required slots for editing
      if (quotationDetails?.days) {
        const dayConfig = quotationDetails.days[day - 1];
        if (dayConfig) {
          const requiredPhotographers = dayConfig.photographers || 0;
          const requiredCinematographers = dayConfig.cinematographers || 0;
          const requiredDrone = dayConfig.drone || 0;
          
          console.log(`Day ${day} quotation requirements:`, {
            photographers: requiredPhotographers,
            cinematographers: requiredCinematographers,
            drone: requiredDrone
          });
          
          // Ensure we have the correct number of slots based on quotation
          // Fill existing assignments first, then add empty slots to reach required count
          while (dayData.photographer_ids.length < requiredPhotographers) {
            dayData.photographer_ids.push('');
          }
          
          while (dayData.cinematographer_ids.length < requiredCinematographers) {
            dayData.cinematographer_ids.push('');
          }
          
          // For drone pilot, ensure we have slot if required (single assignment)
          if (requiredDrone > 0 && !dayData.drone_pilot_id) {
            dayData.drone_pilot_id = '';
          }
        }
        }
      
      // Editors are single assignments, keep as-is
      if (!dayData.editor_id) {
        dayData.editor_id = '';
      }
      
      // Only initialize drone_pilot_id if not already handled by quotation requirements
      if (!dayData.drone_pilot_id && !quotationDetails?.days) {
        dayData.drone_pilot_id = '';
      }
        
      processedAssignments.push(dayData);
    }
    
    console.log('Processed staff assignments by day (with quotation requirements):', processedAssignments);
    
    // DEBUG: Verify assignments are matching available staff/freelancers
    processedAssignments.forEach(dayData => {
      console.log(`Day ${dayData.day} assignments check:`);
      
      dayData.photographer_ids.forEach((id, index) => {
        const person = allCombinedPeople.find(p => p.id === id);
        console.log(`  Photographer ${index + 1} - ${id}: ${person ? `✅ ${person.full_name} (${person.source})` : id ? '❌ NOT FOUND' : '⭕ Empty slot'}`);
      });
      
      dayData.cinematographer_ids.forEach((id, index) => {
        const person = allCombinedPeople.find(p => p.id === id);
        console.log(`  Cinematographer ${index + 1} - ${id}: ${person ? `✅ ${person.full_name} (${person.source})` : id ? '❌ NOT FOUND' : '⭕ Empty slot'}`);
      });
    });
    
    setMultiDayAssignments(processedAssignments);
    
    // Handle same day editors separately
    const allSameDayEditors = assignments
      .filter(a => a.role === 'Same Day Editor')
      .map(a => a.staff_id || a.freelancer_id);
    
    if (allSameDayEditors.length > 0) {
      console.log('Found same day editors:', allSameDayEditors);
      setSameDayEditors([...allSameDayEditors, '']);
      setExtendedData(prev => ({
        ...prev,
        same_day_editor: true
      }));
    }
  };

  const loadEventStaffAssignments = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_staff_assignments')
        .select('*')
        .eq('event_id', eventId)
        .order('day_number');

      if (error) throw error;

      if (data && data.length > 0) {
        console.log('=== STAFF ASSIGNMENTS PROCESSING ===');
        console.log('Raw staff assignments data:', data);
        
        // Group assignments by day and role
        const groupedByDay = new Map();
        
        data.forEach(assignment => {
          const dayKey = assignment.day_number;
          if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          day: dayKey,
          photographer_ids: [],
          cinematographer_ids: [],
          editor_id: '',
          drone_pilot_id: '',
          same_day_editor_ids: []
        });
          }
          
          const dayData = groupedByDay.get(dayKey);
          
        if (assignment.role === 'Photographer') {
          dayData.photographer_ids.push(assignment.staff_id);
        } else if (assignment.role === 'Cinematographer') {
          dayData.cinematographer_ids.push(assignment.staff_id);
        } else if (assignment.role === 'Editor') {
          dayData.editor_id = assignment.staff_id;
        } else if (assignment.role === 'Drone Pilot') {
          dayData.drone_pilot_id = assignment.staff_id;
        } else if (assignment.role === 'Same Day Editor') {
          dayData.same_day_editor_ids.push(assignment.staff_id);
        }
        });
        
        // Convert map to array and ensure all days are represented
        const totalDays = (currentEvent as any)?.total_days || 1;
        const processedAssignments = [];
        
        for (let day = 1; day <= totalDays; day++) {
      const dayData = groupedByDay.get(day) || {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        editor_id: '',
        drone_pilot_id: '',
        same_day_editor_ids: []
      };
          
          // Only show assigned crew members, no empty slots unless needed
          dayData.photographer_ids = dayData.photographer_ids.length > 0 
            ? dayData.photographer_ids 
            : [''];
          dayData.cinematographer_ids = dayData.cinematographer_ids.length > 0 
            ? dayData.cinematographer_ids 
            : [''];
            
          processedAssignments.push(dayData);
        }
        
        console.log('Processed staff assignments by day:', processedAssignments);
        setMultiDayAssignments(processedAssignments);
        
        // Handle same day editors separately
        const allSameDayEditors = data
          .filter(a => a.role === 'Same Day Editor')
          .map(a => a.staff_id);
        
        if (allSameDayEditors.length > 0) {
          console.log('Found same day editors:', allSameDayEditors);
          setSameDayEditors([...allSameDayEditors, '']);
          setExtendedData(prev => ({
            ...prev,
            same_day_editor: true
          }));
        }
      } else {
        console.log('No existing staff assignments found');
        // No existing assignments, do not create default slots
        // Wait for quotation to determine proper slot structure
        setMultiDayAssignments([]);
      }
    } catch (error: any) {
      console.error('Error loading staff assignments:', error);
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
      // Using event_staff_assignments table instead
    });

    setExtendedData({
      advance_amount: 0,
      total_days: 1,
      same_day_editor: false,
      advance_payment_method: DEFAULT_PAYMENT_METHOD as PaymentMethod,
    });
    
    setSameDayEditors(['']);
    setMultiDayAssignments([
      { day: 1, photographer_ids: [''], cinematographer_ids: [''], editor_id: '', drone_pilot_id: '' }
    ]);
  };

  const handleQuotationSelect = (quotation: Quotation | null) => {
    setSelectedQuotation(quotation);
    
    if (quotation) {
      // Extract days from quotation details
      let totalDays = 1;
      
      if (quotation.quotation_details) {
        const details = quotation.quotation_details as any;
        
        // Check if days array exists and get its length
        if (details?.days && Array.isArray(details.days)) {
          totalDays = details.days.length;
        } else {
          // Fallback to other possible keys
          totalDays = details?.total_days || 
                     details?.duration_days ||
                     details?.event_days ||
                     (details?.duration ? parseInt(details.duration) : 1) ||
                     1;
        }

        // Check for same day editor in quotation details
        if (details?.sameDayEditorEnabled) {
          setExtendedData(prev => ({
            ...prev,
            same_day_editor: details.sameDayEditorEnabled,
          }));
        }
      }
      
      // Ensure totalDays is a valid number and within reasonable bounds
      if (isNaN(totalDays) || totalDays < 1) {
        totalDays = 1;
      }
      if (totalDays > 10) {
        totalDays = 10; // Cap at 10 days max
      }
      
      setFormData(prev => ({
        ...prev,
        title: quotation.title,
        event_type: quotation.event_type,
        event_date: quotation.event_date,
        venue: quotation.venue || '',
        description: quotation.description || '',
        total_amount: quotation.discount_amount ? quotation.amount - quotation.discount_amount : quotation.amount,
      }));

      setExtendedData(prev => ({
        ...prev,
        total_days: totalDays,
      }));

      // Initialize multi-day staff assignments based on extracted days and quotation crew config
      const dayAssignments = [];
      const quotationDetails = quotation.quotation_details as any;
      
      for (let i = 1; i <= totalDays; i++) {
        // Get quotation crew configuration for this day
        const dayConfig = quotationDetails?.days?.[i - 1];
        
        // Create exact number of dropdowns based on quotation counts
        const photographerCount = dayConfig?.photographers || 0;
        const cinematographerCount = dayConfig?.cinematographers || 0;
        const droneCount = dayConfig?.drone || 0;
        
        dayAssignments.push({
          day: i,
          photographer_ids: Array(photographerCount).fill(''),
          cinematographer_ids: Array(cinematographerCount).fill(''),
          editor_id: '',
          drone_pilot_id: droneCount > 0 ? '' : '', // Always initialize drone_pilot_id
        });
      }
      setMultiDayAssignments(dayAssignments);
    }
  };

  const calculateBalance = () => {
    return formData.total_amount - extendedData.advance_amount;
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Event date is required",
        variant: "destructive",
      });
      return false;
    }

    // Remove mandatory crew validation - make it optional
    // Crew assignments are now optional during event creation

    // Validate same day editor assignments
    if (quotationHasSameDayEditing) {
      const assignedEditors = sameDayEditors.filter(id => id && id.trim() !== '').length;
      if (assignedEditors === 0) {
        toast({
          title: "Validation Error",
          description: "At least one same day editor must be assigned",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFirmId || !validateForm()) return;

    setLoading(true);
    
    // IMMEDIATE UI RESPONSE - Show optimistic loading state
    toast({
      title: "Saving...",
      description: "Creating your event...",
    });

    try {
      const sanitizedFormData = sanitizeUuidFields(formData, [
        'client_id'
      ]);

      const eventData = {
        ...sanitizedFormData,
        ...extendedData,
        firm_id: currentFirmId,
        created_by: profile.id,
        balance_amount: calculateBalance(),
        quotation_source_id: selectedQuotation?.id || null,
        total_days: extendedData.total_days,
        same_day_editor: extendedData.same_day_editor,
        advance_payment_method: extendedData.advance_payment_method,
      };

      let result;
      if (currentEvent) {
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', currentEvent.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        // Critical operations only - staff assignments  
        console.log('Saving staff assignments for updated event:', result.id);
        await saveStaffAssignments(result.id);
        
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;

        // Critical operations only - staff assignments and quotation conversion
        await Promise.all([
          saveStaffAssignments(result.id),
          selectedQuotation ? supabase
            .from('quotations')
            .update({ converted_to_event: result.id })
            .eq('id', selectedQuotation.id) : Promise.resolve()
        ]);
      }

      // INSTANT SUCCESS RESPONSE
      const hasStaffAssigned = multiDayAssignments.some(day => 
        day.photographer_ids.some(id => id && id.trim() !== '') || 
        day.cinematographer_ids.some(id => id && id.trim() !== '') ||
        (day.editor_id && day.editor_id.trim() !== '')
      );
      
      toast({
        title: currentEvent ? "✅ Event Updated!" : "✅ Event Created!",
        description: currentEvent 
          ? "Event updated successfully" 
          : hasStaffAssigned 
            ? "Event created! Notifications being sent..."
            : "Event created successfully",
      });

      // Send event confirmation notification for new events
      if (!currentEvent && formData.client_id) {
        try {
          const client = clients.find(c => c.id === formData.client_id);
          if (client?.phone) {
            await supabase.functions.invoke('send-event-confirmation', {
              body: {
                clientName: client.name,
                clientPhone: client.phone,
                eventName: formData.title,
                eventDate: formData.event_date,
                venue: formData.venue || 'TBD',
                totalAmount: formData.total_amount || 0,
                firmId: currentFirmId,
                totalDays: extendedData.total_days || 1,
                eventEndDate: null // Will be calculated in the function based on totalDays
              }
            });
            console.log('Event confirmation notification sent');
          }
        } catch (error) {
          console.error('Failed to send event confirmation:', error);
        }
      }

      // IMMEDIATELY close dialog and refresh
      onSuccess();
      onOpenChange(false);
      
      // ALL BACKGROUND OPERATIONS - Run after UI updates
      setTimeout(() => {
        const runBackgroundTasks = async () => {
          try {
            const hasAssignedStaff = multiDayAssignments.some(day => 
              day.photographer_ids.some(id => id && id.trim() !== '') || 
              day.cinematographer_ids.some(id => id && id.trim() !== '') || 
              (day.editor_id && day.editor_id.trim() !== '')
            );

            // Background sync operations using centralized service
            await Promise.allSettled([
              supabase.functions.invoke('sync-event-to-calendar', {
                body: { eventId: result.id }
              }),
              // Use centralized Google Sheets sync service
              import('@/services/googleSheetsSync').then(({ syncEventInBackground }) => {
                syncEventInBackground(result.id, result.firm_id, currentEvent ? 'update' : 'create');
              }),
              sendEventNotifications(result.id, formData.title)
            ]);
            
            // Background operations completed
          } catch (error) {
            // Background operations completed with some errors (non-critical)
          }
        };
        
        runBackgroundTasks();
      }, 100);

    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({
        title: currentEvent ? "❌ Update Failed" : "❌ Creation Failed",
        description: error.message || "Please check all fields and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEventNotifications = async (eventId: string, eventTitle: string) => {
    try {
      // Get new assignments from storage (set during save)
      const newStaffAssignments = (window as any).newStaffAssignments || [];
      
      // If editing and no new assignments, skip notifications
      if (currentEvent && newStaffAssignments.length === 0) {
        console.log('No new staff assignments for edited event - skipping notifications');
        return;
      }

      // Get full event details for notifications
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone)
        `)
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        console.error('Error fetching event for notifications:', eventError);
        return;
      }

      // For new events, get all assignments; for edits, only get newly assigned staff
      let assignments;
      if (currentEvent) {
        // For edited events, only fetch assignments for newly added staff
        const newAssignmentIds = newStaffAssignments.map(a => a.staff_id || a.freelancer_id);
        if (newAssignmentIds.length === 0) return;
        
        const { data: newAssignmentData, error: assignmentError } = await supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role, mobile_number),
            freelancer:freelancers(id, full_name, role, phone, email)
          `)
          .eq('event_id', eventId)
          .or(newAssignmentIds.map(id => `staff_id.eq.${id},freelancer_id.eq.${id}`).join(','));
        
        assignments = newAssignmentData;
        console.log(`Sending notifications to ${assignments?.length || 0} newly assigned staff members`);
      } else {
        // For new events, get all assignments
        const { data: allAssignments, error: assignmentError } = await supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role, mobile_number),
            freelancer:freelancers(id, full_name, role, phone, email)
          `)
          .eq('event_id', eventId);
        
        assignments = allAssignments;
        console.log(`Sending notifications to ${assignments?.length || 0} assigned staff members for new event`);
      }

      if (!assignments || assignments.length === 0) {
        console.log('No assignments found for notifications');
        return;
      }

      // Send notifications to each assigned staff member via WhatsApp (firm-specific session)
      for (const assignment of assignments) {
        const isStaff = !!assignment.staff;
        const name = isStaff ? (assignment.staff as any).full_name : (assignment.freelancer as any)?.full_name;
        const phone = isStaff ? (assignment.staff as any).mobile_number : (assignment.freelancer as any)?.phone;
        
        if (!phone) {
          console.log(`Skipping ${name} - no phone available`);
          continue;
        }

        const body = {
          staffName: name,
          staffPhone: phone,
          eventName: eventData.title,
          role: assignment.role,
          dayNumber: assignment.day_number,
          totalDays: eventData.total_days,
          eventDate: eventData.event_date,
          eventEndDate: eventData.event_end_date,
          venue: eventData.venue,
          clientName: eventData.client?.name,
          clientPhone: eventData.client?.phone,
          firmId: eventData.firm_id || currentFirmId,
          notificationType: 'event_assignment' as const,
        };

        try {
          const { error } = await supabase.functions.invoke('send-staff-notification', { body });
          if (error) {
            console.error(`Failed to send WhatsApp notification to ${name}:`, error);
          } else {
            console.log(`✅ WhatsApp notification sent to ${name} for ${assignment.role} role`);
          }
        } catch (whatsappError) {
          console.error(`⚠️ WhatsApp notification error for ${name}:`, whatsappError);
        }
      }
    } catch (error) {
      console.error('Error in sendEventNotifications:', error);
    }
  };

  const saveStaffAssignments = async (eventId: string) => {
    try {
      console.log('=== SAVING STAFF ASSIGNMENTS ===');
      console.log('Event ID:', eventId);
      console.log('Current multiDayAssignments:', JSON.stringify(multiDayAssignments, null, 2));
      console.log('All staff available:', allStaff.length);
      console.log('All freelancers available:', freelancers.length);
      
      // Get existing assignments to track new ones for notifications
      const { data: existingAssignments, error: existingError } = await supabase
        .from('event_staff_assignments')
        .select('staff_id, freelancer_id, role, day_number')
        .eq('event_id', eventId);
      
      if (existingError) {
        console.error('Error fetching existing assignments:', existingError);
      }
      
      // Create a set of existing assignment keys for comparison
      const existingAssignmentKeys = new Set(
        (existingAssignments || []).map(a => 
          `${a.staff_id || a.freelancer_id}-${a.role}-${a.day_number}`
        )
      );
      
      // Delete existing assignments first for clean slate
      const { error: deleteError } = await supabase
        .from('event_staff_assignments')
        .delete()
        .eq('event_id', eventId);
        
      if (deleteError) {
        console.error('Error deleting existing assignments:', deleteError);
        throw deleteError;
      }

      // Create lookup maps for staff and freelancers
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      const freelancerMap = new Map(freelancers.map(f => [f.id, f]));
      const allStaffIds = new Set([...staffMap.keys(), ...freelancerMap.keys()]);
      
      console.log('Staff IDs available:', Array.from(staffMap.keys()));
      console.log('Freelancer IDs available:', Array.from(freelancerMap.keys()));

      // Insert new assignments with proper staff_type and freelancer support
      const assignments = [];
      
      for (const dayAssignment of multiDayAssignments) {
        console.log(`Processing day ${dayAssignment.day}:`, dayAssignment);
        
        const eventDate = new Date(formData.event_date);
        const dayDate = new Date(eventDate);
        dayDate.setDate(eventDate.getDate() + (dayAssignment.day - 1));

        // Add all photographers for this day (filter out empty strings and validate IDs)
        const validPhotographerIds = dayAssignment.photographer_ids.filter(id => id && id.trim() !== '');
        console.log(`Valid photographer IDs for day ${dayAssignment.day}:`, validPhotographerIds);
        
        validPhotographerIds.forEach(photographerId => {
          if (allStaffIds.has(photographerId)) {
            const isFreelancer = freelancerMap.has(photographerId);
            const person = isFreelancer ? freelancerMap.get(photographerId) : staffMap.get(photographerId);
            console.log(`Adding photographer assignment: ${person?.full_name} (${isFreelancer ? 'freelancer' : 'staff'})`);
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : photographerId,
              freelancer_id: isFreelancer ? photographerId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Photographer',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: currentFirmId,
            });
          } else {
            console.warn(`Invalid photographer ID: ${photographerId} - not found in available staff/freelancers`);
          }
        });

        // Add all cinematographers for this day (filter out empty strings and validate IDs)
        const validCinematographerIds = dayAssignment.cinematographer_ids.filter(id => id && id.trim() !== '');
        console.log(`Valid cinematographer IDs for day ${dayAssignment.day}:`, validCinematographerIds);
        
        validCinematographerIds.forEach(cinematographerId => {
          if (allStaffIds.has(cinematographerId)) {
            const isFreelancer = freelancerMap.has(cinematographerId);
            const person = isFreelancer ? freelancerMap.get(cinematographerId) : staffMap.get(cinematographerId);
            console.log(`Adding cinematographer assignment: ${person?.full_name} (${isFreelancer ? 'freelancer' : 'staff'})`);
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : cinematographerId,
              freelancer_id: isFreelancer ? cinematographerId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Cinematographer',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: currentFirmId,
            });
          } else {
            console.warn(`Invalid cinematographer ID: ${cinematographerId} - not found in available staff/freelancers`);
          }
        });

        // Add editor for this day (if assigned and valid)
        if (dayAssignment.editor_id && dayAssignment.editor_id.trim() !== '') {
          console.log(`Valid editor ID for day ${dayAssignment.day}:`, dayAssignment.editor_id);
          
          if (allStaffIds.has(dayAssignment.editor_id)) {
            const isFreelancer = freelancerMap.has(dayAssignment.editor_id);
            const person = isFreelancer ? freelancerMap.get(dayAssignment.editor_id) : staffMap.get(dayAssignment.editor_id);
            console.log(`Adding editor assignment: ${person?.full_name} (${isFreelancer ? 'freelancer' : 'staff'})`);
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : dayAssignment.editor_id,
              freelancer_id: isFreelancer ? dayAssignment.editor_id : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Editor',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: currentFirmId,
            });
          } else {
            console.warn(`Invalid editor ID: ${dayAssignment.editor_id} - not found in available staff/freelancers`);
          }
        }

        // Add drone pilot for this day (if assigned and valid)
        if (dayAssignment.drone_pilot_id && dayAssignment.drone_pilot_id.trim() !== '') {
          console.log(`Valid drone pilot ID for day ${dayAssignment.day}:`, dayAssignment.drone_pilot_id);
          
          if (allStaffIds.has(dayAssignment.drone_pilot_id)) {
            const isFreelancer = freelancerMap.has(dayAssignment.drone_pilot_id);
            const person = isFreelancer ? freelancerMap.get(dayAssignment.drone_pilot_id) : staffMap.get(dayAssignment.drone_pilot_id);
            console.log(`Adding drone pilot assignment: ${person?.full_name} (${isFreelancer ? 'freelancer' : 'staff'})`);
            
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : dayAssignment.drone_pilot_id,
              freelancer_id: isFreelancer ? dayAssignment.drone_pilot_id : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Drone Pilot',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: currentFirmId,
            });
          } else {
            console.warn(`Invalid drone pilot ID: ${dayAssignment.drone_pilot_id} - not found in available staff/freelancers`);
          }
        }
      }

      console.log('=== FINAL ASSIGNMENTS TO INSERT ===');
      console.log(JSON.stringify(assignments, null, 2));

      // Track newly added assignments for notifications
      const newAssignments = assignments.filter(assignment => {
        const assignmentKey = `${assignment.staff_id || assignment.freelancer_id}-${assignment.role}-${assignment.day_number}`;
        return !existingAssignmentKeys.has(assignmentKey);
      });

      console.log('=== NEW ASSIGNMENTS FOR NOTIFICATIONS ===');
      console.log('New assignments count:', newAssignments.length);
      console.log(JSON.stringify(newAssignments, null, 2));

      if (assignments.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('event_staff_assignments')
          .insert(assignments)
          .select('*');

        if (insertError) {
          console.error('Error inserting assignments:', insertError);
          throw insertError;
        }
        
        console.log('Staff assignments saved successfully:', insertedData);
        
        // Show immediate feedback in toast
        toast({
          title: "Staff Assigned Successfully",
          description: `${assignments.length} staff assignment(s) saved`,
        });

        // Store new assignments for notification purposes
        (window as any).newStaffAssignments = newAssignments;
      } else {
        console.log('No staff assignments to save - all assignment arrays were empty');
        (window as any).newStaffAssignments = [];
      }

      // Update main event table with primary photographer and cinematographer
      await updateMainEventStaffFields(eventId);
      
      // Create staff assignments for same day editors if assigned
      if (quotationHasSameDayEditing && sameDayEditors.some(id => id && id.trim() !== '')) {
        await createSameDayEditorAssignments(eventId);
      }
    } catch (error: any) {
      console.error('Error saving staff assignments:', error);
      toast({
        title: "Staff Assignment Error",
        description: `Failed to save some staff assignments: ${error.message}`,
        variant: "destructive",
      });
      // Don't throw error as event creation was successful
    }
  };

  const createSameDayEditorAssignments = async (eventId: string) => {
    try {
      const assignments = [];
      const freelancerMap = new Map(freelancers.map(f => [f.id, f]));
      
      for (const editorId of sameDayEditors.filter(id => id && id.trim() !== '')) {
        const editorStaff = allCombinedPeople.find(s => s.id === editorId);
        if (editorStaff) {
          const isFreelancer = freelancerMap.has(editorId);
          assignments.push({
            event_id: eventId,
            staff_id: isFreelancer ? null : editorId,
            freelancer_id: isFreelancer ? editorId : null,
            staff_type: isFreelancer ? 'freelancer' : 'staff',
            role: 'Same Day Editor',
            day_number: 1,
            day_date: formData.event_date,
            firm_id: currentFirmId,
          });
        }
      }
      
      if (assignments.length > 0) {
        const { error } = await supabase
          .from('event_staff_assignments')
          .insert(assignments);
          
        if (error) throw error;
        
        
        toast({
          title: "Same Day Editors Assigned",
          description: `${assignments.length} same-day editor(s) assigned for the event`,
        });
      }
    } catch (error: any) {
      console.error('Error creating same day editor assignments:', error);
    }
  };

  const updateMainEventStaffFields = async (eventId: string) => {
    try {
      // Get the first day's primary photographer and cinematographer
      const firstDayAssignment = multiDayAssignments.find(day => day.day === 1);
      
      const updates: any = {};
      
      // Old column updates removed - using event_staff_assignments table instead

      // Only update if we have updates to make
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', eventId);

        if (error) throw error;
        // Updated main event staff fields
      }
    } catch (error: any) {
      console.error('Error updating main event staff fields:', error);
    }
  };

  const updateMultiDayAssignment = (day: number, role: 'photographer_ids' | 'cinematographer_ids' | 'editor_id' | 'drone_pilot_id', staffId: string | string[]) => {
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { ...assignment, [role]: staffId }
          : assignment
      )
    );
  };

  const addStaffToDay = (day: number, role: 'photographer_ids' | 'cinematographer_ids', staffId: string) => {
    // Check if staff member is already assigned to the SAME role on this day
    const currentDayAssignment = multiDayAssignments.find(a => a.day === day);
    if (currentDayAssignment && staffId) {
      const isAlreadyAssignedToSameRole = role === 'photographer_ids' 
        ? currentDayAssignment.photographer_ids.includes(staffId)
        : currentDayAssignment.cinematographer_ids.includes(staffId);
      
      if (isAlreadyAssignedToSameRole) {
        const staffName = [...photographers, ...cinematographers].find(s => s.id === staffId)?.full_name || 'Unknown';
        alert(`${staffName} is already assigned to this role on Day ${day}.`);
        return;
      }
    }
    
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { 
              ...assignment, 
              [role]: [...(assignment[role] as string[]), staffId]
            }
          : assignment
      )
    );
  };

  const removeStaffFromDay = (day: number, role: 'photographer_ids' | 'cinematographer_ids', staffId: string) => {
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { 
              ...assignment, 
              [role]: (assignment[role] as string[]).filter(id => id !== staffId)
            }
          : assignment
      )
    );
  };

  const handleTotalDaysChange = (days: number) => {
    setExtendedData(prev => ({ ...prev, total_days: days }));
    
    // Generate assignments based on quotation requirements
    const newAssignments = [];
    for (let i = 1; i <= days; i++) {
      const existing = multiDayAssignments.find(a => a.day === i);
      if (existing) {
        newAssignments.push(existing);
      } else {
        const quotationDetails = selectedQuotation?.quotation_details;
        if (quotationDetails?.days?.[i - 1]) {
          const dayConfig = quotationDetails.days[i - 1];
          newAssignments.push({
            day: i,
            photographer_ids: Array(Math.max(1, dayConfig.photographers || 0)).fill(''),
            cinematographer_ids: Array(Math.max(1, dayConfig.cinematographers || 0)).fill(''),
            editor_id: '',
            drone_pilot_id: dayConfig.drone > 0 ? '' : ''
          });
        } else {
          newAssignments.push({
            day: i,
            photographer_ids: [''],
            cinematographer_ids: [''],
            editor_id: '',
            drone_pilot_id: ''
          });
        }
      }
    }
    setMultiDayAssignments(newAssignments);
  };

  // Same day editor functions
  const addSameDayEditor = () => {
    setSameDayEditors([...sameDayEditors, '']);
  };

  const removeSameDayEditor = (index: number) => {
    if (sameDayEditors.length > 1) {
      setSameDayEditors(sameDayEditors.filter((_, i) => i !== index));
    }
  };

  const updateSameDayEditor = (index: number, editorId: string) => {
    // Check if this staff member is already assigned on any day
    const isAlreadyAssigned = multiDayAssignments.some(assignment => 
      assignment.photographer_ids.includes(editorId) ||
      assignment.cinematographer_ids.includes(editorId) ||
      assignment.editor_id === editorId
    ) || sameDayEditors.some((existingId, existingIndex) => 
      existingIndex !== index && existingId === editorId
    );
    
    if (isAlreadyAssigned) {
      const staffName = editors.find(s => s.id === editorId)?.full_name || 'Unknown';
      alert(`${staffName} is already assigned to this event. The same crew member cannot be assigned to multiple roles.`);
      return;
    }
    
    const newEditors = [...sameDayEditors];
    newEditors[index] = editorId;
    setSameDayEditors(newEditors);
    
    // Track primary same day editor via array state
  };


  // Show loading state while data is being fetched
  if (formLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[calc(100vh-6rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {currentEvent ? 'Loading Event Data...' : 'Preparing Form...'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">
              {currentEvent ? 'Fetching complete event details...' : 'Loading required data...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {currentEvent ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
             
             {/* First Row: Event Title and Client */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                 <Input
                   id="title"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   placeholder="Enter event title"
                    className="rounded-full"
                   required
                    disabled={false}
                 />
               </div>

                <div className="space-y-2">
                   <Label className="text-sm font-medium">
                     Client *
                   </Label>
                   <Select 
                     value={formData.client_id || ''} 
                     onValueChange={(value) => {
                       setFormData({ ...formData, client_id: value });
                       setSelectedQuotation(null); // Reset quotation when client changes
                     }}
                      disabled={isEventFromQuotation}
                   >
                     <SelectTrigger className="rounded-full">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
             </div>

              {/* Second Row: Active Quotation and Event Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   {formData.client_id ? (
                     <SmartClientQuotationSelector
                       selectedClientId={formData.client_id}
                       onQuotationSelect={(quotation) => {
                         setSelectedQuotation(quotation);
                         handleQuotationSelect(quotation);
                       }}
                        selectedQuotationId={isEventFromQuotation ? existingQuotation?.id : selectedQuotation?.id}
                        isEditMode={isEventFromQuotation}
                        existingQuotation={existingQuotation}
                     />
                   ) : (
                    <div>
                      <Label className="text-sm font-medium">Active Quotation</Label>
                      <div className="h-10 bg-muted/30 rounded-full flex items-center justify-center text-sm text-muted-foreground">
                        Select client first
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Event Type *</Label>
                   <Select 
                     value={formData.event_type} 
                     onValueChange={(value) => setFormData({ ...formData, event_type: value as EventType })}
                      disabled={false}
                   >
                     <SelectTrigger className="rounded-full">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {EVENT_TYPES.map((type) => (
                         <SelectItem key={type.value} value={type.value}>
                           {type.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
              </div>

              {/* Third Row: Event Date and Venue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

               <div className="space-y-2">
                 <Label className="text-sm font-medium">Event Date *</Label>
                  <InlineDatePicker
                    onSelect={(date) => setFormData({ ...formData, event_date: date ? date.toISOString().split('T')[0] : '' })}
                    value={formData.event_date ? new Date(formData.event_date) : undefined}
                    placeholder="DD/MM/YYYY"
                     disabled={false}
                  />
               </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Venue</Label>
                  <div className="relative">
                    <Input
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="Type venue name..."
                      className="rounded-full pr-8"
                    />
                    {formData.venue && venueSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto bg-background border border-border rounded-md shadow-lg">
                        {venueSuggestions
                          .filter(venue => venue.toLowerCase().includes(formData.venue.toLowerCase()))
                          .slice(0, 10)
                          .map((venue, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
                              onClick={() => setFormData({ ...formData, venue })}
                            >
                              {venue}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
               </div>
             </div>
          </div>

          {/* Financial Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Bill Amount</Label>
                <Input
                  type="number"
                  value={formData.total_amount.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, total_amount: value === '' ? 0 : parseFloat(value) || 0 });
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="rounded-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Credit/Advance Amount</Label>
                <Input
                  type="number"
                  value={extendedData.advance_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setExtendedData({ ...extendedData, advance_amount: value === '' ? 0 : parseFloat(value) || 0 });
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Advance Payment Method</Label>
                <Select 
                  value={extendedData.advance_payment_method}
                  onValueChange={(value: PaymentMethod) => setExtendedData({ ...extendedData, advance_payment_method: value })}
                >
                  <SelectTrigger className="rounded-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPaymentMethodOptions().map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Still Amount</Label>
                <div className="p-3 bg-muted/50 border rounded-full h-10 flex items-center">
                  <span className="text-sm font-semibold">₹{calculateBalance().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Day Staff Assignment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Staff Assignment by Day ({extendedData.total_days} {extendedData.total_days === 1 ? 'Day' : 'Days'})
            </h3>
            
            <div className="space-y-4">
              {multiDayAssignments.map((dayAssignment) => (
                <div key={dayAssignment.day} className="border rounded-xl p-4 bg-card shadow-sm">
                  <h4 className="text-base font-semibold mb-3 text-primary flex items-center justify-between">
                    <span>Day {dayAssignment.day}</span>
                    {extendedData.total_days > 1 && (
                      <span className="text-xs text-muted-foreground font-normal bg-white/80 px-2 py-1 rounded-full">
                        {new Date(new Date(formData.event_date).getTime() + (dayAssignment.day - 1) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Show photographer fields - always show slots based on quotation requirements */}
                        {dayAssignment.photographer_ids.length > 0 && (
                       <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <Camera02Icon className="h-4 w-4" />
                            Photographers
                         </Label>
                         
                          {/* Selected photographers - exact count based on quotation */}
                          {dayAssignment.photographer_ids.map((photographerId, index) => (
                            <div key={index} className="flex gap-2">
                                <Select 
                                  value={photographerId} 
                                   onValueChange={(value) => {
                                     // Handle clear selection
                                     if (value === '__CLEAR__') {
                                       value = '';
                                     }
                                     
                                     // Check if this staff member is already assigned to photographer role on this day
                                     if (value && value !== photographerId) {
                                       const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                       const isAlreadyAssignedToSameRole = currentDayAssignment?.photographer_ids.includes(value);
                                       
                                       if (isAlreadyAssignedToSameRole) {
                                           const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                         alert(`${staffName} is already assigned as a photographer on Day ${dayAssignment.day}.`);
                                         return;
                                       }
                                     }
                                    
                                    const newIds = [...dayAssignment.photographer_ids];
                                    newIds[index] = value;
                                    updateMultiDayAssignment(dayAssignment.day, 'photographer_ids', newIds);
                                  }}
                                  required={selectedQuotation !== null}
                                >
                                  <SelectTrigger className="rounded-full flex-1">
                                   <SelectValue placeholder={`Select photographer ${index + 1}`} />
                                 </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                                    {photographers
                                       .filter(person => {
                                         const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                         if (!currentDayAssignment) return true;
                                         // Allow current selection or staff not assigned to any role on this day
                                         return person.id === photographerId ||
                                                (!currentDayAssignment.photographer_ids.includes(person.id) &&
                                                  !currentDayAssignment.cinematographer_ids.includes(person.id) &&
                                                 currentDayAssignment.editor_id !== person.id &&
                                                 currentDayAssignment.drone_pilot_id !== person.id);
                                       })
                                       .map((person) => (
                                         <SelectItem key={person.id} value={person.id}>
                                           {person.full_name}
                                         </SelectItem>
                                       ))}
                                  </SelectContent>
                               </Select>
                                   {/* Remove button - hide in edit mode for events from quotations */}
                                   {(() => {
                                     // In edit mode for events from quotations - never show remove buttons
                                     if (currentEvent && isEventFromQuotation) {
                                       return false;
                                     }
                                     
                                     // For new events with quotation
                                     if (!currentEvent && selectedQuotation) {
                                       const dayConfig = selectedQuotation.quotation_details?.days?.[dayAssignment.day - 1];
                                       const requiredCount = dayConfig?.photographers || 0;
                                       return dayAssignment.photographer_ids.length > Math.max(1, requiredCount);
                                     }
                                     
                                     // For editing events with quotation data
                                     if (currentEvent && (currentEvent as any)?.quotation_details?.days) {
                                       const dayConfig = (currentEvent as any).quotation_details.days[dayAssignment.day - 1];
                                       const requiredCount = dayConfig?.photographers || 0;
                                       return dayAssignment.photographer_ids.length > Math.max(1, requiredCount);
                                     }
                                     
                                     // For events without quotation - allow removing if more than 1
                                     return dayAssignment.photographer_ids.length > 1;
                                   })() && (
                                   <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     onClick={() => {
                                       const newIds = dayAssignment.photographer_ids.filter((_, i) => i !== index);
                                       updateMultiDayAssignment(dayAssignment.day, 'photographer_ids', newIds.length > 0 ? newIds : ['']);
                                     }}
                                     className="rounded-full px-3"
                                   >
                                      <Remove01Icon className="h-4 w-4" />
                                   </Button>
                                 )}
                            </div>
                          ))}
                         
                             {/* Show Add button - hide in edit mode for events from quotations */}
                             {(() => {
                               // In edit mode for events from quotations - never show add buttons
                               if (currentEvent && isEventFromQuotation) {
                                 return false;
                               }
                               
                               // For new events with quotation
                               if (!currentEvent && selectedQuotation) {
                                 const dayConfig = selectedQuotation.quotation_details?.days?.[dayAssignment.day - 1];
                                 const requiredCount = dayConfig?.photographers || 0;
                                 return dayAssignment.photographer_ids.length < requiredCount;
                               }
                               
                               // For editing events with quotation data
                               if (currentEvent && (currentEvent as any)?.quotation_details?.days) {
                                 const dayConfig = (currentEvent as any).quotation_details.days[dayAssignment.day - 1];
                                 const requiredCount = dayConfig?.photographers || 0;
                                 return dayAssignment.photographer_ids.length < requiredCount;
                               }
                               
                               // For events without quotation - allow adding
                               return !currentEvent || (!selectedQuotation && !(currentEvent as any)?.quotation_source_id);
                             })() && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addStaffToDay(dayAssignment.day, 'photographer_ids', '')}
                                className="rounded-full w-full"
                              >
                                 <Add01Icon className="h-4 w-4 mr-1" />
                                Add Photographer
                              </Button>
                            )}
                       </div>
                     )}

                        {/* Show cinematographer fields - always show slots based on quotation requirements */}
                        {dayAssignment.cinematographer_ids.length > 0 && (
                        <div className="space-y-3">
                           <Label className="text-sm font-semibold flex items-center gap-2">
                             <VideoReplayIcon className="h-4 w-4" />
                              Cinematographers
                          </Label>
                          
                           {/* Selected cinematographers - exact count based on quotation */}
                           {dayAssignment.cinematographer_ids.map((cinematographerId, index) => (
                            <div key={index} className="flex gap-2">
                                 <Select 
                                   value={cinematographerId} 
                                   onValueChange={(value) => {
                                      // Handle clear selection
                                      if (value === '__CLEAR__') {
                                        value = '';
                                      }
                                      
                                      // Check if this staff member is already assigned to cinematographer role on this day
                                      if (value && value !== cinematographerId) {
                                        const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                        const isAlreadyAssignedToSameRole = currentDayAssignment?.cinematographer_ids.includes(value);
                                        
                                        if (isAlreadyAssignedToSameRole) {
                                            const staffName = allCombinedPeople.find(p => p.id === value)?.full_name || 'Unknown';
                                          alert(`${staffName} is already assigned as a cinematographer on Day ${dayAssignment.day}.`);
                                          return;
                                        }
                                      }
                                     
                                     const newIds = [...dayAssignment.cinematographer_ids];
                                     newIds[index] = value;
                                     updateMultiDayAssignment(dayAssignment.day, 'cinematographer_ids', newIds);
                                  }}
                                  required={selectedQuotation !== null}
                                >
                                   <SelectTrigger className="rounded-full flex-1">
                                     <SelectValue placeholder={`Select cinematographer ${index + 1}`} />
                                  </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                                     {cinematographers
                                        .filter(person => {
                                          const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                          if (!currentDayAssignment) return true;
                                          // Allow current selection or staff not assigned to any role on this day
                                          return person.id === cinematographerId ||
                                                 (!currentDayAssignment.photographer_ids.includes(person.id) &&
                                                   !currentDayAssignment.cinematographer_ids.includes(person.id) &&
                                                  currentDayAssignment.editor_id !== person.id &&
                                                  currentDayAssignment.drone_pilot_id !== person.id);
                                        })
                                        .map((person) => (
                                          <SelectItem key={person.id} value={person.id}>
                                            {person.full_name}
                                          </SelectItem>
                                        ))}
                                   </SelectContent>
                               </Select>
                                    {/* Remove button - hide in edit mode for events from quotations */}
                                    {(() => {
                                      // In edit mode for events from quotations - never show remove buttons
                                      if (currentEvent && isEventFromQuotation) {
                                        return false;
                                      }
                                      
                                      // For new events with quotation
                                      if (!currentEvent && selectedQuotation) {
                                        const dayConfig = selectedQuotation.quotation_details?.days?.[dayAssignment.day - 1];
                                        const requiredCount = dayConfig?.cinematographers || 0;
                                        return dayAssignment.cinematographer_ids.length > Math.max(1, requiredCount);
                                      }
                                      
                                      // For editing events with quotation data
                                      if (currentEvent && (currentEvent as any)?.quotation_details?.days) {
                                        const dayConfig = (currentEvent as any).quotation_details.days[dayAssignment.day - 1];
                                        const requiredCount = dayConfig?.cinematographers || 0;
                                        return dayAssignment.cinematographer_ids.length > Math.max(1, requiredCount);
                                      }
                                      
                                      // For events without quotation - allow removing if more than 1
                                      return dayAssignment.cinematographer_ids.length > 1;
                                    })() && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newIds = dayAssignment.cinematographer_ids.filter((_, i) => i !== index);
                                        updateMultiDayAssignment(dayAssignment.day, 'cinematographer_ids', newIds.length > 0 ? newIds : ['']);
                                      }}
                                      className="rounded-full px-3"
                                    >
                                       <Remove01Icon className="h-4 w-4" />
                                    </Button>
                                  )}
                            </div>
                          ))}
                         
                             {/* Show Add button - hide in edit mode for events from quotations */}
                             {(() => {
                               // In edit mode for events from quotations - never show add buttons
                               if (currentEvent && isEventFromQuotation) {
                                 return false;
                               }
                               
                               // For new events with quotation
                               if (!currentEvent && selectedQuotation) {
                                 const dayConfig = selectedQuotation.quotation_details?.days?.[dayAssignment.day - 1];
                                 const requiredCount = dayConfig?.cinematographers || 0;
                                 return dayAssignment.cinematographer_ids.length < requiredCount;
                               }
                               
                               // For editing events with quotation data
                               if (currentEvent && (currentEvent as any)?.quotation_details?.days) {
                                 const dayConfig = (currentEvent as any).quotation_details.days[dayAssignment.day - 1];
                                 const requiredCount = dayConfig?.cinematographers || 0;
                                 return dayAssignment.cinematographer_ids.length < requiredCount;
                               }
                               
                               // For events without quotation - allow adding
                               return !currentEvent || (!selectedQuotation && !(currentEvent as any)?.quotation_source_id);
                             })() && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addStaffToDay(dayAssignment.day, 'cinematographer_ids', '')}
                                className="rounded-full w-full"
                              >
                                 <Add01Icon className="h-4 w-4 mr-1" />
                                Add Cinematographer
                              </Button>
                            )}
                        </div>
                      )}

                      {/* Drone Pilot Section - Show only when required by quotation or when no quotation */}
                      {(() => {
                        // If we have a quotation, check if drone is required for this day
                        if (selectedQuotation && selectedQuotation.quotation_details) {
                          const dayConfig = selectedQuotation.quotation_details?.days?.[dayAssignment.day - 1];
                          const droneRequired = dayConfig?.drone || 0;
                          return droneRequired > 0;
                        }
                        
                        // For editing events with quotation data
                        if (currentEvent && (currentEvent as any)?.quotation_details?.days) {
                          const dayConfig = (currentEvent as any).quotation_details.days[dayAssignment.day - 1];
                          const droneRequired = dayConfig?.drone || 0;
                          return droneRequired > 0;
                        }
                        
                        // For events without quotation, always show (optional)
                        return !selectedQuotation && !(currentEvent as any)?.quotation_source_id;
                      })() && (
                      <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <DroneIcon className="h-4 w-4" />
                           Drone Pilot
                         </Label>
                        
                         <Select 
                           value={dayAssignment.drone_pilot_id || ''} 
                           onValueChange={(value) => {
                             // Handle clear selection
                             if (value === '__CLEAR__') {
                               value = '';
                             }
                             updateMultiDayAssignment(dayAssignment.day, 'drone_pilot_id', value);
                           }}
                         >
                           <SelectTrigger className="rounded-full">
                             <SelectValue placeholder="Select drone pilot (optional)" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                              {dronePilots
                                .filter(person => {
                                  const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                  if (!currentDayAssignment) return true;
                                  // Allow current selection or staff not assigned to any role on this day
                                  return person.id === dayAssignment.drone_pilot_id ||
                                         (!currentDayAssignment.photographer_ids.includes(person.id) &&
                                           !currentDayAssignment.cinematographer_ids.includes(person.id) &&
                                          currentDayAssignment.editor_id !== person.id);
                                })
                                .map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.full_name}
                               </SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                      </div>
                      )}
                   </div>
                 </div>
               ))}
             </div>
           </div>


          {/* Same Day Editor Section - Show only when quotation has same day editing enabled */}
          {quotationHasSameDayEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Post-Production</h3>
              <div className="border rounded-xl p-4 bg-card shadow-sm">
                <div className="space-y-3">
                   <Label className="text-sm font-semibold flex items-center gap-2">
                     <AdobePremierIcon className="h-4 w-4" />
                     Same Day Editor {quotationHasSameDayEditing && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {sameDayEditors.map((editorId, index) => (
                    <div key={index} className="flex gap-2">
                        <Select 
                          value={editorId} 
                           onValueChange={(value) => {
                             // Handle clear selection
                             if (value === '__CLEAR__') {
                               value = '';
                             }
                             updateSameDayEditor(index, value);
                           }}
                          required={quotationHasSameDayEditing}
                        >
                           <SelectTrigger className="rounded-full flex-1">
                             <SelectValue placeholder="Select same day editor" />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                             {editors
                               .filter(person => {
                                 // Allow current selection or staff not assigned to any role on any day
                                 const isCurrentSelection = person.id === editorId;
                                 const isAssignedElsewhere = multiDayAssignments.some(assignment => 
                                   assignment.photographer_ids.includes(person.id) ||
                                   assignment.cinematographer_ids.includes(person.id) ||
                                   assignment.editor_id === person.id ||
                                   assignment.drone_pilot_id === person.id
                                 ) || sameDayEditors.some((existingId, existingIndex) => 
                                   existingIndex !== index && existingId === person.id
                                 );
                                 return isCurrentSelection || !isAssignedElsewhere;
                               })
                               .map((person) => (
                                 <SelectItem key={person.id} value={person.id}>
                                   {person.full_name}
                                 </SelectItem>
                               ))}
                          </SelectContent>
                       </Select>
                       {/* Hide remove button in edit mode for events from quotations */}
                       {sameDayEditors.length > 1 && !(currentEvent && isEventFromQuotation) && (
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => removeSameDayEditor(index)}
                           className="p-2 h-9 w-9 rounded-full"
                         >
                           <Remove01Icon className="h-4 w-4" />
                         </Button>
                       )}
                    </div>
                  ))}
                  
                   {/* Hide add button in edit mode for events from quotations */}
                   {!(currentEvent && isEventFromQuotation) && (
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                       onClick={addSameDayEditor}
                       className="rounded-full w-full"
                     >
                       <Add01Icon className="h-4 w-4 mr-1" />
                       Add Same Day Editor
                     </Button>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Details</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description and additional notes"
                  rows={3}
                  className="resize-none h-20"
                />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-row gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-full">
              {loading ? 'Saving...' : currentEvent ? 'Update' : 'Create'}
            </Button>
          </div>
          
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CleanEventFormDialog;
