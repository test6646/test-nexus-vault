import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Camera02Icon, VideoReplayIcon, AdobePremierIcon, DroneIcon, UserGroupIcon, Add01Icon, Remove01Icon } from 'hugeicons-react';
import { Quotation } from '@/types/studio';

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
  editor_id: string;
  drone_pilot_id: string;
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
  onUpdateStaffAssignment: (dayIndex: number, field: string, slotIndex: number | null, value: string) => void;
  onAddStaffSlot: (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids') => void;
  onRemoveStaffSlot: (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids', slotIndex: number) => void;
  onToggleSameDayEditor: (checked: boolean) => void;
  onUpdateSameDayEditor: (index: number, value: string) => void;
  onAddSameDayEditor: () => void;
  onRemoveSameDayEditor: (index: number) => void;
}

const EventStaffAssignment: React.FC<EventStaffAssignmentProps> = ({
  multiDayAssignments,
  totalDays,
  sameDayEditor,
  sameDayEditors,
  photographers,
  cinematographers,
  editors,
  dronePilots,
  selectedQuotation,
  currentEvent,
  isEventFromQuotation,
  onUpdateStaffAssignment,
  onAddStaffSlot,
  onRemoveStaffSlot,
  onToggleSameDayEditor,
  onUpdateSameDayEditor,
  onAddSameDayEditor,
  onRemoveSameDayEditor
}) => {
  const quotationHasSameDayEditing = selectedQuotation?.quotation_details?.sameDayEditing === true;

  const isPersonAvailable = (personId: string, currentDayIndex: number, currentRole: string, currentSlotIndex?: number) => {
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
      } else {
        if (assignment.photographer_ids.includes(personId) ||
            assignment.cinematographer_ids.includes(personId) ||
            assignment.editor_id === personId ||
            assignment.drone_pilot_id === personId) {
          return false;
        }
      }
    }
    
    // Check same day editors
    if (sameDayEditors.includes(personId)) return false;
    
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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5" />
          Staff Assignment
        </h3>

        {/* Multi-day Staff Assignment */}
        <div className="space-y-6">
          {multiDayAssignments.map((dayAssignment, dayIndex) => {

            return (
               <div key={dayAssignment.day} className="border rounded-lg p-4 bg-card">
                <h4 className="text-md font-medium mb-4 flex items-center gap-2">
                  📅 Day {dayAssignment.day} Staff Assignment
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Photographers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera02Icon className="h-4 w-4" />
                      Photographers
                    </Label>
                    <div className="space-y-2">
                      {dayAssignment.photographer_ids.map((photographerId, slotIndex) => (
                        <div key={slotIndex} className="flex gap-2 items-center">
                          <Select
                            value={photographerId}
                            onValueChange={(value) => {
                              if (value === '__CLEAR__') {
                                value = '';
                              }
                              onUpdateStaffAssignment(dayIndex, 'photographer_ids', slotIndex, value);
                            }}
                          >
                            <SelectTrigger className="rounded-full flex-1">
                              <SelectValue placeholder="Select photographer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                              {photographers
                                .filter(person => {
                                  const isCurrentSelection = person.id === photographerId;
                                  return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'photographer', slotIndex);
                                })
                                .map((photographer) => (
                                  <SelectItem key={photographer.id} value={photographer.id}>
                                    {photographer.full_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
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
                          <Select
                            value={cinematographerId}
                            onValueChange={(value) => {
                              if (value === '__CLEAR__') {
                                value = '';
                              }
                              onUpdateStaffAssignment(dayIndex, 'cinematographer_ids', slotIndex, value);
                            }}
                          >
                            <SelectTrigger className="rounded-full flex-1">
                              <SelectValue placeholder="Select cinematographer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                              {cinematographers
                                .filter(person => {
                                  const isCurrentSelection = person.id === cinematographerId;
                                  return isCurrentSelection || isPersonAvailable(person.id, dayIndex, 'cinematographer', slotIndex);
                                })
                                .map((cinematographer) => (
                                  <SelectItem key={cinematographer.id} value={cinematographer.id}>
                                    {cinematographer.full_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
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

                  {/* Editor */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <AdobePremierIcon className="h-4 w-4" />
                      Editor
                    </Label>
                    <Select
                      value={dayAssignment.editor_id}
                      onValueChange={(value) => {
                        if (value === '__CLEAR__') {
                          value = '';
                        }
                        onUpdateStaffAssignment(dayIndex, 'editor_id', null, value);
                      }}
                    >
                      <SelectTrigger className="rounded-full">
                        <SelectValue placeholder="Select editor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                        {editors
                          .filter(person => {
                            const isCurrentSelection = person.id === dayAssignment.editor_id;
                            const isAssignedElsewhere = multiDayAssignments.some((assignment, idx) => 
                              idx !== dayIndex && (
                                assignment.photographer_ids.includes(person.id) ||
                                assignment.cinematographer_ids.includes(person.id) ||
                                assignment.editor_id === person.id ||
                                assignment.drone_pilot_id === person.id
                              )
                            ) || sameDayEditors.includes(person.id);
                            return isCurrentSelection || !isAssignedElsewhere;
                          })
                          .map((editor) => (
                            <SelectItem key={editor.id} value={editor.id}>
                              {editor.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Drone Pilot - Conditional Rendering */}
                  {shouldShowDronePilot(dayAssignment.day - 1) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <DroneIcon className="h-4 w-4" />
                        Drone Pilot
                      </Label>
                      <Select
                        value={dayAssignment.drone_pilot_id}
                        onValueChange={(value) => {
                          if (value === '__CLEAR__') {
                            value = '';
                          }
                          onUpdateStaffAssignment(dayIndex, 'drone_pilot_id', null, value);
                        }}
                      >
                        <SelectTrigger className="rounded-full">
                          <SelectValue placeholder="Select drone pilot" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
                          {dronePilots
                            .filter(person => {
                              const isCurrentSelection = person.id === dayAssignment.drone_pilot_id;
                              const isAssignedElsewhere = multiDayAssignments.some((assignment, idx) => 
                                idx !== dayIndex && (
                                  assignment.photographer_ids.includes(person.id) ||
                                  assignment.cinematographer_ids.includes(person.id) ||
                                  assignment.editor_id === person.id ||
                                  assignment.drone_pilot_id === person.id
                                )
                              ) || sameDayEditors.includes(person.id);
                              return isCurrentSelection || !isAssignedElsewhere;
                            })
                            .map((pilot) => (
                              <SelectItem key={pilot.id} value={pilot.id}>
                                {pilot.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Same Day Editor Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="same-day-editor"
              checked={sameDayEditor}
              onCheckedChange={onToggleSameDayEditor}
              disabled={quotationHasSameDayEditing}
            />
            <Label htmlFor="same-day-editor" className="text-sm font-medium">
              Same Day Editor {quotationHasSameDayEditing && "(Required by quotation)"}
            </Label>
          </div>

          {(sameDayEditor || quotationHasSameDayEditing) && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <AdobePremierIcon className="h-4 w-4" />
                  Same Day Editors
                </Label>
                <div className="space-y-2">
                  {sameDayEditors.map((editorId, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={editorId}
                        onValueChange={(value) => {
                          if (value === '__CLEAR__') {
                            value = '';
                          }
                          onUpdateSameDayEditor(index, value);
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
                      {sameDayEditors.length > 1 && !(currentEvent && isEventFromQuotation) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveSameDayEditor(index)}
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
                      onClick={onAddSameDayEditor}
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
        </div>
      </div>
    </div>
  );
};

export default EventStaffAssignment;