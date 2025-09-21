import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Eye, Save, RotateCcw, FileText } from 'lucide-react';

interface NotificationTemplates {
  event_assignment: {
    title: string;
    greeting: string;
    content: string;
  };
  event_unassignment: {
    title: string;
    greeting: string;
    content: string;
  };
  task_assignment: {
    title: string;
    greeting: string;
    content: string;
  };
  task_unassignment: {
    title: string;
    greeting: string;
    content: string;
  };
  salary_payment: {
    title: string;
    greeting: string;
    content: string;
  };
  event_cancellation: {
    title: string;
    greeting: string;
    content: string;
  };
  availability_check: {
    title: string;
    greeting: string;
    content: string;
  };
  task_reported: {
    title: string;
    greeting: string;
    content: string;
  };
  event_update: {
    title: string;
    greeting: string;
    content: string;
  };
  task_update: {
    title: string;
    greeting: string;
    content: string;
  };
  event_staff_notification: {
    title: string;
    greeting: string;
    content: string;
  };
  // CLIENT NOTIFICATIONS
  event_confirmation: {
    title: string;
    greeting: string;
    content: string;
  };
  payment_received: {
    title: string;
    greeting: string;
    content: string;
  };
}

const defaultTemplates: NotificationTemplates = {
  event_assignment: {
    title: 'ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You are assigned as *{role}* for the following event:'
  },
  event_unassignment: {
    title: 'EVENT UNASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have been *UNASSIGNED* from the following event:'
  },
  task_assignment: {
    title: 'TASK ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'A new *{taskType}* task has been assigned to you:'
  },
  task_unassignment: {
    title: 'TASK UNASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have been *UNASSIGNED* from the following task:'
  },
  salary_payment: {
    title: 'PAYMENT PROCESSED',
    greeting: 'Dear *{staffName}*,',
    content: 'Your salary payment has been processed:'
  },
  event_cancellation: {
    title: 'EVENT CANCELLED - ASSIGNMENT UPDATED',
    greeting: 'Dear *{staffName}*,',
    content: 'Your assignment for the following event has been cancelled at the client\'s request:'
  },
  availability_check: {
    title: 'AVAILABILITY REQUEST',
    greeting: 'Dear *{staffName}*,',
    content: 'Please confirm your availability for the following dates:'
  },
  task_reported: {
    title: 'TASK REPORTED - ISSUES FOUND',
    greeting: 'Dear *{staffName}*,',
    content: 'Your submitted task has been reported due to issues:'
  },
  event_update: {
    title: 'UPDATED DETAILS',
    greeting: 'Dear *{staffName}*,',
    content: 'You are assigned as *{role}* {dayInfo} for the following event:'
  },
  task_update: {
    title: 'TASK UPDATED',
    greeting: 'Dear *{staffName}*,',
    content: 'Your assigned task has been updated:'
  },
  event_staff_notification: {
    title: 'WORK ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have specific work instructions for this event:'
  },
  // CLIENT NOTIFICATIONS
  event_confirmation: {
    title: 'EVENT CONFIRMED',
    greeting: 'Dear *{clientName}*,',
    content: 'Your event has been successfully confirmed:'
  },
  payment_received: {
    title: 'PAYMENT RECEIVED',
    greeting: 'Dear *{clientName}*,',
    content: 'We have successfully received your payment:'
  }
};

