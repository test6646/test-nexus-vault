import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDynamicBranding } from '@/hooks/useDynamicBranding';
import { Eye, Save, RotateCcw, MessageSquare, Users, FileText } from 'lucide-react';

interface NotificationSettings {
  firm_name: string;
  firm_tagline: string;
  contact_info: string;
  footer_signature: string;
  notification_templates: {
    // Staff notifications
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
    task_cancellation: {
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
    event_staff_cancellation: {
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
    staff_event_update: {
      title: string;
      greeting: string;
      content: string;
    };
    event_staff_notification: {
      title: string;
      greeting: string;
      content: string;
    };
    // Client notifications
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
  };
}

const UnifiedNotificationTemplates = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const { firmName, tagline, getContactInfo } = useDynamicBranding();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewType, setPreviewType] = useState<keyof NotificationSettings['notification_templates']>('event_assignment');

  // Get default templates function to use with dynamic branding
  const getDefaultTemplates = () => ({
    // Staff notifications
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
    task_cancellation: {
      title: 'TASK CANCELLED',
      greeting: 'Dear *{staffName}*,',
      content: 'The following task has been cancelled:'
    },
    salary_payment: {
      title: 'PAYMENT PROCESSED',
      greeting: 'Dear *{staffName}*,',
      content: 'Your salary payment has been processed:'
    },
    event_cancellation: {
      title: 'EVENT CANCELLED',
      greeting: 'Dear *{clientName}*,',
      content: 'We regret to inform you that the following event has been cancelled:'
    },
    event_staff_cancellation: {
      title: 'EVENT CANCELLED',
      greeting: 'Dear *{staffName}*,',
      content: 'The following event has been cancelled:'
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
      title: 'EVENT DETAILS UPDATED',
      greeting: 'Dear *{clientName}*,',
      content: 'Your event details have been updated:'
    },
    task_update: {
      title: 'TASK UPDATED',
      greeting: 'Dear *{staffName}*,',
      content: 'Your assigned task has been updated:'
    },
    staff_event_update: {
      title: 'EVENT DETAILS UPDATED',
      greeting: 'Dear *{staffName}*,',
      content: 'The event you are assigned to has been updated:'
    },
    event_staff_notification: {
      title: 'WORK ASSIGNMENT',
      greeting: 'Dear *{staffName}*,',
      content: 'You have specific work instructions for this event:'
    },
    // Client notifications
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
  });

  const getDefaultSettings = (): NotificationSettings => ({
    firm_name: firmName,
    firm_tagline: tagline,
    contact_info: getContactInfo(),
    footer_signature: firmName,
    notification_templates: getDefaultTemplates()
  });

  const [settings, setSettings] = useState<NotificationSettings>(getDefaultSettings());

  useEffect(() => {
    loadSettings();
  }, [currentFirmId]);

  useEffect(() => {
    // Update settings when dynamic branding changes
    setSettings(prev => ({
      ...prev,
      firm_name: firmName,
      firm_tagline: tagline,
      contact_info: getContactInfo(),
      footer_signature: firmName
    }));
  }, [firmName, tagline, getContactInfo]);

  const loadSettings = async () => {
    if (!currentFirmId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wa_sessions')
        .select('firm_name, firm_tagline, contact_info, footer_signature, notification_templates')
        .eq('firm_id', currentFirmId)
        .single();

      if (data) {
        setSettings({
          firm_name: data.firm_name || firmName,
          firm_tagline: data.firm_tagline || tagline,
          contact_info: data.contact_info || getContactInfo(),
          footer_signature: data.footer_signature || firmName,
          notification_templates: (data.notification_templates && typeof data.notification_templates === 'object' && !Array.isArray(data.notification_templates)) 
            ? { ...getDefaultTemplates(), ...data.notification_templates as any }
            : getDefaultTemplates()
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!currentFirmId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('wa_sessions')
        .upsert({
          id: currentFirmId,
          firm_id: currentFirmId,
          ...settings
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "WhatsApp notification templates have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      firm_name: firmName,
      firm_tagline: tagline,
      contact_info: getContactInfo(),
      footer_signature: firmName,
      notification_templates: getDefaultTemplates()
    });
  };

  const generatePreview = (type: keyof NotificationSettings['notification_templates']) => {
    const template = settings.notification_templates[type];
    
    const sampleData = {
      // Staff notifications
      event_assignment: { staffName: 'Alex Johnson', role: 'PHOTOGRAPHER', eventName: 'Wedding Photography', eventDate: '15/12/2024', venue: 'Grand Palace Hotel' },
      event_unassignment: { staffName: 'Alex Johnson', role: 'PHOTOGRAPHER', eventName: 'Wedding Photography', eventDate: '15/12/2024', venue: 'Grand Palace Hotel' },
      task_assignment: { staffName: 'Alex Johnson', taskType: 'PHOTO EDITING', taskTitle: 'Edit wedding photos for John Doe', eventName: 'Wedding Photography' },
      task_unassignment: { staffName: 'Alex Johnson', taskTitle: 'Edit wedding photos for John Doe', eventName: 'Wedding Photography' },
      task_cancellation: { staffName: 'Alex Johnson', taskTitle: 'Edit wedding photos for John Doe', eventName: 'Wedding Photography' },
      salary_payment: { staffName: 'Alex Johnson', amount: 5000, paymentMethod: 'Bank Transfer', eventName: 'Wedding Photography' },
      event_staff_cancellation: { staffName: 'Alex Johnson', role: 'PHOTOGRAPHER', eventName: 'Wedding Photography', eventDate: '15/12/2024', venue: 'Grand Palace Hotel' },
      availability_check: { staffName: 'Alex Johnson', role: 'PHOTOGRAPHER', dates: ['15/12/2024', '16/12/2024'], eventType: 'Wedding Photography' },
      task_reported: { staffName: 'Alex Johnson', taskTitle: 'Edit wedding photos for John Doe', eventName: 'Wedding Photography' },
      event_update: { clientName: 'Mr. & Mrs. Sharma', eventName: 'Wedding Photography', eventDate: '15/12/2024' },
      task_update: { staffName: 'Alex Johnson', taskTitle: 'Edit wedding photos for John Doe', eventName: 'Wedding Photography' },
      staff_event_update: { staffName: 'Alex Johnson', eventName: 'Wedding Photography', eventDate: '15/12/2024', venue: 'Grand Palace Hotel' },
      event_staff_notification: { staffName: 'Alex Johnson', eventName: 'Wedding Photography', eventDate: '15/12/2024', customMessage: 'Please bring additional camera equipment and arrive 30 minutes early.' },
      // Client notifications
      event_cancellation: { clientName: 'Mr. & Mrs. Sharma', eventName: 'Wedding Photography', eventDate: '15/12/2024', venue: 'Grand Palace Hotel' },
      event_confirmation: { clientName: 'Mr. & Mrs. Sharma', eventName: 'Wedding Photography', eventDate: '15/12/2024', venue: 'Grand Palace Hotel', totalAmount: 50000 },
      payment_received: { clientName: 'Mr. & Mrs. Sharma', eventName: 'Wedding Photography', amountPaid: 25000, paymentMethod: 'Bank Transfer', remainingBalance: 25000 }
    };

    const data = sampleData[type];
    let message = `*${template.title}*\n\n`;
    
    // Handle client vs staff greetings properly
    if (type === 'event_confirmation' || type === 'payment_received' || type === 'event_cancellation' || type === 'event_update') {
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
      case 'task_cancellation':
        message += `*Task:* ${(data as any).taskTitle}\n*Related Event:* ${(data as any).eventName}\n*Status:* *CANCELLED*`;
        break;
      case 'salary_payment':
        message += `*Amount:* ₹${(data as any).amount.toLocaleString()}\n*Payment Method:* ${(data as any).paymentMethod}\n*Event:* ${(data as any).eventName}`;
        break;
      case 'event_staff_cancellation':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Your Role:* ${(data as any).role}\n*Venue:* ${(data as any).venue}`;
        break;
      case 'availability_check':
        message += `*Role Required:* ${(data as any).role}\n*Dates:* ${(data as any).dates.join(', ')}\n*Event Type:* ${(data as any).eventType}`;
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
      case 'staff_event_update':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ${(data as any).venue}`;
        break;
      case 'event_staff_notification':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n\n*Your Work Instructions:*\n${(data as any).customMessage}`;
        break;
      case 'event_cancellation':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ${(data as any).venue}`;
        break;
      case 'event_confirmation':
        message += `*Event:* ${(data as any).eventName}\n*Date:* ${(data as any).eventDate}\n*Venue:* ${(data as any).venue}\n*Amount:* ₹${(data as any).totalAmount.toLocaleString()}`;
        break;
      case 'payment_received':
        message += `*Event:* ${(data as any).eventName}\n*Amount Paid:* ₹${(data as any).amountPaid.toLocaleString()}\n*Payment Method:* ${(data as any).paymentMethod}\n*Remaining Balance:* ${(data as any).remainingBalance === 0 ? 'Fully Paid' : `₹${(data as any).remainingBalance.toLocaleString()}`}`;
        break;
    }
    
    // Use different branding message for clients vs staff
    if (type === 'event_confirmation' || type === 'payment_received' || type === 'event_cancellation' || type === 'event_update') {
      message += `\n\nThank you for choosing *${settings.firm_name}*\n_${settings.firm_tagline}_\n${settings.contact_info}\n${settings.footer_signature}`;
    } else {
      message += `\n\nThank you for being part of *${settings.firm_name}*\n_${settings.firm_tagline}_\n${settings.contact_info}\n${settings.footer_signature}`;
    }
    
    return message;
  };

  const templateDisplayNames = {
    // Staff notifications
    event_assignment: 'Staff Event Assignment',
    event_unassignment: 'Staff Event Unassignment',
    task_assignment: 'Staff Task Assignment',
    task_unassignment: 'Staff Task Unassignment',
    task_cancellation: 'Staff Task Cancellation',
    salary_payment: 'Staff Salary Payment',
    event_staff_cancellation: 'Staff Event Cancellation',
    availability_check: 'Staff Availability Check',
    task_reported: 'Staff Task Reported',
    staff_event_update: 'Staff Event Update',
    task_update: 'Staff Task Update',
    event_staff_notification: 'Staff Work Instructions',
    // Client notifications
    event_cancellation: 'Client Event Cancellation',
    event_update: 'Client Event Update', 
    event_confirmation: 'Client Event Confirmation',
    payment_received: 'Client Payment Received'
  };

  const staffTemplates = ['event_assignment', 'event_unassignment', 'task_assignment', 'task_unassignment', 'task_cancellation', 'salary_payment', 'event_staff_cancellation', 'availability_check', 'task_reported', 'staff_event_update', 'task_update', 'event_staff_notification'];
  const clientTemplates = ['event_cancellation', 'event_update', 'event_confirmation', 'payment_received'];

  if (isLoading) {
    return <div className="p-6">Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">WhatsApp Notification Templates</h3>
          <p className="text-sm text-muted-foreground">
            Customize all your WhatsApp notification messages and branding
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Message Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Preview Type</Label>
                  <Select value={previewType} onValueChange={(value) => setPreviewType(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="text-xs font-medium text-muted-foreground px-2 py-1">Staff Templates</div>
                      {staffTemplates.map((key) => (
                        <SelectItem key={key} value={key}>
                          {templateDisplayNames[key as keyof typeof templateDisplayNames]}
                        </SelectItem>
                      ))}
                      <div className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">Client Templates</div>
                      {clientTemplates.map((key) => (
                        <SelectItem key={key} value={key}>
                          {templateDisplayNames[key as keyof typeof templateDisplayNames]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {generatePreview(previewType)}
                  </pre>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={saveSettings} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="staff-templates">Staff Templates</TabsTrigger>
          <TabsTrigger value="client-templates">Client Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Firm Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firm_name">Firm Name</Label>
                  <Input
                    id="firm_name"
                    value={settings.firm_name}
                    onChange={(e) => setSettings(prev => ({ ...prev, firm_name: e.target.value }))}
                    placeholder="Your Firm Name"
                  />
                </div>
                <div>
                  <Label htmlFor="firm_tagline">Firm Tagline</Label>
                  <Input
                    id="firm_tagline"
                    value={settings.firm_tagline}
                    onChange={(e) => setSettings(prev => ({ ...prev, firm_tagline: e.target.value }))}
                    placeholder="Your Firm Tagline"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact_info">Contact Information</Label>
                <Textarea
                  id="contact_info"
                  value={settings.contact_info}
                  onChange={(e) => setSettings(prev => ({ ...prev, contact_info: e.target.value }))}
                  placeholder="Contact: +91 XXXXXXXXXX&#10;Email: your@email.com"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="footer_signature">Footer Signature</Label>
                <Textarea
                  id="footer_signature"
                  value={settings.footer_signature}
                  onChange={(e) => setSettings(prev => ({ ...prev, footer_signature: e.target.value }))}
                  placeholder="Your memories, our passion"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff-templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Notification Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {staffTemplates.map((templateKey) => {
                const template = settings.notification_templates[templateKey as keyof NotificationSettings['notification_templates']];
                return (
                  <div key={templateKey} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{templateDisplayNames[templateKey as keyof typeof templateDisplayNames]}</h4>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Preview: {templateDisplayNames[templateKey as keyof typeof templateDisplayNames]}</DialogTitle>
                          </DialogHeader>
                          <div className="bg-muted p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {generatePreview(templateKey as keyof NotificationSettings['notification_templates'])}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={template.title}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            notification_templates: {
                              ...prev.notification_templates,
                              [templateKey]: { ...template, title: e.target.value }
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Greeting</Label>
                        <Input
                          value={template.greeting}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            notification_templates: {
                              ...prev.notification_templates,
                              [templateKey]: { ...template, greeting: e.target.value }
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Content</Label>
                        <Textarea
                          value={template.content}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            notification_templates: {
                              ...prev.notification_templates,
                              [templateKey]: { ...template, content: e.target.value }
                            }
                          }))}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client-templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Client Notification Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {clientTemplates.map((templateKey) => {
                const template = settings.notification_templates[templateKey as keyof NotificationSettings['notification_templates']];
                return (
                  <div key={templateKey} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{templateDisplayNames[templateKey as keyof typeof templateDisplayNames]}</h4>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Preview: {templateDisplayNames[templateKey as keyof typeof templateDisplayNames]}</DialogTitle>
                          </DialogHeader>
                          <div className="bg-muted p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {generatePreview(templateKey as keyof NotificationSettings['notification_templates'])}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={template.title}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            notification_templates: {
                              ...prev.notification_templates,
                              [templateKey]: { ...template, title: e.target.value }
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Greeting</Label>
                        <Input
                          value={template.greeting}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            notification_templates: {
                              ...prev.notification_templates,
                              [templateKey]: { ...template, greeting: e.target.value }
                            }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Content</Label>
                        <Textarea
                          value={template.content}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            notification_templates: {
                              ...prev.notification_templates,
                              [templateKey]: { ...template, content: e.target.value }
                            }
                          }))}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedNotificationTemplates;