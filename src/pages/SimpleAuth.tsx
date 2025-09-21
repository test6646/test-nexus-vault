import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading03Icon, CheckmarkCircle01Icon, Building06Icon, Cancel01Icon } from 'hugeicons-react';
import { useAuth } from '@/components/auth/AuthProvider';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';


interface Firm {
  id: string;
  name: string;
}

const SimpleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();

  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    mobileNumber: '',
    role: 'Admin' as const,
    firmId: ''
  });

  const [firmValidation, setFirmValidation] = useState({
    isValidating: false,
    isValid: false,
    firmName: '',
    error: ''
  });

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Redirect when auth is ready and user is confirmed
  // Wait for complete auth state including firm resolution before navigating
  useEffect(() => {
    if (authReady && user && user.email_confirmed_at) {
      navigate('/tasks', { replace: true });
    }
  }, [user, authReady, navigate]);

  // Reset firm validation when role changes
  useEffect(() => {
    if (signUpData.role !== 'Admin') {
      setSignUpData(prev => ({ ...prev, firmId: '' }));
    }
    // Reset firm validation when role changes
    setFirmValidation({
      isValidating: false,
      isValid: false,
      firmName: '',
      error: ''
    });
  }, [signUpData.role]);

  const handleAdminPinChange = (pin: string) => {
    setSignUpData(prev => ({ ...prev, adminPin: pin }));
  };

  const validateFirmId = async () => {
    const isAdminRole = signUpData.role === 'Admin';
    
    // For non-admin users, firm ID is required
    if (!isAdminRole && !signUpData.firmId.trim()) {
      setFirmValidation({
        isValidating: false,
        isValid: false,
        firmName: '',
        error: 'Please enter a firm ID'
      });
      return;
    }

    // For admin users, if no firm ID provided, it's valid (they'll create new firm)
    if (isAdminRole && !signUpData.firmId.trim()) {
      setFirmValidation({
        isValidating: false,
        isValid: true,
        firmName: '',
        error: ''
      });
      return;
    }

    setFirmValidation(prev => ({ ...prev, isValidating: true, error: '' }));

    try {
      // Verify the firm ID exists using the available function
      const { data: firmExists, error: verifyError } = await (supabase as any)
        .rpc('verify_firm_id', { p_id: signUpData.firmId.trim() });

      if (verifyError || !firmExists) {
        setFirmValidation({
          isValidating: false,
          isValid: false,
          firmName: '',
          error: 'Invalid firm ID'
        });
        return;
      }

      // If firm exists, show success
      setFirmValidation({
        isValidating: false,
        isValid: true,
        firmName: '',
        error: ''
      });

      // Removed extra toast

    } catch (error: any) {
      setFirmValidation({
        isValidating: false,
        isValid: false,
        firmName: '',
        error: 'Error validating firm ID'
      });
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Unified firm ID validation for all roles
    if (signUpData.role !== 'Admin' && !firmValidation.isValid) {
      toast({
        title: "Firm validation required",
        description: "Please enter and validate a firm ID",
        variant: "destructive",
      });
      return;
    }

    // For admins with firm ID, ensure it's validated
    if (signUpData.role === 'Admin' && signUpData.firmId.trim() && !firmValidation.isValid) {
      toast({
        title: "Firm validation required",
        description: "Please validate the firm ID before proceeding",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: signUpData.fullName,
              mobile_number: signUpData.mobileNumber,
              role: signUpData.role,
              firm_id: signUpData.firmId || null
            }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Account creation failed');

      // Store firm membership info in user metadata for later processing
      // The firm membership will be created when email is confirmed and profile is created

      toast({
        title: "Account created",
        description: "Check your email to verify",
      });

      // Clear form
      setSignUpData({ 
        fullName: '', 
        email: '', 
        password: '', 
        mobileNumber: '', 
        role: 'Admin',
        firmId: ''
      });
      setFirmValidation({
        isValidating: false,
        isValid: false,
        firmName: '',
        error: ''
      });

    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      });

      if (error) throw error;

      // Don't navigate immediately - let AuthProvider handle the flow
      // This prevents the flicker by not racing with auth state updates

    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove auth loading check - let routing components handle loading states
  // This prevents double loading screens causing flickers

  const [currentMode, setCurrentMode] = useState<'signin' | 'signup'>('signin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-3 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">STOODIORA</h1>
        </div>
        
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
          {currentMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                  className="h-10 rounded-full px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">
                  Password
                </Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  required
                  className="h-10 rounded-full px-4"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full rounded-full">
                {isLoading ? (
                  <>
                    <Loading03Icon className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <div className="text-center mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMode('signup')}
                  className="text-sm text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    placeholder="Enter your full name"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                    required
                    className="h-10 rounded-full px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-mobile">
                    Mobile Number
                  </Label>
                  <Input
                    id="signup-mobile"
                    placeholder="10 digit mobile number"
                    value={signUpData.mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setSignUpData({ ...signUpData, mobileNumber: value });
                    }}
                    required
                    className="h-10 rounded-full px-4"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    className="h-10 rounded-full px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role">
                    Role
                  </Label>
                  <Select value={signUpData.role} onValueChange={(value: any) => setSignUpData({ ...signUpData, role: value, firmId: '' })}>
                  <SelectTrigger className="h-10 rounded-full px-4">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">
                        <div className="flex items-center gap-2">
                          <Building06Icon className="w-4 h-4" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="Photographer">Photographer</SelectItem>
                      <SelectItem value="Cinematographer">Cinematographer</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Unified Firm ID Section for all roles */}
              <div className="space-y-2">
                <Label htmlFor="signup-firm-id">
                  {signUpData.role === 'Admin' 
                    ? 'Firm ID (optional)' 
                    : 'Firm ID *'
                  }
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="signup-firm-id"
                    placeholder={signUpData.role === 'Admin' 
                      ? "Enter firm ID to join existing firm" 
                      : "Enter firm ID provided by admin"
                    }
                    value={signUpData.firmId}
                    onChange={(e) => {
                      setSignUpData({ ...signUpData, firmId: e.target.value });
                      if (firmValidation.isValid || firmValidation.error) {
                        setFirmValidation({
                          isValidating: false,
                          isValid: false,
                          firmName: '',
                          error: ''
                        });
                      }
                    }}
                    className="flex-1 h-10 rounded-full px-4"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={validateFirmId}
                    disabled={firmValidation.isValidating || (signUpData.role !== 'Admin' && !signUpData.firmId.trim())}
                    className="h-10 w-10 rounded-full p-0 flex items-center justify-center"
                  >
                    {firmValidation.isValidating ? (
                      <Loading03Icon className="w-4 h-4 animate-spin" />
                    ) : firmValidation.isValid ? (
                      <CheckmarkCircle01Icon className="w-4 h-4 text-green-600" />
                    ) : firmValidation.error ? (
                      <Cancel01Icon className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckmarkCircle01Icon className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {/* Removed error alert - validation shown via icon only */}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  required
                  className="h-10 rounded-full px-4"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={
                  isLoading || 
                  (signUpData.role !== 'Admin' && !firmValidation.isValid) || 
                  (signUpData.role === 'Admin' && signUpData.firmId.trim() && !firmValidation.isValid)
                } 
                className="w-full rounded-full"
              >
                {isLoading ? (
                  <>
                    <Loading03Icon className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
              
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setCurrentMode('signin')}
                  className="text-sm text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      <ForgotPasswordDialog 
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
};

export default SimpleAuth;
