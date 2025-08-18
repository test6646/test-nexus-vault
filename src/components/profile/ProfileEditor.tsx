import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Edit01Icon, SecurityIcon, AiMailIcon, Call02Icon, ViewIcon, ViewOffIcon, Loading01Icon } from 'hugeicons-react';
import { Separator } from '@/components/ui/separator';

const ProfileEditor = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  // Form states
  const [emailForm, setEmailForm] = useState({
    email: user?.email || '',
    loading: false
  });
  
  const [phoneForm, setPhoneForm] = useState({
    phone: profile?.mobile_number || '',
    loading: false
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    loading: false,
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });

  const [nameForm, setNameForm] = useState({
    fullName: profile?.full_name || '',
    loading: false
  });

  // Update email
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email.trim()) {
      toast({
        title: "Error",
        description: "Email cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setEmailForm(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailForm.email
      });

      if (error) throw error;

      toast({
        title: "Email Update Requested",
        description: "Check your new email for a confirmation link to complete the update."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive"
      });
    } finally {
      setEmailForm(prev => ({ ...prev, loading: false }));
    }
  };

  // Update phone
  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForm.phone.trim()) {
      toast({
        title: "Error",
        description: "Phone number cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setPhoneForm(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mobile_number: phoneForm.phone })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Profile will update automatically through refetch
      window.location.reload(); // Simple refresh to update state

      toast({
        title: "Success",
        description: "Phone number updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number",
        variant: "destructive"
      });
    } finally {
      setPhoneForm(prev => ({ ...prev, loading: false }));
    }
  };

  // Update name
  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameForm.fullName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setNameForm(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: nameForm.fullName })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Profile will update automatically through refetch
      window.location.reload(); // Simple refresh to update state

      toast({
        title: "Success",
        description: "Name updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update name",
        variant: "destructive"
      });
    } finally {
      setNameForm(prev => ({ ...prev, loading: false }));
    }
  };

  // Update password
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setPasswordForm(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      // Clear password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        loading: false,
        showCurrentPassword: false,
        showNewPassword: false,
        showConfirmPassword: false
      });

      toast({
        title: "Success",
        description: "Password updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive"
      });
    } finally {
      setPasswordForm(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Name Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit01Icon className="h-5 w-5" />
            Update Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameUpdate} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={nameForm.fullName}
                onChange={(e) => setNameForm(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your full name"
                disabled={nameForm.loading}
              />
            </div>
            <Button 
              type="submit" 
              disabled={nameForm.loading || nameForm.fullName === profile?.full_name}
              className="w-full"
            >
              {nameForm.loading ? (
                <>
                  <Loading01Icon className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Name'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AiMailIcon className="h-5 w-5" />
            Update Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter new email address"
                disabled={emailForm.loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                You'll receive a confirmation email at your new address
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={emailForm.loading || emailForm.email === user?.email}
              className="w-full"
            >
              {emailForm.loading ? (
                <>
                  <Loading01Icon className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Email'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Phone Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Call02Icon className="h-5 w-5" />
            Update Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhoneUpdate} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneForm.phone}
                onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
                disabled={phoneForm.loading}
              />
            </div>
            <Button 
              type="submit" 
              disabled={phoneForm.loading || phoneForm.phone === profile?.mobile_number}
              className="w-full"
            >
              {phoneForm.loading ? (
                <>
                  <Loading01Icon className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Phone'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Update */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SecurityIcon className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={passwordForm.showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  disabled={passwordForm.loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setPasswordForm(prev => ({ ...prev, showNewPassword: !prev.showNewPassword }))}
                  disabled={passwordForm.loading}
                >
                  {passwordForm.showNewPassword ? (
                    <ViewOffIcon className="h-4 w-4" />
                  ) : (
                    <ViewIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={passwordForm.showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  disabled={passwordForm.loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setPasswordForm(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                  disabled={passwordForm.loading}
                >
                  {passwordForm.showConfirmPassword ? (
                    <ViewOffIcon className="h-4 w-4" />
                  ) : (
                    <ViewIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={passwordForm.loading || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="w-full"
            >
              {passwordForm.loading ? (
                <>
                  <Loading01Icon className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileEditor;