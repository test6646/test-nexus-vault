import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading02Icon, AlertCircleIcon, CheckmarkCircle01Icon, Building06Icon, EyeIcon, ViewOffIcon, Mail01Icon, LockIcon, UserIcon, AiPhone01Icon } from 'hugeicons-react';
import AdminPinVerification from '@/components/auth/AdminPinVerification';
import { useAuth } from '@/components/auth/AuthProvider';


interface Firm {
  id: string;
  name: string;
}

const SimpleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const [adminPinVerified, setAdminPinVerified] = useState(false);

  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    mobileNumber: '',
    role: 'Admin' as const,
    firmId: '',
    adminPin: ''
  });

  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Only redirect authenticated users with confirmed emails
  useEffect(() => {
    if (!loading && user && user.email_confirmed_at) {
      navigate('/tasks', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (signUpData.role !== 'Admin') {
      loadFirms();
    }
  }, [signUpData.role]);

  // Reset admin PIN verification when role changes
  useEffect(() => {
    if (signUpData.role !== 'Admin') {
      setAdminPinVerified(false);
      setSignUpData(prev => ({ ...prev, adminPin: '' }));
    }
  }, [signUpData.role]);

  const handleAdminPinChange = (pin: string) => {
    setSignUpData(prev => ({ ...prev, adminPin: pin }));
  };

  const loadFirms = async () => {
    setLoadingFirms(true);
    try {
      const { data, error } = await supabase
        .from('firms')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setFirms(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading firms",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingFirms(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate firm selection for non-admin users
    if (signUpData.role !== 'Admin' && !signUpData.firmId) {
      toast({
        title: "Firm selection required",
        description: "Please select a firm to join",
        variant: "destructive",
      });
      return;
    }

    // Validate admin PIN for admin users
    if (signUpData.role === 'Admin' && !adminPinVerified) {
      toast({
        title: "Admin PIN not verified",
        description: "Please enter and verify your admin PIN first.",
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
              firm_id: signUpData.role !== 'Admin' ? signUpData.firmId : null
            }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Account creation failed');

      // Store firm membership info in user metadata for later processing
      // The firm membership will be created when email is confirmed and profile is created

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      // Clear form
      setSignUpData({ 
        fullName: '', 
        email: '', 
        password: '', 
        mobileNumber: '', 
        role: 'Admin',
        firmId: '',
        adminPin: ''
      });
      setAdminPinVerified(false);

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

      // Navigate immediately - the useEffect will handle the redirect
      navigate('/tasks', { replace: true });

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

  // Show loading if still checking auth state
  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center md:p-4 overflow-hidden">
      <Card className="w-full max-w-md mx-2 md:mx-0">
        <CardHeader className="text-center py-3">
          <CardTitle className="text-2xl font-bold">Prit Photo</CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-full mb-6 h-12">
              <TabsTrigger value="signin" className="rounded-full h-10 text-sm font-medium">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full h-10 text-sm font-medium">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3 mt-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                 <div className="space-y-2">
                   <Label htmlFor="signin-email" className="flex items-center gap-2">
                     <Mail01Icon className="w-4 h-4" />
                     Email
                   </Label>
                     <Input
                       id="signin-email"
                       type="email"
                       placeholder="Enter your email"
                       value={signInData.email}
                       onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                       required
                       className="pl-4 h-10"
                     />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="signin-password" className="flex items-center gap-2">
                     <LockIcon className="w-4 h-4" />
                     Password
                   </Label>
                     <Input
                       id="signin-password"
                       type="password"
                       placeholder="Enter your password"
                       value={signInData.password}
                       onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                       required
                       className="pl-4 h-10"
                     />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-10">
                    {isLoading ? (
                      <>
                        <Loading02Icon className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LockIcon className="w-4 h-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                  
               </form>
             </TabsContent>

             <TabsContent value="signup" className="space-y-3 mt-4">
               <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Full Name
                      </Label>
                       <Input
                         id="signup-name"
                         placeholder="Enter your full name"
                         value={signUpData.fullName}
                         onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                         required
                         className="pl-4 h-10"
                       />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-mobile" className="flex items-center gap-2">
                        <AiPhone01Icon className="w-4 h-4" />
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
                         className="pl-4 h-10"
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail01Icon className="w-4 h-4" />
                      Email
                    </Label>
                     <Input
                       id="signup-email"
                       type="email"
                       placeholder="Enter your email"
                       value={signUpData.email}
                       onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                       required
                       className="pl-4 h-10"
                     />
                  </div>
                 <div className={`grid gap-3 ${signUpData.role !== 'Admin' && signUpData.role ? 'grid-cols-2' : 'grid-cols-1'}`}>
                   <div className="space-y-2">
                     <Label htmlFor="signup-role">Role</Label>
                      <Select value={signUpData.role} onValueChange={(value: any) => setSignUpData({ ...signUpData, role: value, firmId: '', adminPin: '' })}>
                         <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Admin">
                           <div className="flex items-center gap-2">
                             <Building06Icon className="w-4 h-4" />
                             Admin (Firm Owner)
                           </div>
                         </SelectItem>
                         <SelectItem value="Photographer">Photographer</SelectItem>
                         <SelectItem value="Cinematographer">Cinematographer</SelectItem>
                         <SelectItem value="Editor">Editor</SelectItem>
                         <SelectItem value="Other">Other</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   
                   {signUpData.role !== 'Admin' && signUpData.role && (
                     <div className="space-y-2">
                       <Label htmlFor="signup-firm">Select Firm *</Label>
                       <Select value={signUpData.firmId} onValueChange={(value) => setSignUpData({ ...signUpData, firmId: value })}>
                         <SelectTrigger className="h-10">
                           <SelectValue placeholder={loadingFirms ? "Loading firms..." : "Select a firm to join"} />
                         </SelectTrigger>
                         <SelectContent>
                           {firms.map((firm) => (
                             <SelectItem key={firm.id} value={firm.id}>
                               {firm.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   )}
                 </div>
                 
                 {signUpData.role !== 'Admin' && signUpData.role && firms.length === 0 && !loadingFirms && (
                   <Alert>
                     <AlertCircleIcon className="h-4 w-4" />
                     <AlertDescription>
                       No firms are currently available. Please contact an admin to create a firm, 
                       or register as an Admin to create your own firm.
                     </AlertDescription>
                   </Alert>
                 )}

                 {signUpData.role === 'Admin' && (
                   <AdminPinVerification
                     adminPin={signUpData.adminPin}
                     onPinChange={handleAdminPinChange}
                     isVerified={adminPinVerified}
                     onVerificationChange={setAdminPinVerified}
                   />
                 )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <LockIcon className="w-4 h-4" />
                      Password
                    </Label>
                     <Input
                       id="signup-password"
                       type="password"
                       placeholder="Enter your password"
                       value={signUpData.password}
                       onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                       required
                       className="pl-4 h-10"
                     />
                 </div>
                 <Button type="submit" disabled={isLoading || (signUpData.role !== 'Admin' && firms.length === 0) || (signUpData.role === 'Admin' && !adminPinVerified)} className="w-full h-10">
                   {isLoading ? (
                     <>
                       <Loading02Icon className="w-4 h-4 mr-2 animate-spin" />
                       Creating Account...
                     </>
                   ) : (
                     <>
                       <UserIcon className="w-4 h-4 mr-2" />
                       Create Account
                     </>
                   )}
                 </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuth;
