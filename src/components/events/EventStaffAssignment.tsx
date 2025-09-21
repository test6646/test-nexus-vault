import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableStaffSelect } from '@/components/ui/searchable-staff-select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Camera02Icon, VideoReplayIcon, AdobePremierIcon, DroneIcon, UserGroupIcon, Add01Icon, Remove01Icon } from 'hugeicons-react';
import { Quotation } from '@/types/studio';
import { filterAvailablePeople, calculateEventDateRange } from '@/lib/staff-availability-utils';
import { useAuth } from '@/components/auth/AuthProvider';

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  source: 'staff' | 'freelancer';
}

interface MultiDayAssignment {
  day: number;
  photographer_ids: string[];
  cinematographer_ids: string[];
  drone_pilot_id: string;
  same_day_editor_ids: string[];
}

interface EventStaffAssignmentProps {
  multiDayAssignments: MultiDayAssignment[];
  totalDays: number;
  sameDayEditor: boolean;
  sameDayEditors: string[];
  photographers: Staff[];
  cinematographers: Staff[];
  editors: Staff[];
  dronePilots: Staff[];
  selectedQuotation: Quotation | null;
  currentEvent: any;
  isEventFromQuotation: boolean;
  eventDate: string;
  eventEndDate?: string;
  onUpdateStaffAssignment: (dayIndex: number, field: string, slotIndex: number | null, value: string) => void;
  onAddStaffSlot: (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids' | 'same_day_editor_ids') => void;
  onRemoveStaffSlot: (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids' | 'same_day_editor_ids', slotIndex: number) => void;
  onToggleSameDayEditor: (checked: boolean) => void;
  onUpdateSameDayEditor: (index: number, value: string) => void;
  onAddSameDayEditor: () => void;
  onRemoveSameDayEditor: (index: number) => void;
}

const EventStaffAssignment: React.FC<EventStaffAssignmentProps> = ({
  multiDayAssignments,
  totalDays,
  sameDayEditor,
  sameDayEditors: legacySameDayEditors,
  photographers,
  cinematographers,
  editors,
  dronePilots,
  selectedQuotation,
  currentEvent,
  isEventFromQuotation,
  eventDate,
  eventEndDate,
  onUpdateStaffAssignment,
  onAddStaffSlot,
  onRemoveStaffSlot,
  onToggleSameDayEditor,
  onUpdateSameDayEditor,
  onAddSameDayEditor,
  onRemoveSameDayEditor
}) => {
  const { currentFirmId } = useAuth();
  const [availablePhotographers, setAvailablePhotographers] = useState<Staff[]>([]);
  const [availableCinematographers, setAvailableCinematographers] = useState<Staff[]>([]);
  const [availableEditors, setAvailableEditors] = useState<Staff[]>([]);
  const [availableSameDayEditors, setAvailableSameDayEditors] = useState<Staff[]>([]);
  const [availableDronePilots, setAvailableDronePilots] = useState<Staff[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const quotationHasSameDayEditing = selectedQuotation?.quotation_details?.sameDayEditing === true;

  // SAME DAY EDITORS: These are regular editors who go to the event location on the same day
  // to do their editing work there. All data will be provided to them at the event location.
  // They are not a separate role - they're editors with a specific assignment type.
  const sameDayEditorsStaff = React.useMemo(() => 
    editors.filter(editor => editor.role === 'Editor' || editor.role === 'Same Day Editor'),
    [editors]
  );

  // Update available staff when event dates or staff lists change
  useEffect(() => {
    const updateAvailableStaff = async () => {
      if (!eventDate || !currentFirmId) {
        setAvailablePhotographers(photographers);
        setAvailableCinematographers(cinematographers);
        setAvailableEditors(editors);
        setAvailableSameDayEditors(sameDayEditorsStaff);
        setAvailableDronePilots(dronePilots);
        return;
      }

      setIsLoadingAvailability(true);
      
      try {
        const dateRange = calculateEventDateRange({
          event_date: eventDate,
          event_end_date: eventEndDate,
          total_days: totalDays
        });

        const excludeEventId = currentEvent?.id;

        const [
          filteredPhotographers,
          filteredCinematographers,
          filteredEditors,
          filteredSameDayEditors,
          filteredDronePilots
        ] = await Promise.all([
          filterAvailablePeople(photographers, dateRange, excludeEventId, currentFirmId),
          filterAvailablePeople(cinematographers, dateRange, excludeEventId, currentFirmId),
          filterAvailablePeople(editors, dateRange, excludeEventId, currentFirmId),
          filterAvailablePeople(sameDayEditorsStaff, dateRange, excludeEventId, currentFirmId),
          filterAvailablePeople(dronePilots, dateRange, excludeEventId, currentFirmId)
        ]);

        setAvailablePhotographers(filteredPhotographers);
        setAvailableCinematographers(filteredCinematographers);
        setAvailableEditors(filteredEditors);
        setAvailableSameDayEditors(filteredSameDayEditors);
        setAvailableDronePilots(filteredDronePilots);
      } catch (error) {
        console.error('Error filtering available staff:', error);
        // Fallback to original lists if filtering fails
        setAvailablePhotographers(photographers);
        setAvailableCinematographers(cinematographers);
        setAvailableEditors(editors);
        setAvailableSameDayEditors(sameDayEditorsStaff);
        setAvailableDronePilots(dronePilots);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    updateAvailableStaff();
  }, [eventDate, eventEndDate, totalDays, photographers, cinematographers, editors, sameDayEditorsStaff, dronePilots, currentEvent?.id, currentFirmId]);

  // Helper function to get available staff for a specific role, including currently selected staff
  const getAvailableStaffForRole = (role: 'photographer' | 'cinematographer' | 'editor' | 'same_day_editor' | 'drone_pilot', currentSelection?: string) => {
    let availableStaff: Staff[] = [];
    let originalStaff: Staff[] = [];

    switch (role) {
      case 'photographer':
        availableStaff = availablePhotographers;
        originalStaff = photographers;
        break;
      case 'cinematographer':
        availableStaff = availableCinematographers;
        originalStaff = cinematographers;
        break;
      case 'editor':
        availableStaff = availableEditors;
        originalStaff = editors;
        break;
      case 'same_day_editor':
        availableStaff = availableSameDayEditors;
        originalStaff = sameDayEditorsStaff;
        break;
      case 'drone_pilot':
        availableStaff = availableDronePilots;
        originalStaff = dronePilots;
        break;
    }

    // If there's a current selection, make sure it's included even if not available
    // This prevents breaking existing assignments during editing
    if (currentSelection) {
      const currentStaff = originalStaff.find(s => s.id === currentSelection);
      const isAlreadyIncluded = availableStaff.some(s => s.id === currentSelection);
      
      if (currentStaff && !isAlreadyIncluded) {
        return [currentStaff, ...availableStaff];
      }
    }

    return availableStaff;
  };

  const isPersonAvailable = (personId: string, currentDayIndex: number, currentRole: string, currentSlotIndex?: number) => {
    // Check within current event's multi-day assignments
    for (let i = 0; i < multiDayAssignments.length; i++) {
      const assignment = multiDayAssignments[i];
      
      // Skip current assignment slot
      if (i === currentDayIndex && currentRole === 'photographer' && currentSlotIndex !== undefined) {
        const currentPhotographerIds = [...assignment.photographer_ids];
        currentPhotographerIds.splice(currentSlotIndex, 1);
        if (currentPhotographerIds.includes(personId)) return false;
      } else if (i === currentDayIndex && currentRole === 'cinematographer' && currentSlotIndex !== undefined) {
        const currentCinematographerIds = [...assignment.cinematographer_ids];
        currentCinematographerIds.splice(currentSlotIndex, 1);
        if (currentCinematographerIds.includes(personId)) return false;
      } else if (i === currentDayIndex && currentRole === 'same_day_editor' && currentSlotIndex !== undefined) {
        const currentSameDayEditorIds = [...assignment.same_day_editor_ids];
        currentSameDayEditorIds.splice(currentSlotIndex, 1);
        if (currentSameDayEditorIds.includes(personId)) return false;
      } else {
        if (assignment.photographer_ids.includes(personId) ||
            assignment.cinematographer_ids.includes(personId) ||
            assignment.drone_pilot_id === personId ||
            assignment.same_day_editor_ids.includes(personId)) {
          return false;
        }
      }
    }
    
    // For legacy same day editor validation (should be removed after migration)
    if (legacySameDayEditors.includes(personId)) return false;
    
    return true;
  };

  const shouldShowDronePilot = (dayIndex: number) => {
    const quotationDetails = selectedQuotation?.quotation_details;
    if (quotationDetails?.days) {
      const dayConfig = quotationDetails.days[dayIndex];
      return dayConfig?.drone > 0;
    }
    return !selectedQuotation; // Show if no quotation selected
  };

  const shouldShowSameDayEditor = (dayIndex: number) => {
    const quotationDetails = selectedQuotation?.quotation_details;
    // Show if quotation has same day editing enabled OR manual same day editor is enabled
    return quotationHasSameDayEditing || sameDayEditor;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5" />
          Staff Assignment
        </h3>

        {/* Manual Same Day Editor Toggle - Only show when no quotation requirement */}
        {!quotationHasSameDayEditing && (
          <div className="flex items-center space-x-2">
            <Switch
              id="same-day-editor"
              checked={sameDayEditor}
              onCheckedChange={onToggleSameDayEditor}
            />
            <Label htmlFor="same-day-editor" className="text-sm font-medium">
              Enable Same Day Editor
            </Label>
          </div>
        )}

        {/* Multi-day Staff Assignment */}
        <div className="space-y-6">
          {multiDayAssignments.map((dayAssignment, dayIndex) => {
            return (
               <div key={dayAssignment.day} className="border rounded-lg p-4 bg-card">
                <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                  📅 Day {dayAssignment.day} Staff Assignment
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Photographers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera02Icon className="h-4 w-4" />
                      Photographers
                    </Label>
                    <div className="space-y-2">
                      {dayAssignment.photographer_ids.map((photographerId, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2 items-center">
                          <SearchableStaffSelect
                            value={photographerId}
                            onValueChange={(value) => {
                              if (value === '__CLEAR__') {
                                value = '';
                              }
                              onUpdateStaffAssignment(dayIndex, 'photographer_ids', slotIndex, value);
                            }}
                            staffOptions={getAvailableStaffForRole('photographer', photographerId)
                              .filter(person => {
                                const isCurrentSelection = person.id === photographerId;
                                return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'photographer', slotIndex);
                              })
                              .map(photographer => ({
                                id: photographer.id,
                                full_name: `${photographer.full_name}${!availablePhotographers.find(p => p.id === photographer.id) && photographer.id === photographerId ? ' (Unavailable)' : ''}`,
                                role: photographer.role
                              }))}
                            placeholder="Select photographer"
                            
                            className="rounded-full flex-1"
                            allowClear={true}
                          />
                          {dayAssignment.photographer_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onRemoveStaffSlot(dayIndex, 'photographer_ids', slotIndex)}
                              className="p-2 h-9 w-9 rounded-full"
                            >
                              <Remove01Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!(currentEvent && isEventFromQuotation) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddStaffSlot(dayIndex, 'photographer_ids')}
                          className="rounded-full w-full"
                        >
                          <Add01Icon className="h-4 w-4 mr-1" />
                          Add Photographer
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Cinematographers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <VideoReplayIcon className="h-4 w-4" />
                      Cinematographers
                    </Label>
                    <div className="space-y-2">
                      {dayAssignment.cinematographer_ids.map((cinematographerId, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2 items-center">
                          <SearchableStaffSelect
                            value={cinematographerId}
                            onValueChange={(value) => {
                              if (value === '__CLEAR__') {
                                value = '';
                              }
                              onUpdateStaffAssignment(dayIndex, 'cinematographer_ids', slotIndex, value);
                            }}
                            staffOptions={getAvailableStaffForRole('cinematographer', cinematographerId)
                              .filter(person => {
                                const isCurrentSelection = person.id === cinematographerId;
                                return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'cinematographer', slotIndex);
                              })
                              .map(cinematographer => ({
                                id: cinematographer.id,
                                full_name: `${cinematographer.full_name}${!availableCinematographers.find(c => c.id === cinematographer.id) && cinematographer.id === cinematographerId ? ' (Unavailable)' : ''}`,
                                role: cinematographer.role
                              }))}
                            placeholder="Select cinematographer"
                            
                            className="rounded-full flex-1"
                            allowClear={true}
                          />
                          {dayAssignment.cinematographer_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onRemoveStaffSlot(dayIndex, 'cinematographer_ids', slotIndex)}
                              className="p-2 h-9 w-9 rounded-full"
                            >
                              <Remove01Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!(currentEvent && isEventFromQuotation) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onAddStaffSlot(dayIndex, 'cinematographer_ids')}
                          className="rounded-full w-full"
                        >
                          <Add01Icon className="h-4 w-4 mr-1" />
                          Add Cinematographer
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Drone Pilot - Conditional Rendering */}
                  {shouldShowDronePilot(dayAssignment.day - 1) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <DroneIcon className="h-4 w-4" />
                        Drone Pilot
                      </Label>
                      <SearchableStaffSelect
                        value={dayAssignment.drone_pilot_id}
                        onValueChange={(value) => {
                          if (value === '__CLEAR__') {
                            value = '';
                          }
                          onUpdateStaffAssignment(dayIndex, 'drone_pilot_id', null, value);
                        }}
                        staffOptions={getAvailableStaffForRole('drone_pilot', dayAssignment.drone_pilot_id)
                          .filter(person => {
                            const isCurrentSelection = person.id === dayAssignment.drone_pilot_id;
                            return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'drone_pilot');
                          })
                          .map(dronePilot => ({
                            id: dronePilot.id,
                            full_name: `${dronePilot.full_name}${!availableDronePilots.find(d => d.id === dronePilot.id) && dronePilot.id === dayAssignment.drone_pilot_id ? ' (Unavailable)' : ''}`,
                            role: dronePilot.role
                          }))}
                        placeholder="Select drone pilot"
                        
                        className="rounded-full"
                        allowClear={true}
                      />
                    </div>
                  )}

                  {/* Same Day Editor - Conditional Rendering */}
                  {shouldShowSameDayEditor(dayAssignment.day - 1) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <AdobePremierIcon className="h-4 w-4" />
                        Same Day Editor {quotationHasSameDayEditing && "(Required)"}
                      </Label>
                      <div className="space-y-2">
                        {dayAssignment.same_day_editor_ids?.map((editorId: string, slotIndex: number) => (
                          <div key={slotIndex} className="flex gap-2 items-center">
                            <SearchableStaffSelect
                              value={editorId}
                              onValueChange={(value) => {
                                if (value === '__CLEAR__') {
                                  value = '';
                                }
                                onUpdateStaffAssignment(dayIndex, 'same_day_editor_ids', slotIndex, value);
                              }}
                              staffOptions={getAvailableStaffForRole('same_day_editor', editorId)
                                .filter(person => {
                                  const isCurrentSelection = person.id === editorId;
                                  return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'same_day_editor', slotIndex);
                                })
                                .map(editor => ({
                                  id: editor.id,
                                  full_name: `${editor.full_name}${!availableSameDayEditors.find(e => e.id === editor.id) && editor.id === editorId ? ' (Unavailable)' : ''}`,
                                  role: editor.role
                                }))}
                              placeholder="Select same day editor"
                              
                              className="rounded-full flex-1"
                              allowClear={true}
                              required={false}
                            />
                            {dayAssignment.same_day_editor_ids.length > 1 && !(currentEvent && isEventFromQuotation) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRemoveStaffSlot(dayIndex, 'same_day_editor_ids', slotIndex)}
                                className="p-2 h-9 w-9 rounded-full"
                              >
                                <Remove01Icon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {!(currentEvent && isEventFromQuotation) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddStaffSlot(dayIndex, 'same_day_editor_ids')}
                            className="rounded-full w-full"
                          >
                            <Add01Icon className="h-4 w-4 mr-1" />
                            Add Same Day Editor
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventStaffAssignment;