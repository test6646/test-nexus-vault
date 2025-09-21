
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Event } from '@/types/studio';
import { sharedStyles, SharedPDFHeader, SharedPDFFooter } from '@/components/pdf/SharedPDFLayout';
import { formatDate } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateEventBalance, calculateTotalPaid } from '@/lib/payment-calculator';

interface EventReportPDFProps {
  events: Event[];
  filterType?: string;
  filterValue?: string;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const EventReportPDF = ({ events, filterType, filterValue, firmData }: EventReportPDFProps) => {
  const getFilterDescription = () => {
    if (filterType === 'status' && filterValue) {
      const statusLabels: Record<string, string> = {
        'confirmed': 'Confirmed Events',
        'completed': 'Completed Events', 
        'pending': 'Work Pending Events',
        'crew_incomplete': 'Staff Incomplete Events',
        'paid': 'Paid Events',
        'payment_pending': 'Payment Due Events'
      };
      return statusLabels[filterValue] || 'All Events';
    }
    return 'All Events';
  };

  const getTableHeaders = () => {
    if (filterType === 'status' && filterValue) {
      switch (filterValue) {
        case 'crew_incomplete':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '20%' },
            { text: 'Required', width: '12%' },
            { text: 'Assigned', width: '12%' },
            { text: 'Pending', width: '11%' }
          ];
        case 'paid':
        case 'payment_pending':
          return [
            { text: 'Event', width: '25%' },
            { text: 'Date', width: '12%' },
            { text: 'Client', width: '18%' },
            { text: 'Total Bill', width: '15%' },
            { text: 'Paid', width: '15%' },
            { text: 'Pending', width: '15%' }
          ];
        case 'pending':
          return [
            { text: 'Event', width: '30%' },
            { text: 'Date', width: '15%' },
            { text: 'Client', width: '25%' },
            { text: 'Photo Edit', width: '15%' },
            { text: 'Video Edit', width: '15%' }
          ];
        default:
          return [
            { text: 'Event', width: '25%' },
            { text: 'Date', width: '12%' },
            { text: 'Client', width: '18%' },
            { text: 'Amount', width: '15%' },
            { text: 'Paid', width: '15%' },
            { text: 'Balance', width: '15%' }
          ];
      }
    }
    return [
      { text: 'Event', width: '25%' },
      { text: 'Date', width: '12%' },
      { text: 'Client', width: '18%' },
      { text: 'Amount', width: '15%' },
      { text: 'Paid', width: '15%' },
      { text: 'Balance', width: '15%' }
    ];
  };

  const getCrewBreakdown = (event: Event, type: 'required' | 'assigned' | 'pending') => {
    const assignments = (event as any).event_staff_assignments || [];
    
    // Try multiple paths to access quotation data
    let quotationData = null;
    
    // Check if quotation_source exists and has quotation_details
    if ((event as any).quotation_source?.[0]?.quotation_details) {
      quotationData = (event as any).quotation_source[0].quotation_details;
    }
    // Check if quotation_details is directly on event (processed)
    else if ((event as any).quotation_details) {
      quotationData = (event as any).quotation_details;
    }
    // Check if quotation_source is direct object
    else if ((event as any).quotation_source?.quotation_details) {
      quotationData = (event as any).quotation_source.quotation_details;
    }
    
    // Get required crew from quotation days data
    const getRequiredCrew = () => {
      if (!quotationData?.days || !Array.isArray(quotationData.days)) return {};
      
      const crewCount: any = {};
      
      quotationData.days.forEach((day: any) => {
        // Sum photographers across all days
        if (day.photographers && day.photographers > 0) {
          crewCount['Photographer'] = (crewCount['Photographer'] || 0) + day.photographers;
        }
        
        // Sum cinematographers across all days
        if (day.cinematographers && day.cinematographers > 0) {
          crewCount['Cinematographer'] = (crewCount['Cinematographer'] || 0) + day.cinematographers;
        }
        
        // Sum drone operators across all days
        if (day.drone && day.drone > 0) {
          crewCount['Drone Pilot'] = (crewCount['Drone Pilot'] || 0) + day.drone;
        }
      });
      
      // Check for same day editing - add if enabled in quotation
      if (quotationData.sameDayEditing) {
        crewCount['Same Day Editor'] = 1;
      }
      
      return crewCount;
    };

    // Count assigned crew by role
    const getAssignedCrew = () => {
      return assignments.reduce((acc: any, assignment: any) => {
        const role = assignment.role || 'General';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
    };

    const requiredCrew = getRequiredCrew();
    const assignedCrew = getAssignedCrew();
    
    switch (type) {
      case 'required': {
        const breakdown = Object.entries(requiredCrew).map(([role, count]) => 
          `${count} ${role}${Number(count) > 1 ? 's' : ''}`
        );
        return breakdown.length > 0 ? breakdown.join(', ') : 'No crew specified';
      }
      case 'assigned': {
        const breakdown = Object.entries(assignedCrew).map(([role, count]) => 
          `${count} ${role}${Number(count) > 1 ? 's' : ''}`
        );
        return breakdown.length > 0 ? breakdown.join(', ') : 'None';
      }
      case 'pending': {
        const pending: any = {};
        Object.entries(requiredCrew).forEach(([role, required]) => {
          const assigned = assignedCrew[role] || 0;
          const pendingCount = Math.max(0, Number(required) - Number(assigned));
          if (pendingCount > 0) {
            pending[role] = pendingCount;
          }
        });
        const breakdown = Object.entries(pending).map(([role, count]) => 
          `${count} ${role}${Number(count) > 1 ? 's' : ''}`
        );
        return breakdown.length > 0 ? breakdown.join(', ') : 'None';
      }
      default:
        return '';
    }
  };

  const renderTableRow = (event: Event, index: number) => {
    const headers = getTableHeaders();
    const balance = calculateEventBalance(event as any);
    const paid = calculateTotalPaid(event as any);
    
    if (filterType === 'status' && filterValue) {
      switch (filterValue) {
        case 'crew_incomplete':
          // Calculate crew stats using the same logic as breakdown
          const assignments = (event as any).event_staff_assignments || [];
          
          // Use the same data access pattern as getCrewBreakdown
          let quotationData = null;
          if ((event as any).quotation_source?.[0]?.quotation_details) {
            quotationData = (event as any).quotation_source[0].quotation_details;
          } else if ((event as any).quotation_details) {
            quotationData = (event as any).quotation_details;
          } else if ((event as any).quotation_source?.quotation_details) {
            quotationData = (event as any).quotation_source.quotation_details;
          }
          
          // Calculate total required from quotation days
          let totalRequired = 0;
          if (quotationData?.days && Array.isArray(quotationData.days)) {
            const crewCount: any = {};
            quotationData.days.forEach((day: any) => {
              if (day.photographers && day.photographers > 0) {
                crewCount['Photographer'] = (crewCount['Photographer'] || 0) + day.photographers;
              }
              if (day.cinematographers && day.cinematographers > 0) {
                crewCount['Cinematographer'] = (crewCount['Cinematographer'] || 0) + day.cinematographers;
              }
              if (day.drone && day.drone > 0) {
                crewCount['Drone Pilot'] = (crewCount['Drone Pilot'] || 0) + day.drone;
              }
            });
            
            // Add same day editor if enabled in quotation
            if (quotationData.sameDayEditing) {
              crewCount['Same Day Editor'] = 1;
            }
            
            totalRequired = Object.values(crewCount as Record<string, number>).reduce((sum, count) => {
              return sum + (count || 0);
            }, 0);
          }
          
          const totalAssigned = assignments.length;
          const totalPending = Math.max(0, totalRequired - totalAssigned);
          
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              
              {/* Required Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[3].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalRequired}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'required')})
                </Text>
              </View>
              
              {/* Assigned Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[4].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalAssigned}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'assigned')})
                </Text>
              </View>
              
              {/* Pending Column with breakdown */}
              <View style={[sharedStyles.tableCell, { width: headers[5].width }]}>
                <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{totalPending}</Text>
                <Text style={{ fontSize: 7, color: '#666666', lineHeight: 1.2 }}>
                  ({getCrewBreakdown(event, 'pending')})
                </Text>
              </View>
            </View>
          );
        
        case 'pending':
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>{event.photo_editing_status ? '✓' : '✗'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>{event.video_editing_status ? '✓' : '✗'}</Text>
            </View>
          );
        
        default:
          return (
            <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
              <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
                {(() => {
                  const startDate = new Date(event.event_date);
                  const totalDays = (event as any).total_days || 1;
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
              <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>₹{(event.total_amount || 0).toLocaleString()}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>₹{paid.toLocaleString()}</Text>
              <Text style={[sharedStyles.tableCell, { width: headers[5].width }]}>₹{balance.toLocaleString()}</Text>
            </View>
          );
      }
    }
    
    // Default rendering
    return (
      <View key={event.id} style={[sharedStyles.tableRow, index % 2 === 0 && sharedStyles.tableRowAlt]}>
        <Text style={[sharedStyles.tableCell, { width: headers[0].width }]}>{event.title}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[1].width }]}>
          {(() => {
            const startDate = new Date(event.event_date);
            const totalDays = (event as any).total_days || 1;
            
            if (totalDays === 1) {
              return formatDate(startDate);
            } else {
              const endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + totalDays - 1);
              return `${formatDate(startDate)} - ${formatDate(endDate)}`;
            }
          })()}
        </Text>
        <Text style={[sharedStyles.tableCell, { width: headers[2].width }]}>{event.client?.name || 'N/A'}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[3].width }]}>₹{(event.total_amount || 0).toLocaleString()}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[4].width }]}>₹{paid.toLocaleString()}</Text>
        <Text style={[sharedStyles.tableCell, { width: headers[5].width }]}>₹{balance.toLocaleString()}</Text>
      </View>
    );
  };

  const totalEvents = events.length;
  const totalAmount = events.reduce((sum, event) => sum + (event.total_amount || 0), 0);
  const totalBalance = events.reduce((sum, event) => sum + calculateEventBalance(event as any), 0);
  const totalPaid = events.reduce((sum, event) => sum + calculateTotalPaid(event as any), 0);
  const currentDate = formatDate(new Date());

  // Split events into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const eventChunks = [];
  for (let i = 0; i < events.length; i += ROWS_PER_PAGE) {
    eventChunks.push(events.slice(i, i + ROWS_PER_PAGE));
  }

  const hasEvents = events.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />
        <Text style={sharedStyles.title}>Event Report</Text>

        {/* Report Info */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDescription()}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Events:</Text>
              <Text style={sharedStyles.detailValue}>{totalEvents}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalAmount.toLocaleString()}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Amount Paid:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalPaid.toLocaleString()}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Pending Balance:</Text>
              <Text style={sharedStyles.detailValue}>₹{totalBalance.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Event Tables - 15 rows per page */}
      {eventChunks.map((eventChunk, chunkIndex) => (
        <Page key={`event-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Event Details {eventChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${eventChunks.length})` : ''}
          </Text>
          
          <View style={sharedStyles.table}>
            <View style={sharedStyles.tableHeader}>
              {getTableHeaders().map((header, index) => (
                <Text key={index} style={[sharedStyles.tableCellHeader, { width: header.width }]}>
                  {header.text}
                </Text>
              ))}
            </View>
            
            {eventChunk.map((event, index) => renderTableRow(event, index + (chunkIndex * ROWS_PER_PAGE)))}
          </View>
        </Page>
      ))}

      {/* Final Page: Footer Only */}
      {hasEvents && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* If no events, add footer to first page */}
      {!hasEvents && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateEventReportPDF = async (
  events: Event[],
  filterType?: string,
  filterValue?: string,
  firmData?: any
) => {
  // If events array is limited (pagination), fetch all events for PDF
  let allEvents = events;
  
  if (events.length === 50 || events.length === 25) {
    // Likely paginated data, fetch all events
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          // Fetch ALL events for this firm with proper foreign key relations
          const { data, error } = await supabase
            .from('events')
            .select(`
              *,
              clients!events_client_id_fkey(id, name, phone, email),
              payments!payments_event_id_fkey(id, amount, payment_date),
              event_staff_assignments!event_staff_assignments_event_id_fkey(id, role, staff_id, freelancer_id, day_number),
              quotations!quotations_converted_to_event_fkey(id, title, quotation_details)
            `)
            .eq('firm_id', firmId)
            .order('event_date', { ascending: false });
          
          if (!error && data) {
            allEvents = data as any[];
          }
        }
      }
    } catch (error) {
      console.error('Error fetching all events for PDF:', error);
      // Use provided data as fallback
    }
  }

  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      // Try to get current user and their firm
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try multiple ways to get firm ID
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        // If no localStorage, try getting from profile
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          const { data: firm, error } = await supabase
            .from('firms')
            .select('name, description, logo_url, header_left_content, footer_content')
            .eq('id', firmId)
            .single();
          
          if (!error && firm) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      // Error fetching firm data for PDF
    }
  }

  const blob = await pdf(<EventReportPDF events={allEvents} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Event Report ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};