const WhatsAppMessageTemplates = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplates>(defaultTemplates);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof NotificationTemplates>('event_assignment');
  const [previewType, setPreviewType] = useState<keyof NotificationTemplates>('event_assignment');
  const [brandingSettings, setBrandingSettings] = useState({
    firm_name: 'Your Studio Name',
    firm_tagline: 'Your business tagline',
    contact_info: 'Contact: +91 12345 67890',
    footer_signature: 'Your business signature'
  });

  useEffect(() => {
    loadTemplates();
  }, [currentFirmId]);

  const loadTemplates = async () => {
    if (!currentFirmId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wa_sessions')
        .select('notification_templates, firm_name, firm_tagline, contact_info, footer_signature')
        .eq('firm_id', currentFirmId)
        .single();

      if (data) {
        if (data.notification_templates && 
            typeof data.notification_templates === 'object' && 
            !Array.isArray(data.notification_templates)) {
          try {
            const templatesData = data.notification_templates as any;
            // Merge loaded templates with defaults to ensure all templates exist
            const mergedTemplates = { ...defaultTemplates };
            Object.keys(defaultTemplates).forEach(key => {
              if (templatesData[key]) {
                mergedTemplates[key as keyof NotificationTemplates] = templatesData[key];
              }
            });
            setTemplates(mergedTemplates);
          } catch (e) {
            setTemplates(defaultTemplates);
          }
        } else {
          setTemplates(defaultTemplates);
        }
        
        // Load branding for preview
        setBrandingSettings({
          firm_name: data.firm_name || 'Your Studio Name',
          firm_tagline: data.firm_tagline || 'Your business tagline',
          contact_info: data.contact_info || 'Contact: +91 12345 67890',
          footer_signature: data.footer_signature || 'Your business signature'
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplates = async () => {
    if (!currentFirmId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('wa_sessions')
        .upsert({
          id: currentFirmId,
          firm_id: currentFirmId,
          notification_templates: templates as any
        });

      if (error) throw error;

      toast({
        title: "Templates Saved",
        description: "WhatsApp message templates have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving templates:', error);
      toast({
        title: "Error",
        description: "Failed to save message templates.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setTemplates(defaultTemplates);
  };

  const generatePreview = (type: keyof NotificationTemplates) => {
    const template = templates[type];
    
    // Safety check
    if (!template) {
      return 'Template not found. Please refresh the page.';
    }
    
    const sampleData = {
      event_assignment: {
        staffName: 'Alex Johnson',
        role: 'PHOTOGRAPHER',
        eventName: 'Wedding Photography',
        eventDate: '15/12/2024',
        venue: 'Grand Palace Hotel'
      },
      event_unassignment: {
        staffName: 'Alex Johnson',
        role: 'PHOTOGRAPHER',
        eventName: 'Wedding Photography',
        eventDate: '15/12/2024',
        venue: 'Grand Palace Hotel'
      },
      task_assignment: {
        staffName: 'Alex Johnson',
        taskType: 'PHOTO EDITING',
        taskTitle: 'Edit wedding photos for John Doe',
        eventName: 'Wedding Photography'
      },
      task_unassignment: {
        staffName: 'Alex Johnson',
        taskType: 'PHOTO EDITING',
        taskTitle: 'Edit wedding photos for John Doe',
        eventName: 'Wedding Photography'
      },
      salary_payment: {
        staffName: 'Alex Johnson',
        amount: 5000,
        paymentMethod: 'Bank Transfer',
        eventName: 'Wedding Photography'
      },
      event_cancellation: {
        staffName: 'Alex Johnson',
        role: 'PHOTOGRAPHER',
        eventName: 'Wedding Photography',
        eventDate: '15/12/2024',
        venue: 'Grand Palace Hotel'
      },
      availability_check: {
        staffName: 'Alex Johnson',
        role: 'PHOTOGRAPHER',
        dates: ['15/12/2024', '16/12/2024'],
        eventType: 'Wedding Photography'
      },
      task_reported: {
        staffName: 'Alex Johnson',
        taskTitle: 'Edit wedding photos for John Doe',
        eventName: 'Wedding Photography'
      },
      event_update: {
        staffName: 'Alex Johnson',
        eventName: 'Wedding Photography',
        eventDate: '15/12/2024'
      },
      task_update: {
        staffName: 'Alex Johnson',
        taskTitle: 'Edit wedding photos for John Doe',
        eventName: 'Wedding Photography'
      },
      event_staff_notification: {
        staffName: 'Alex Johnson',
        eventName: 'Wedding Photography',
        eventDate: '15/12/2024',
        customMessage: 'Please bring additional camera equipment and arrive 30 minutes early.'
      },
      // CLIENT NOTIFICATIONS
      event_confirmation: { 
        clientName: 'Mr. & Mrs. Sharma', 
        eventName: 'Wedding Photography', 
        eventDate: '15/12/2024', 
        venue: 'Grand Palace Hotel', 
        totalAmount: 50000 
      },
      payment_received: { 
        clientName: 'Mr. & Mrs. Sharma', 
        eventName: 'Wedding Photography', 
        amountPaid: 25000, 
        paymentMethod: 'Bank Transfer', 
        remainingBalance: 25000 
      }
    };

    const data = sampleData[type];
    let message = `*${template.title}*\n\n`;
    
    // Handle client vs staff greetings properly
    if (type === 'event_confirmation' || type === 'payment_received') {
      message += `${template.greeting.replace('{clientName}', (data as any).clientName)}\n\n`;
    } else {
      message += `${template.greeting.replace('{staffName}', (data as any).staffName)}\n\n`;
    }
    
    message += `${template.content}\n\n`;
    
    // Add sample details based on type
    switch (type) {
      case 'event_assignment':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ${(data as any).venue}`;
        break;
      case 'event_unassignment':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ${(data as any).venue}\n*Past Role:* ${(data as any).role}`;
        break;
      case 'task_assignment':
        message += `*Task:* ${(data as any).taskTitle}\n*Related Event:* ${(data as any).eventName}\n*Status:* Pending`;
        break;
      case 'task_unassignment':
        message += `*Task:* ${(data as any).taskTitle}\n*Related Event:* ${(data as any).eventName}\n*Status:* Unassigned`;
        break;
      case 'salary_payment':
        message += `*Amount:* ₹${(data as any).amount.toLocaleString()}\n*Payment Method:* ${(data as any).paymentMethod}\n*Event:* ${(data as any).eventName}`;
        break;
      case 'event_cancellation':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Your Assigned Role:* *${(data as any).role}*\n*Venue:* ${(data as any).venue}`;
        break;
      case 'availability_check':
        message += `*Role Required:* ${(data as any).role}\n*Dates:* ${(data as any).dates.join(', ')}\n*Event Type:* ${(data as any).eventType}\n\nPlease reply with your availability.`;
        break;
      case 'task_reported':
        message += `*Task:* ${(data as any).taskTitle}\n*Related Event:* ${(data as any).eventName}\n*Status:* *REPORTED*`;
        break;
      case 'event_update':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ~`;
        break;
      case 'task_update':
        message += `*Task:* ${(data as any).taskTitle}\n*Related Event:* ${(data as any).eventName}`;
        break;
      case 'event_staff_notification':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n\n*Your Work Instructions:*\n${(data as any).customMessage}`;
        break;
      case 'event_confirmation':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ${(data as any).venue}\n*Amount:* ₹${(data as any).totalAmount.toLocaleString()}`;
        break;
      case 'payment_received':
        message += `*Event:* ${(data as any).eventName}\n*Amount Paid:* ₹${(data as any).amountPaid.toLocaleString()}\n*Payment Method:* ${(data as any).paymentMethod}\n*Remaining Balance:* ${(data as any).remainingBalance === 0 ? 'Fully Paid' : `₹${(data as any).remainingBalance.toLocaleString()}`}`;
        break;
    }
    
    // Use different branding message for clients vs staff
    if (type === 'event_confirmation' || type === 'payment_received') {
      message += `\n\nThank you for choosing *${brandingSettings.firm_name}*\n_${brandingSettings.firm_tagline}_\n${brandingSettings.contact_info}\n${brandingSettings.footer_signature}`;
    } else {
      message += `\n\nThank you for choosing *${brandingSettings.firm_name}*\n_${brandingSettings.firm_tagline}_\n${brandingSettings.contact_info}\n${brandingSettings.footer_signature}`;
    }
    
    return message;
  };

  const hasChanges = JSON.stringify(templates) !== JSON.stringify(defaultTemplates);

  const templateDisplayNames = {
    event_assignment: 'Event Assignment',
    event_unassignment: 'Event Unassignment', 
    task_assignment: 'Task Assignment',
    task_unassignment: 'Task Unassignment',
    salary_payment: 'Salary Payment',
    event_cancellation: 'Event Cancellation',
    availability_check: 'Availability Check',
    task_reported: 'Task Reported',
    event_update: 'Event Update',
    task_update: 'Task Update',
    event_staff_notification: 'Event Staff Notification',
    // CLIENT NOTIFICATIONS
    event_confirmation: 'Client Event Confirmation',
    payment_received: 'Client Payment Received'
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              Loading message templates...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Templates */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-base font-medium">Notification Templates</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Message Preview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Preview Type</Label>
                    <Select value={previewType} onValueChange={(value) => setPreviewType(value as keyof NotificationTemplates)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(templateDisplayNames).map(([key, name]) => (
                          <SelectItem key={key} value={key}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted p-4 rounded-lg border">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {generatePreview(previewType)}
                    </pre>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={resetToDefaults} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={saveTemplates} 
              disabled={isSaving || !hasChanges}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Template Selector */}
          <div className="space-y-2">
            <Label htmlFor="template-select">Select Template to Edit</Label>
            <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as keyof NotificationTemplates)}>
              <SelectTrigger id="template-select" className="w-full">
                <SelectValue placeholder="Choose a notification template" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {Object.entries(templateDisplayNames).map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Template Editor */}
          {templates[selectedTemplate] && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {templateDisplayNames[selectedTemplate]}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize the message template for {templateDisplayNames[selectedTemplate].toLowerCase()}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={templates[selectedTemplate]?.title || ''}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      [selectedTemplate]: { 
                        ...defaultTemplates[selectedTemplate],
                        ...prev[selectedTemplate], 
                        title: e.target.value 
                      }
                    }))}
                    placeholder="Notification Title"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Greeting</Label>
                  <Input
                    value={templates[selectedTemplate]?.greeting || ''}
                    onChange={(e) => setTemplates(prev => ({
                      ...prev,
                      [selectedTemplate]: { 
                        ...defaultTemplates[selectedTemplate],
                        ...prev[selectedTemplate], 
                        greeting: e.target.value 
                      }
                    }))}
                    placeholder="Dear *{clientName}* or Dear *{staffName}*"
                    disabled={isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={templates[selectedTemplate]?.content || ''}
                  onChange={(e) => setTemplates(prev => ({
                    ...prev,
                    [selectedTemplate]: { 
                      ...defaultTemplates[selectedTemplate],
                      ...prev[selectedTemplate], 
                      content: e.target.value 
                    }
                  }))}
                  placeholder="Main message content"
                  rows={4}
                  disabled={isSaving}
                />
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>Available variables:</strong> {'{staffName}, {role}, {taskType}, {workDetails}, {updatedFields}'}
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMessageTemplates;