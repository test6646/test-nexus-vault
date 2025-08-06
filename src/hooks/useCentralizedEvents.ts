import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CentralizedEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  venue?: string;
  description?: string;
  total_amount: number;
  firm_id: string;
  client_id?: string;
  
  // Client info (embedded)
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  
  // Payment summary (calculated)
  total_paid: number;
  balance_amount: number;
  
  // Quotation details (embedded)
  quotation_details?: any;
  quotation_title?: string;
  
  // Assignments (embedded)
  assignments?: Array<{
    id: string;
    person_id: string;
    person_type: 'staff' | 'freelancer';
    person_name: string;
    role: string;
    day_number: number;
    rate: number;
    is_paid: boolean;
  }>;
  
  // Additional calculated fields
  crew_complete: boolean;
  payment_status: 'paid' | 'partial' | 'pending';
  event_status: 'upcoming' | 'ongoing' | 'completed';
}

export const useCentralizedEvents = () => {
  const [events, setEvents] = useState<CentralizedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const loadEvents = async () => {
    if (!profile?.current_firm_id) return;

    setLoading(true);
    try {
      // Single query to get ALL event data with joins
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(
            id, name, email, phone, address
          ),
          quotation_source:quotations(
            id, title, quotation_details
          ),
          event_staff_assignments(
            id, staff_id, freelancer_id, role, day_number,
            staff:profiles(id, full_name, role),
            freelancer:freelancers(id, full_name, role)
          ),
          payments(amount),
          tasks(*)
        `)
        .eq('firm_id', profile.current_firm_id)
        .order('event_date', { ascending: false });

      if (error) throw error;

      // Process events with calculated fields
      const processedEvents: CentralizedEvent[] = (data || []).map(event => {
        // Calculate payments
        const totalPaid = (event.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const balanceAmount = Math.max(0, (event.total_amount || 0) - totalPaid);
        
        // Calculate payment status
        let paymentStatus: 'paid' | 'partial' | 'pending' = 'pending';
        if (totalPaid >= (event.total_amount || 0)) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        }

        // Calculate event status
        const eventDate = new Date(event.event_date);
        const today = new Date();
        let eventStatus: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
        
        if (eventDate < today) {
          eventStatus = 'completed';
        } else if (eventDate.toDateString() === today.toDateString()) {
          eventStatus = 'ongoing';
        }

        // Process assignments
        const assignments = (event.event_staff_assignments || []).map((assignment: any) => ({
          id: assignment.id,
          person_id: assignment.staff_id || assignment.freelancer_id,
          person_type: assignment.staff_id ? 'staff' as const : 'freelancer' as const,
          person_name: assignment.staff?.full_name || assignment.freelancer?.full_name || 'Unknown',
          role: assignment.role,
          day_number: assignment.day_number || 1,
          rate: 0, // Will get from rates table if needed
          is_paid: false
        }));

        // Check crew completeness
        const crewComplete = checkCrewCompleteness({ ...event, assignments });

        return {
          id: event.id,
          title: event.title,
          event_type: event.event_type,
          event_date: event.event_date,
          venue: event.venue,
          description: event.description,
          total_amount: event.total_amount || 0,
          firm_id: event.firm_id,
          client_id: event.client_id,
          client_name: event.client?.name,
          client_email: event.client?.email,
          client_phone: event.client?.phone,
          client_address: event.client?.address,
          total_paid: totalPaid,
          balance_amount: balanceAmount,
          quotation_details: event.quotation_source?.[0]?.quotation_details,
          quotation_title: event.quotation_source?.[0]?.title,
          assignments,
          payment_status: paymentStatus,
          event_status: eventStatus,
          crew_complete: crewComplete
        };
      });

      setEvents(processedEvents);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCrewCompleteness = (event: any): boolean => {
    // If no quotation details, consider complete
    if (!event.quotation_details?.days) return true;
    
    const assignments = event.assignments || [];
    const totalDays = event.total_days || 1;
    
    // Check each day for crew completeness
    for (let day = 1; day <= totalDays; day++) {
      const dayConfig = event.quotation_details.days[day - 1];
      if (!dayConfig) continue;
      
      const dayAssignments = assignments.filter((a: any) => a.day_number === day);
      
      const actualPhotographers = dayAssignments.filter((a: any) => a.role === 'Photographer').length;
      const actualCinematographers = dayAssignments.filter((a: any) => a.role === 'Cinematographer').length;
      const actualDronePilots = dayAssignments.filter((a: any) => a.role === 'Drone Pilot').length;
      
      const requiredPhotographers = dayConfig.photographers || 0;
      const requiredCinematographers = dayConfig.cinematographers || 0;
      const requiredDrone = dayConfig.drone || 0;
      
      if (actualPhotographers < requiredPhotographers ||
          actualCinematographers < requiredCinematographers ||
          actualDronePilots < requiredDrone) {
        return false;
      }
    }
    
    return true;
  };

  const saveEvent = async (eventData: any, assignments: any[] = []) => {
    try {
      let eventId: string;

      // Save event
      if (eventData.id) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventData.id);
        
        if (error) throw error;
        eventId = eventData.id;
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select('id')
          .single();
        
        if (error) throw error;
        eventId = data.id;
      }

      // Save assignments in existing table
      if (assignments.length > 0) {
        // Delete existing assignments
        await supabase
          .from('event_staff_assignments')
          .delete()
          .eq('event_id', eventId);

        // Insert new assignments
        const assignmentData = assignments.map(assignment => ({
          event_id: eventId,
          firm_id: profile?.current_firm_id,
          staff_id: assignment.person_type === 'staff' ? assignment.person_id : null,
          freelancer_id: assignment.person_type === 'freelancer' ? assignment.person_id : null,
          role: assignment.role,
          day_number: assignment.day_number || 1,
          staff_type: assignment.person_type
        }));

        const { error: assignmentError } = await supabase
          .from('event_staff_assignments')
          .insert(assignmentData);

        if (assignmentError) throw assignmentError;
      }

      await loadEvents();
      
      toast({
        title: "Success",
        description: `Event ${eventData.id ? 'updated' : 'created'} successfully`,
      });

      return { success: true, eventId };
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const recordPayment = async (eventId: string, paymentData: any) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          event_id: eventId,
          firm_id: profile?.current_firm_id
        });

      if (error) throw error;

      await loadEvents();
      
      toast({
        title: "Payment recorded",
        description: "Payment has been recorded successfully",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      // Delete related data first
      await Promise.all([
        supabase.from('event_staff_assignments').delete().eq('event_id', eventId),
        supabase.from('payments').delete().eq('event_id', eventId),
        supabase.from('tasks').delete().eq('event_id', eventId),
      ]);

      // Delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      await loadEvents();
      
      toast({
        title: "Event deleted",
        description: "Event and all related data has been deleted",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    loadEvents();
  }, [profile?.current_firm_id]);

  return {
    events,
    loading,
    loadEvents,
    saveEvent,
    recordPayment,
    deleteEvent
  };
};