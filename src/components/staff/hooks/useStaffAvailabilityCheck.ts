import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface StaffAvailabilityCheckParams {
  dates: Date[];
  role: string;
  eventType?: string;
  customMessage?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  phone?: string;
}

export const useStaffAvailabilityCheck = () => {
  const { currentFirmId } = useAuth();

  const sendAvailabilityCheck = useCallback(async ({
    dates,
    role,
    eventType,
    customMessage
  }: StaffAvailabilityCheckParams) => {
    if (!currentFirmId) {
      throw new Error('No firm selected');
    }

    try {
      // Fetch all staff and freelancers with the specified role
      const [staffResult, freelancersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, role, mobile_number')
          .eq('firm_id', currentFirmId)
          .eq('role', role as any)
          .not('mobile_number', 'is', null),
        supabase
          .from('freelancers')
          .select('id, full_name, role, phone')
          .eq('firm_id', currentFirmId)
          .eq('role', role as any)
          .not('phone', 'is', null)
      ]);

      if (staffResult.error) throw staffResult.error;
      if (freelancersResult.error) throw freelancersResult.error;

      const staff: StaffMember[] = staffResult.data || [];
      const freelancers: StaffMember[] = freelancersResult.data || [];
      const allPeople = [...staff, ...freelancers];

      if (allPeople.length === 0) {
        throw new Error(`No ${role} staff or freelancers found with contact information`);
      }

      // Send availability check notification to each person - BACKGROUND Fire and forget
      allPeople.forEach((person) => {
        const phoneNumber = person.mobile_number || person.phone;
        if (!phoneNumber) return;

        // Background notification - Fire and forget
        supabase.functions.invoke('send-staff-notification', {
          body: {
            staffName: person.full_name,
            staffPhone: phoneNumber,
            role: person.role,
            dates: dates.map(d => d.toLocaleDateString('en-CA')), // YYYY-MM-DD format without timezone issues
            eventType,
            customMessage,
            firmId: currentFirmId,
            notificationType: 'availability_check'
          }
        }).then(({ error }) => {
          if (error) {
            console.warn(`⚠️ Failed to send notification to ${person.full_name}:`, error);
          } else {
            console.log(`✅ Availability check sent to ${person.full_name}`);
          }
        }).catch(error => {
          console.warn(`⚠️ Error sending notification to ${person.full_name}:`, error);
        });
      });

      const dateText = dates.length === 1 ? dates[0].toLocaleDateString() : `${dates.length} dates`;
      
    } catch (error) {
      console.error('Error sending availability check:', error);
      throw error;
    }
  }, [currentFirmId]);

  return {
    sendAvailabilityCheck
  };
};