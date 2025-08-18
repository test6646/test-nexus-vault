
import { Event } from '@/types/studio';
import StatsGrid from '@/components/ui/stats-grid';
import { Calendar01Icon, DollarCircleIcon, Tick02Icon, UserIcon } from 'hugeicons-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface EventStatsProps {
  events: Event[];
}

const EventStats = ({ events }: EventStatsProps) => {
  const { currentFirmId } = useAuth();
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<any>({});

  useEffect(() => {
    if (currentFirmId && events.length > 0) {
      fetchPaymentBreakdowns();
    }
  }, [currentFirmId, events]);

  const fetchPaymentBreakdowns = async () => {
    if (!currentFirmId) return;

    try {
      // Get payment breakdowns for events
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_method, event_id')
        .eq('firm_id', currentFirmId)
        .in('event_id', events.map(e => e.id));

      const eventIds = events.map(e => e.id);
      const eventPayments = payments?.filter(p => eventIds.includes(p.event_id)) || [];

      const totalRevenueBreakdown = eventPayments.reduce((acc, payment) => {
        if (payment.payment_method === 'Cash') {
          acc.cash += payment.amount || 0;
        } else {
          acc.digital += payment.amount || 0;
        }
        return acc;
      }, { cash: 0, digital: 0 });

      setPaymentBreakdowns({ totalRevenue: totalRevenueBreakdown });
    } catch (error) {
      console.error('Error fetching payment breakdowns:', error);
    }
  };

  const calculateEventStats = () => {
    const totalEvents = events.length;
    const totalRevenue = events.reduce((sum, event) => sum + (event.total_amount || 0), 0);
    const confirmedEvents = events.filter(e => e.total_amount && e.total_amount > 0).length;
    const completedEvents = events.filter(event => new Date(event.event_date) <= new Date()).length;

    return { totalEvents, totalRevenue, confirmedEvents, completedEvents };
  };

  const stats = calculateEventStats();

  return (
    <StatsGrid stats={[
      {
        title: "Total Events",
        value: stats.totalEvents,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Total Revenue",
        value: `₹${stats.totalRevenue.toLocaleString()}`,
        icon: <DollarCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary",
        paymentBreakdown: paymentBreakdowns.totalRevenue
      },
      {
        title: "Confirmed Events",
        value: stats.confirmedEvents,
        icon: <Tick02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Completed Events",
        value: stats.completedEvents,
        icon: <UserIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      }
    ]} />
  );
};

export default EventStats;
