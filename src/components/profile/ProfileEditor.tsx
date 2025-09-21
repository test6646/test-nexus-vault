import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Edit01Icon, SecurityIcon, AiMailIcon, Call02Icon, ViewIcon, ViewOffIcon, Loading01Icon, UserIcon } from 'hugeicons-react';
import { Separator } from '@/components/ui/separator';

const ProfileEditor = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  // Single form state
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.mobile_number || '',
    newPassword: '',
    confirmPassword: ''
  });

  const [formState, setFormState] = useState({
    loading: false,
    showNewPassword: false,
    showConfirmPassword: false
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setFormState(prev => ({ ...prev, loading: true }));
    
    try {
      // Update profile data
      if (formData.fullName !== profile?.full_name || formData.phone !== profile?.mobile_number) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: formData.fullName,
            mobile_number: formData.phone 
          })
          .eq('user_id', user?.id);

        if (profileError) throw profileError;
      }

      // Update email if changed
      if (formData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) throw emailError;
      }

      // Update password if provided
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (passwordError) throw passwordError;
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: ''
        }));
      }

      window.location.reload(); // Simple refresh to update state

      toast({
        title: "Success",
        description: formData.email !== user?.email 
          ? "Profile updated! Check your new email for confirmation link."
          : "Profile updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setFormState(prev => ({ ...prev, loading: false }));
    }
  };

  const hasChanges = 
    formData.fullName !== profile?.full_name ||
    formData.email !== user?.email ||
    formData.phone !== profile?.mobile_number ||
    formData.newPassword.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-2">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
            <UserIcon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Profile Settings</CardTitle>
          <p className="text-muted-foreground">
            Update your personal information and security settings
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Edit01Icon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Personal Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    disabled={formState.loading}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    disabled={formState.loading}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  disabled={formState.loading}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You'll receive a confirmation email if changed
                </p>
              </div>
            </div>

            <Separator />

            {/* Security Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <SecurityIcon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Security Settings
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="newPassword"
                      type={formState.showNewPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                      disabled={formState.loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setFormState(prev => ({ ...prev, showNewPassword: !prev.showNewPassword }))}
                      disabled={formState.loading}
                    >
                      {formState.showNewPassword ? (
                        <ViewOffIcon className="h-4 w-4" />
                      ) : (
                        <ViewIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={formState.showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      disabled={formState.loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setFormState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                      disabled={formState.loading}
                    >
                      {formState.showConfirmPassword ? (
                        <ViewOffIcon className="h-4 w-4" />
                      ) : (
                        <ViewIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Leave password fields empty if you don't want to change it
              </p>
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={formState.loading || !hasChanges}
                size="lg"
                className="w-full"
              >
                {formState.loading ? (
                  <>
                    <Loading01Icon className="mr-2 h-4 w-4 animate-spin" />
                    Updating Profile...
                  </>
                ) : (
                  <>
                    <Edit01Icon className="mr-2 h-4 w-4" />
                    Update Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileEditor;