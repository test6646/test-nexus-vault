import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MoneyBag02Icon, 
  Camera01Icon, 
  Video01Icon, 
  DroneIcon, 
  Edit01Icon,
  PlusSignIcon,
  SparklesIcon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  Add01Icon,
  FilmRoll01Icon
} from 'hugeicons-react';

interface PricingConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmId: string;
  onSuccess?: () => void;
}

interface RoleRates {
  photographer: number;
  cinematographer: number;
  drone: number;
  editor: number;
}

interface DynamicAddOn {
  id: string;
  name: string;
  price: number;
  unit?: string;
}

interface DynamicPostProduction {
  id: string;
  name: string;
  price: number;
}

const PricingConfigurationDialog = ({ open, onOpenChange, firmId, onSuccess }: PricingConfigurationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roleRates, setRoleRates] = useState<RoleRates>({
    photographer: 14000,
    cinematographer: 16000,
    drone: 12000,
    editor: 8000
  });

  const [addOns, setAddOns] = useState<DynamicAddOn[]>([
    { id: '1', name: '1 Day Drone', price: 12000 },
    { id: '2', name: '2 Days Pre Wedding', price: 65000 },
    { id: '3', name: '1 Day Pre Wedding', price: 50000 },
    { id: '4', name: '1 Day Pre Photoshot', price: 22000 },
    { id: '5', name: 'Live HD Setup', price: 60000 },
    { id: '6', name: 'Side 10x20 LED Wall', price: 25000 },
    { id: '7', name: 'Background LED', price: 135, unit: 'Per Fit' },
    { id: '8', name: 'Album Page', price: 450, unit: 'Per Page' },
    { id: '9', name: 'Full Length Film', price: 22000 }
  ]);

  const [postProductions, setPostProductions] = useState<DynamicPostProduction[]>([
    { id: '1', name: '35K Package', price: 35000 },
    { id: '2', name: '45K Package', price: 45000 }
  ]);

  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState('');
  const [newAddOnUnit, setNewAddOnUnit] = useState('');

  const [newPostProdName, setNewPostProdName] = useState('');
  const [newPostProdPrice, setNewPostProdPrice] = useState('');

  // Load current pricing configuration
  useEffect(() => {
    if (open && firmId) {
      loadPricingConfiguration();
    }
  }, [open, firmId]);

  const loadPricingConfiguration = async () => {
    setLoading(true);
    try {
      const { data: firm, error } = await supabase
        .from('firms')
        .select('default_role_rates, default_addon_rates, default_postproduction_rates')
        .eq('id', firmId)
        .single();

      if (error) throw error;

      if (firm.default_role_rates) {
        setRoleRates({ ...roleRates, ...(firm.default_role_rates as any) });
      }

      // Convert old addon format to new dynamic format
      if (firm.default_addon_rates) {
        const existingAddOns = Object.entries(firm.default_addon_rates as any).map(([key, value], index) => ({
          id: (index + 1).toString(),
          name: formatAddOnName(key),
          price: value as number,
          unit: (key === 'background_led_per_fit') ? 'Per Fit' : 
                (key === 'album_page') ? 'Per Page' : undefined
        }));
        setAddOns(existingAddOns);
      }

      // Load post-production rates
      if (firm.default_postproduction_rates) {
        const existingPostProd = Object.entries(firm.default_postproduction_rates as any).map(([key, value], index) => ({
          id: (index + 1).toString(),
          name: formatPostProdName(key),
          price: value as number
        }));
        setPostProductions(existingPostProd);
      }
    } catch (error: any) {
      toast({
        title: "Error loading pricing configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert dynamic addons back to keyed format for database
      const addonRatesObj = addOns.reduce((acc, addon, index) => {
        const key = addon.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        acc[key] = addon.price;
        return acc;
      }, {} as any);

      // Convert dynamic post-production to keyed format
      const postProdRatesObj = postProductions.reduce((acc, postProd, index) => {
        const key = postProd.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        acc[key] = postProd.price;
        return acc;
      }, {} as any);

      const { error } = await supabase
        .from('firms')
        .update({
          default_role_rates: roleRates as any,
          default_addon_rates: addonRatesObj,
          default_postproduction_rates: postProdRatesObj
        })
        .eq('id', firmId);

      if (error) throw error;

      toast({
        title: "Pricing configuration updated successfully",
        description: "Default rates have been saved and will be used in quotations",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving pricing configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateRoleRate = (role: keyof RoleRates, value: number) => {
    setRoleRates(prev => ({ ...prev, [role]: value }));
  };

  const updateAddOnPrice = (id: string, price: number) => {
    setAddOns(prev => prev.map(addon => 
      addon.id === id ? { ...addon, price } : addon
    ));
  };

  const updatePostProdPrice = (id: string, price: number) => {
    setPostProductions(prev => prev.map(postProd => 
      postProd.id === id ? { ...postProd, price } : postProd
    ));
  };

  const addNewAddOn = () => {
    if (newAddOnName.trim() && newAddOnPrice.trim()) {
      const newId = (Math.max(0, ...addOns.map(a => parseInt(a.id))) + 1).toString();
      setAddOns(prev => [...prev, {
        id: newId,
        name: newAddOnName.trim(),
        price: parseInt(newAddOnPrice),
        unit: newAddOnUnit.trim() || undefined
      }]);
      setNewAddOnName('');
      setNewAddOnPrice('');
      setNewAddOnUnit('');
    }
  };

  const removeAddOn = (id: string) => {
    setAddOns(prev => prev.filter(addon => addon.id !== id));
  };

  const addNewPostProduction = () => {
    if (newPostProdName.trim() && newPostProdPrice.trim()) {
      const newId = (Math.max(0, ...postProductions.map(p => parseInt(p.id))) + 1).toString();
      setPostProductions(prev => [...prev, {
        id: newId,
        name: newPostProdName.trim(),
        price: parseInt(newPostProdPrice)
      }]);
      setNewPostProdName('');
      setNewPostProdPrice('');
    }
  };

  const removePostProduction = (id: string) => {
    setPostProductions(prev => prev.filter(postProd => postProd.id !== id));
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'photographer': return 'Photographer';
      case 'cinematographer': return 'Cinematographer';
      case 'drone': return 'Drone Pilot';
      case 'editor': return 'Editor';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'photographer': return Camera01Icon;
      case 'cinematographer': return Video01Icon;
      case 'drone': return DroneIcon;
      case 'editor': return Edit01Icon;
      default: return MoneyBag02Icon;
    }
  };

  const formatAddOnName = (addOn: string) => {
    return addOn
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPostProdName = (postProd: string) => {
    return postProd
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] md:max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <MoneyBag02Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Loading pricing configuration...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[70vh] md:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoneyBag02Icon className="h-5 w-5 text-primary" />
            Default Pricing Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Role Rates Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Camera01Icon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Role Rates (Per Day)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(roleRates).map(([role, rate]) => {
                const IconComponent = getRoleIcon(role);
                return (
                  <div key={role} className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      {formatRoleName(role)}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={rate}
                        onChange={(e) => updateRoleRate(role as keyof RoleRates, parseInt(e.target.value) || 0)}
                        className="pl-8"
                        placeholder="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Add-On Rates Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Add-On Rates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addOns.map((addOn) => (
                <div key={addOn.id} className="space-y-2 p-4 border rounded-xl relative bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAddOn(addOn.id)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Delete02Icon className="h-3 w-3" />
                  </Button>
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <PlusSignIcon className="h-4 w-4 text-muted-foreground" />
                    {addOn.name}
                    {addOn.unit && (
                      <span className="text-xs text-muted-foreground">({addOn.unit})</span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={addOn.price}
                      onChange={(e) => updateAddOnPrice(addOn.id, parseInt(e.target.value) || 0)}
                      className="pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Add-On */}
            <div className="border-2 border-dashed border-primary/20 rounded-xl p-4 space-y-3 bg-background">
              <Label className="flex items-center gap-2 text-sm font-medium text-primary">
                <Add01Icon className="h-4 w-4" />
                Add New Add-On
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Add-on name"
                  value={newAddOnName}
                  onChange={(e) => setNewAddOnName(e.target.value)}
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    placeholder="Price"
                    value={newAddOnPrice}
                    onChange={(e) => setNewAddOnPrice(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Input
                  placeholder="Unit (optional)"
                  value={newAddOnUnit}
                  onChange={(e) => setNewAddOnUnit(e.target.value)}
                />
                <Button onClick={addNewAddOn} disabled={!newAddOnName.trim() || !newAddOnPrice.trim()}>
                  <Add01Icon className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Post-Production Rates Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FilmRoll01Icon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Post-Production Rates</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {postProductions.map((postProd) => (
                <div key={postProd.id} className="space-y-2 p-4 border rounded-xl relative bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePostProduction(postProd.id)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Delete02Icon className="h-3 w-3" />
                  </Button>
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <FilmRoll01Icon className="h-4 w-4 text-muted-foreground" />
                    {postProd.name}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={postProd.price}
                      onChange={(e) => updatePostProdPrice(postProd.id, parseInt(e.target.value) || 0)}
                      className="pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Post-Production */}
            <div className="border-2 border-dashed border-primary/20 rounded-xl p-4 space-y-3 bg-background">
              <Label className="flex items-center gap-2 text-sm font-medium text-primary">
                <Add01Icon className="h-4 w-4" />
                Add New Post-Production Package
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Package name"
                  value={newPostProdName}
                  onChange={(e) => setNewPostProdName(e.target.value)}
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    placeholder="Price"
                    value={newPostProdPrice}
                    onChange={(e) => setNewPostProdPrice(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button onClick={addNewPostProduction} disabled={!newPostProdName.trim() || !newPostProdPrice.trim()}>
                  <Add01Icon className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="min-w-[120px]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              <CheckmarkCircle01Icon className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingConfigurationDialog;
