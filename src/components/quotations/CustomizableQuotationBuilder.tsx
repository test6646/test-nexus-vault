import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  PlusSignIcon, 
  MinusSignIcon, 
  Calendar01Icon, 
  Video01Icon, 
  Camera01Icon, 
  SparklesIcon, 
  Settings01Icon,
  CheckmarkCircle01Icon,
  ArrowLeft01Icon,
  DroneIcon,
  Cancel01Icon,
  Edit01Icon
} from 'hugeicons-react';
import { EventType } from '@/types/studio';

interface QuotationFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue: string;
  description: string;
  valid_until: string;
}

interface DayConfig {
  id: string;
  name: string;
  photographers: number;
  cinematographers: number;
  drone: number;
  photographerRate: number;
  cinematographerRate: number;
  droneRate: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
  unit?: string;
  quantity?: number;
  description?: string;
}

interface PostProductionItem {
  id: string;
  name: string;
  enabled: boolean;
  customizable: boolean;
}

interface CustomizableQuotationBuilderProps {
  formData: QuotationFormData;
  onBack: () => void;
  onComplete: () => void;
  editingQuotation?: any;
}

const CustomizableQuotationBuilder = ({ formData, onBack, onComplete, editingQuotation }: CustomizableQuotationBuilderProps) => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [numberOfDays, setNumberOfDays] = useState(editingQuotation?.quotation_details?.days?.length || 2);
  const [days, setDays] = useState<DayConfig[]>(
    editingQuotation?.quotation_details?.days || [
      {
        id: '1',
        name: 'Day 1',
        photographers: 2,
        cinematographers: 2,
        drone: 1,
        photographerRate: 14000,
        cinematographerRate: 16000,
        droneRate: 12000
      },
      {
        id: '2',
        name: 'Day 2',
        photographers: 2,
        cinematographers: 2,
        drone: 1,
        photographerRate: 14000,
        cinematographerRate: 16000,
        droneRate: 12000
      }
    ]
  );

  // Same day editing toggle
  const [sameDayEditing, setSameDayEditing] = useState(
    editingQuotation?.quotation_details?.sameDayEditing || false
  );

  // Customizable post-production items instead of fixed packages
  const [postProductionItems, setPostProductionItems] = useState<PostProductionItem[]>(
    editingQuotation?.quotation_details?.postProductionItems?.map((item: string, index: number) => ({
      id: (index + 1).toString(),
      name: item,
      enabled: true,
      customizable: false
    })) || [
      { id: '1', name: '1 HD Highlights', enabled: true, customizable: false },
      { id: '2', name: '40/45 Min Short Film', enabled: true, customizable: false },
      { id: '3', name: '4 Reels', enabled: true, customizable: false },
      { id: '4', name: '350+ Edited Photos', enabled: true, customizable: false },
      { id: '5', name: '10 Story & Post', enabled: true, customizable: false },
      { id: '6', name: 'All Data in 1 TB Hard Disk', enabled: true, customizable: false }
    ]
  );

  const [newPostProductionItem, setNewPostProductionItem] = useState('');

  // Initialize add-ons with ALL items, merging enabled ones from editing quotation
  const getAllAddOns = () => {
    const defaultAddOns = [
      { id: '1', name: '1 Day Drone', price: 12000, enabled: false },
      { id: '2', name: '2 Days Pre Wedding', price: 65000, enabled: false },
      { id: '3', name: '1 Day Pre Wedding', price: 50000, enabled: false },
      { id: '4', name: '1 Day Pre Photoshot', price: 22000, enabled: false },
      { id: '5', name: 'Live HD Setup', price: 60000, enabled: false },
      { id: '6', name: 'Side 10x20 LED Wall', price: 25000, enabled: false },
      { id: '7', name: 'Background LED', price: 135, enabled: false, unit: 'Per Fit', quantity: 1 },
      { id: '8', name: 'Album Page', price: 450, enabled: false, unit: 'Per Page', quantity: 1 },
      { id: '9', name: 'Full Length Film 3/4 Hour', price: 22000, enabled: false }
    ];

    if (editingQuotation?.quotation_details?.addOns) {
      // Merge enabled add-ons from existing quotation
      const existingAddOns = editingQuotation.quotation_details.addOns;
      return defaultAddOns.map(defaultAddon => {
        const existingAddon = existingAddOns.find((addon: any) => addon.id === defaultAddon.id);
        if (existingAddon) {
          return { ...defaultAddon, ...existingAddon };
        }
        return defaultAddon;
      });
    }
    
    return defaultAddOns;
  };

  const [addOns, setAddOns] = useState<AddOn[]>(getAllAddOns());

  // Handle adding custom post-production items
  const addCustomPostProductionItem = () => {
    if (newPostProductionItem.trim()) {
      const newItem: PostProductionItem = {
        id: Date.now().toString(),
        name: newPostProductionItem.trim(),
        enabled: true,
        customizable: true
      };
      setPostProductionItems([...postProductionItems, newItem]);
      setNewPostProductionItem('');
    }
  };

  const removePostProductionItem = (itemId: string) => {
    setPostProductionItems(postProductionItems.filter(item => item.id !== itemId));
  };

  const togglePostProductionItem = (itemId: string) => {
    setPostProductionItems(postProductionItems.map(item =>
      item.id === itemId ? { ...item, enabled: !item.enabled } : item
    ));
  };

  // Update days when numberOfDays changes
  const handleDaysChange = (newDayCount: number) => {
    setNumberOfDays(newDayCount);
    
    const newDays = [...days];
    
    if (newDayCount > days.length) {
      // Add new days with same configuration
      for (let i = days.length; i < newDayCount; i++) {
        newDays.push({
          id: (i + 1).toString(),
          name: `Day ${i + 1}`,
          photographers: 2,
          cinematographers: 2,
          drone: 1,
          photographerRate: 14000,
          cinematographerRate: 16000,
          droneRate: 12000
        });
      }
    } else {
      // Remove extra days
      newDays.splice(newDayCount);
    }
    
    setDays(newDays);
  };

  const updateDayConfig = (dayId: string, field: keyof DayConfig, value: number) => {
    setDays(days.map(day => 
      day.id === dayId ? { ...day, [field]: value } : day
    ));
  };

  const toggleAddOn = (addOnId: string) => {
    setAddOns(addOns.map(addOn =>
      addOn.id === addOnId ? { ...addOn, enabled: !addOn.enabled } : addOn
    ));
  };

  const updateAddOnQuantity = (addOnId: string, quantity: number) => {
    setAddOns(addOns.map(addOn =>
      addOn.id === addOnId ? { ...addOn, quantity: Math.max(1, quantity) } : addOn
    ));
  };

  const updateAddOnDescription = (addOnId: string, description: string) => {
    setAddOns(addOns.map(addOn =>
      addOn.id === addOnId ? { ...addOn, description } : addOn
    ));
  };

  // Post-production cost - selectable packages
  const [selectedPostProductionPackage, setSelectedPostProductionPackage] = useState(
    editingQuotation?.quotation_details?.selectedPostProductionPackage || '45k'
  );
  
  const postProductionOptions = {
    '35k': 35000,
    '45k': 45000,
    'custom': 0
  };

  const [customAmount, setCustomAmount] = useState(
    editingQuotation?.quotation_details?.customPostProductionAmount || 0
  );
  
  const postProductionCost = selectedPostProductionPackage === 'custom' 
    ? customAmount 
    : postProductionOptions[selectedPostProductionPackage as keyof typeof postProductionOptions];

  const calculateTotals = () => {
    // Calculate crew costs
    const crewTotal = days.reduce((total, day) => {
      return total + 
        (day.photographers * day.photographerRate) + 
        (day.cinematographers * day.cinematographerRate) +
        (day.drone * day.droneRate);
    }, 0);

    // Calculate add-ons total
    const addOnsTotal = addOns
      .filter(addOn => addOn.enabled)
      .reduce((total, addOn) => {
        const quantity = addOn.quantity || 1;
        return total + (addOn.price * quantity);
      }, 0);

    return {
      crewTotal,
      postProductionCost,
      addOnsTotal,
      grandTotal: crewTotal + postProductionCost + addOnsTotal
    };
  };

  const handleSaveQuotation = async () => {
    const totals = calculateTotals();
    
    try {
      const quotationDetails = {
        days: days.map(day => ({
          id: day.id,
          name: day.name,
          photographers: day.photographers,
          cinematographers: day.cinematographers,
          drone: day.drone,
          photographerRate: day.photographerRate,
          cinematographerRate: day.cinematographerRate,
          droneRate: day.droneRate
        })),
        postProductionItems: postProductionItems.filter(item => item.enabled).map(item => item.name),
        selectedPostProductionPackage: selectedPostProductionPackage,
        customPostProductionAmount: selectedPostProductionPackage === 'custom' ? customAmount : null,
        sameDayEditing: sameDayEditing,
        addOns: addOns.filter(addOn => addOn.enabled).map(addOn => ({
          id: addOn.id,
          name: addOn.name,
          price: addOn.price,
          enabled: addOn.enabled,
          unit: addOn.unit || null,
          quantity: addOn.quantity || 1,
          description: addOn.description || null
        })),
        totals: {
          crewTotal: totals.crewTotal,
          postProductionCost: totals.postProductionCost,
          addOnsTotal: totals.addOnsTotal,
          grandTotal: totals.grandTotal
        }
      };

      const quotationData = {
        title: formData.title,
        client_id: formData.client_id,
        event_type: formData.event_type,
        event_date: formData.event_date,
        venue: formData.venue || null,
        description: formData.description || null,
        valid_until: formData.valid_until || null,
        amount: totals.grandTotal,
        firm_id: currentFirmId,
        created_by: profile?.id,
        quotation_details: quotationDetails as any
      };

      if (editingQuotation) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', editingQuotation.id);

        if (error) throw error;

        toast({
          title: "Quotation updated successfully!",
          description: `${formData.title} has been updated with detailed breakdown`,
        });
      } else {
        const { error } = await supabase
          .from('quotations')
          .insert(quotationData);

        if (error) throw error;

        toast({
          title: "Quotation created successfully!",
          description: `${formData.title} has been created with detailed breakdown`,
        });
      }

      onComplete();
    } catch (error: any) {
      console.error('Quotation save error:', error);
      toast({
        title: `Error ${editingQuotation ? 'updating' : 'creating'} quotation`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* 3-Column Layout - Mobile responsive */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-4`}>
        
        {/* Column 1: Day-wise Selection */}
        <Card className="h-fit rounded-3xl border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Calendar01Icon className="h-5 w-5 text-primary" />
              <span>Event Days & Crew</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            {/* Number of Days */}
            <div className="flex items-center justify-between">
              <Label htmlFor="days" className="text-sm font-medium">Number of Days:</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => numberOfDays > 1 && handleDaysChange(numberOfDays - 1)}
                  disabled={numberOfDays <= 1}
                  className="rounded-full h-10 w-10 p-0"
                >
                  <MinusSignIcon className="h-4 w-4" />
                </Button>
                <span className="min-w-[2rem] text-center font-medium">{numberOfDays}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDaysChange(numberOfDays + 1)}
                  className="rounded-full h-10 w-10 p-0"
                >
                  <PlusSignIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Day Configurations */}
            <div className="space-y-3">
              {days.map((day) => (
                <Card key={day.id} className="border border-primary/20 rounded-2xl">
                  <CardContent className="p-3">
                    <h4 className="font-semibold text-primary mb-3 text-center">{day.name}</h4>
                    
                    <div className="space-y-2">
                      {/* Photographers */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Camera01Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Photographers</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={day.photographers}
                            onChange={(e) => updateDayConfig(day.id, 'photographers', parseInt(e.target.value) || 0)}
                            className="w-16 h-10 text-sm rounded-full text-center border-2 border-primary/20 focus:border-primary"
                            min="0"
                          />
                          <span className="text-xs text-muted-foreground">× ₹{(day.photographerRate/1000).toFixed(0)}K</span>
                        </div>
                      </div>

                      {/* Cinematographers */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Video01Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Cinematographers</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={day.cinematographers}
                            onChange={(e) => updateDayConfig(day.id, 'cinematographers', parseInt(e.target.value) || 0)}
                            className="w-16 h-10 text-sm rounded-full text-center border-2 border-primary/20 focus:border-primary"
                            min="0"
                          />
                          <span className="text-xs text-muted-foreground">× ₹{(day.cinematographerRate/1000).toFixed(0)}K</span>
                        </div>
                      </div>

                      {/* Drone */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DroneIcon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Drone</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={day.drone}
                            onChange={(e) => updateDayConfig(day.id, 'drone', parseInt(e.target.value) || 0)}
                            className="w-16 h-10 text-sm rounded-full text-center border-2 border-primary/20 focus:border-primary"
                            min="0"
                          />
                          <span className="text-xs text-muted-foreground">× ₹{(day.droneRate/1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-primary/10">
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground">Day Total: </span>
                        <span className="font-semibold text-primary text-sm">
                          ₹{((day.photographers * day.photographerRate) + (day.cinematographers * day.cinematographerRate) + (day.drone * day.droneRate)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Post-Production - Selectable Cost */}
        <Card className="h-fit rounded-3xl border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <SparklesIcon className="h-5 w-5 text-primary" />
              <span>Post-Production Services</span>
              <Badge className="bg-primary text-primary-foreground ml-2 rounded-full">
                ₹{(postProductionCost/1000).toFixed(0)}K
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            {/* Package Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose Package:</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={selectedPostProductionPackage === '35k' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPostProductionPackage('35k')}
                  className="rounded-full text-xs h-10"
                >
                  ₹35K
                </Button>
                <Button
                  variant={selectedPostProductionPackage === '45k' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPostProductionPackage('45k')}
                  className="rounded-full text-xs h-10"
                >
                  ₹45K
                </Button>
                <Button
                  variant={selectedPostProductionPackage === 'custom' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPostProductionPackage('custom')}
                  className="rounded-full text-xs h-10"
                >
                  Custom
                </Button>
              </div>
              
              {/* Custom Amount Input */}
              {selectedPostProductionPackage === 'custom' && (
                <div className="mt-3">
                  <Label className="text-sm font-medium">Custom Amount (₹):</Label>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(parseInt(e.target.value) || 0)}
                    placeholder="Enter custom amount"
                    className="rounded-full h-10 mt-1"
                    min="0"
                  />
                </div>
              )}
            </div>
            
            <Separator />

            {/* Same Day Editing Toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Same Day Editing</Label>
              <Switch
                checked={sameDayEditing}
                onCheckedChange={setSameDayEditing}
              />
            </div>
            
            <Separator />
            </CardContent>
          <CardContent className="space-y-3 px-3 pb-3">
            {/* Add new post-production item */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add custom service..."
                value={newPostProductionItem}
                onChange={(e) => setNewPostProductionItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomPostProductionItem()}
                className="flex-1 rounded-full h-10"
              />
              <Button onClick={addCustomPostProductionItem} size="sm" className="rounded-full h-10 w-10 p-0">
                <PlusSignIcon className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Post-production items list */}
            {postProductionItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-accent/10 rounded-2xl border border-accent/20">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={() => togglePostProductionItem(item.id)}
                  />
                  <span className={`text-sm font-medium ${item.enabled ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                    {item.name}
                  </span>
                </div>
                {item.customizable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePostProductionItem(item.id)}
                    className="h-8 w-8 p-0 text-destructive rounded-full"
                  >
                    <Cancel01Icon className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

          </CardContent>
        </Card>

        {/* Column 3: Add-ons */}
        <Card className="h-fit rounded-3xl border-2 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Settings01Icon className="h-5 w-5 text-primary" />
              <span>Extra Add-ons</span>
              <Badge className="bg-primary/10 text-primary ml-2 rounded-full">All Options</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            {addOns.map((addOn) => (
              <div key={addOn.id} className="border rounded-2xl hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium cursor-pointer" onClick={() => toggleAddOn(addOn.id)}>
                          {addOn.name}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          ₹{addOn.price.toLocaleString()}{addOn.unit && ` ${addOn.unit}`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {addOn.enabled && addOn.unit && (
                          <Input
                            type="number"
                            value={addOn.quantity || 1}
                            onChange={(e) => updateAddOnQuantity(addOn.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-xs rounded-full"
                            min="1"
                          />
                        )}
                        <Switch
                          checked={addOn.enabled}
                          onCheckedChange={() => toggleAddOn(addOn.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Description input appears when add-on is enabled */}
                {addOn.enabled && (
                  <div className="px-3 pb-3">
                    <Textarea
                      placeholder={`Enter description for ${addOn.name}...`}
                      value={addOn.description || ''}
                      onChange={(e) => updateAddOnDescription(addOn.id, e.target.value)}
                      className="w-full h-20 text-xs rounded-xl border-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Total Summary Card */}
      <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 rounded-3xl">
        <CardContent className="pt-6">
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'} gap-4 mb-4`}>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Crew Total</p>
              <p className="text-lg font-bold text-primary">₹{totals.crewTotal.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Post-Production</p>
              <p className="text-lg font-bold text-primary">₹{postProductionCost.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Add-ons Total</p>
              <p className="text-lg font-bold text-orange-600">₹{totals.addOnsTotal.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Grand Total</p>
              <p className="text-2xl font-bold text-primary">₹{totals.grandTotal.toLocaleString()}</p>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} gap-3`}>
            <Button 
              onClick={onBack}
              variant="outline" 
              className={`${isMobile ? 'w-full' : 'flex-1'} rounded-full order-2 sm:order-1`}
              size="lg"
            >
              <Cancel01Icon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveQuotation} 
              className={`${isMobile ? 'w-full' : 'flex-1'} rounded-full order-1 sm:order-2`}
              size="lg"
            >
              <CheckmarkCircle01Icon className="h-4 w-4 mr-2" />
              <span>{editingQuotation ? 'Update' : 'Create'} - </span>
              ₹{totals.grandTotal.toLocaleString()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomizableQuotationBuilder;
