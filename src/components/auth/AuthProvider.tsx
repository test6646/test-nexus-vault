
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { handleError } from '@/lib/error-handler';
import { clearAccessPinSession } from '@/components/auth/AccessPinVerification';

const syncStaffToGoogleSheets = async (userId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-staff-to-google-direct', {
      body: { userId }
    });
    
    if (error) {
      handleError(error, 'Staff Google Sheets sync');
    }
  } catch (error) {
    handleError(error, 'Staff Google Sheets sync');
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  currentFirmId: string | null;
  isEmailVerified: boolean;
  updateCurrentFirm: (firmId: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  currentFirmId: null,
  isEmailVerified: false,
  updateCurrentFirm: async () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const { toast } = useToast();
  
  const { loadProfile, updateCurrentFirm: updateFirm, profileLoading } = useProfile();

  const refreshProfile = async () => {
    if (!user?.id || profileLoading) return;
    
    try {
      const profileData = await loadProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      handleError(error, 'Refreshing profile');
    }
  };

  const updateCurrentFirm = async (firmId: string | null) => {
    if (!user?.id) return;

    try {
      const updatedProfile = await updateFirm(user.id, firmId);
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (error: any) {
      handleError(error, 'Updating current firm');
      toast({
        title: "Error updating firm",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Sign out from Supabase first
      await supabase.auth.signOut({ scope: 'global' });
      
      // State cleanup will be handled by onAuthStateChange
      // No manual state clearing needed here as it can cause conflicts
      
    } catch (error) {
      handleError(error, 'Sign out');
      // Force clear state on error
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let profileLoadPromise: Promise<any> | null = null;
    let initializationStarted = false;

    const initializeAuth = async () => {
      if (initializationStarted) return;
      initializationStarted = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (mounted) setLoading(false);
          return;
        }
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setIsEmailVerified(session.user.email_confirmed_at !== null);
            
            // Load profile with proper error handling
            if (!profileLoadPromise) {
              profileLoadPromise = loadProfile(session.user.id);
              profileLoadPromise.then(profileData => {
                if (mounted && profileData) {
                  setProfile(profileData);
                  
                  // Sync staff to Google Sheets when profile is loaded
                  if (session?.user && (profileData as any)?.firm_id) {
                    syncStaffToGoogleSheets(session.user.id);
                  }
                }
              }).catch(error => {
                handleError(error, 'Profile loading');
                // Don't fail auth if profile loading fails
                if (mounted) {
                  setProfile(null);
                }
              }).finally(() => {
                profileLoadPromise = null;
                if (mounted) setLoading(false);
              });
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        handleError(error, 'Auth initialization');
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Critical: Defer all async operations to prevent deadlocks
        setTimeout(() => {
          if (!mounted) return;
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setIsEmailVerified(session.user.email_confirmed_at !== null);
            
            // Only reload profile if it's a different user
            if (!profile || profile.user_id !== session.user.id) {
              loadProfile(session.user.id).then(profileData => {
                if (mounted && profileData) {
                  setProfile(profileData);
                  
                  // Sync staff to Google Sheets when profile is loaded
                  if (session?.user && (profileData as any)?.firm_id) {
                    syncStaffToGoogleSheets(session.user.id);
                  }
                }
              }).catch(error => {
                handleError(error, 'Profile loading in auth change');
                if (mounted) setProfile(null);
              }).finally(() => {
                if (mounted) setLoading(false);
              });
            } else {
              setLoading(false);
            }
          } else {
            setProfile(null);
            setIsEmailVerified(false);
            setLoading(false);
            // Clear localStorage and access PIN session on sign out
            if (event === 'SIGNED_OUT') {
              localStorage.clear();
              clearAccessPinSession();
            }
          }
        }, 0);
      }
    );

    // Initialize auth state AFTER setting up listener
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Keep empty dependencies to prevent infinite loops

  const currentFirmId = profile?.current_firm_id || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading: loading || profileLoading, 
      signOut, 
      refreshProfile,
      currentFirmId,
      isEmailVerified,
      updateCurrentFirm
    }}>
      {children}
    </AuthContext.Provider>
  );
};
