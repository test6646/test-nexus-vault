
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFirmState } from '@/hooks/useFirmState';
import { handleError } from '@/lib/error-handler';

// Cleanup auth state utility
const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove firm selection data
  localStorage.removeItem('selectedFirmId');
  
  // Remove from sessionStorage if used
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

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

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number?: string;
  role: 'Admin' | 'Staff' | 'Other' | 'Photographer' | 'Videographer' | 'Editor' | 'Cinematographer' | 'Drone Pilot';
  firm_id?: string;
  created_at: string;
  updated_at: string;
}

interface FirmData {
  id: string;
  name: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  loading: boolean;
  isTransitioning: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<ProfileData | null>;
  currentFirmId: string | null;
  currentFirm: FirmData | null;
  firms: FirmData[];
  isEmailVerified: boolean;
  updateCurrentFirm: (firmId: string | null) => void;
  loadFirms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  profile: null,
  loading: true,
  isTransitioning: false,
  signOut: async () => {},
  refreshProfile: async () => null,
  currentFirmId: null,
  currentFirm: null,
  firms: [],
  isEmailVerified: false,
  updateCurrentFirm: () => {},
  loadFirms: async () => {}
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toast } = useToast();
  
  const { 
    currentFirmId, 
    currentFirm, 
    firms, 
    updateCurrentFirm, 
    loadFirms,
    loading: firmsLoading 
  } = useFirmState(user?.id);

  const refreshProfile = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
      throw error;
      }
      
      setProfile(data);
      return data;
    } catch (error) {
      handleError(error, 'Refreshing profile');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setIsTransitioning(true);
      cleanupAuthState();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Sign out error:', error);
      cleanupAuthState();
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
      setIsTransitioning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let profileLoadPromise: Promise<ProfileData | null> | null = null;
    let initializationStarted = false;

    const initializeAuth = async () => {
      if (initializationStarted) return;
      initializationStarted = true;

      try {
        // Get existing session WITHOUT cleaning it first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('Session initialization error:', error);
          // Clear all auth state on error and redirect to auth
          cleanupAuthState();
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsEmailVerified(false);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setIsEmailVerified(session.user.email_confirmed_at !== null);
            
            // Load profile with proper error handling
            if (!profileLoadPromise) {
              profileLoadPromise = refreshProfile(session.user.id);
              profileLoadPromise.then((profileData) => {
                if (mounted && profileData && (profileData as any)?.firm_id) {
                  // Sync staff to Google Sheets when profile is loaded
                  if (session?.user) {
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
        // Auth initialization failed
        // Clear all auth state on critical error
        cleanupAuthState();
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsEmailVerified(false);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (!mounted) return;

        // Handle sign out - clean state only, let Index.tsx handle navigation
        if (event === 'SIGNED_OUT') {
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsEmailVerified(false);
          setIsTransitioning(false);
          setLoading(false);
          return;
        }
        
        // Handle token refresh failures - clean state only, let Index.tsx handle navigation
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed, clearing corrupted auth state');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsEmailVerified(false);
          setLoading(false);
          return;
        }

        // Update auth state immediately without delays
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsEmailVerified(session.user.email_confirmed_at !== null);
          setIsTransitioning(false);
          
          // Load profile for new users or sign in
          if (!profile || profile.user_id !== session.user.id || event === 'SIGNED_IN') {
            refreshProfile(session.user.id).then((profileData) => {
              if (mounted && profileData && (profileData as any)?.firm_id) {
                syncStaffToGoogleSheets(session.user.id);
              }
            }).catch(error => {
              console.error('Profile loading error:', error);
              if (mounted) setProfile(null);
            });
          }
          setLoading(false);
        } else {
          setProfile(null);
          setIsEmailVerified(false);
          setIsTransitioning(false);
          setLoading(false);
        }
      }
    );

    // Initialize auth state AFTER setting up listener
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Keep empty dependencies to prevent infinite loops

  

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading: loading || firmsLoading || isTransitioning, 
      isTransitioning,
      signOut, 
      refreshProfile,
      currentFirmId,
      currentFirm,
      firms,
      isEmailVerified,
      updateCurrentFirm,
      loadFirms
    }}>
      {children}
    </AuthContext.Provider>
  );
};
