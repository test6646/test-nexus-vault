
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFirmState } from '@/hooks/useFirmState';
import { handleError } from '@/lib/error-handler';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import { displayRole } from '@/lib/role-utils';

// Cleanup auth state utility
const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove firm selection data
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('selectedFirmId')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if used
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

// Prevent duplicate sync calls across lifecycle events
const staffSyncCache = new Set<string>();
const staffSyncInFlight = new Set<string>();
const SYNC_KEY_PREFIX = 'staff-synced-';
const hasStaffSynced = (id: string) =>
  staffSyncCache.has(id) || (typeof localStorage !== 'undefined' && localStorage.getItem(`${SYNC_KEY_PREFIX}${id}`) === '1');
const markStaffSynced = (id: string) => {
  staffSyncCache.add(id);
  try { localStorage.setItem(`${SYNC_KEY_PREFIX}${id}`, '1'); } catch {}
};

const syncStaffToGoogleSheets = async (userId: string) => {
  if (!userId) return;
  if (hasStaffSynced(userId) || staffSyncInFlight.has(userId)) return; // idempotent guard
  staffSyncInFlight.add(userId);
  try {
    const { data, error } = await supabase.functions.invoke('sync-staff-to-google-direct', {
      body: { userId }
    });
    if (error) {
      // If function says it already exists, mark as synced to avoid future calls
      const msg = (error as any)?.message || '';
      if (msg.toLowerCase().includes('already')) markStaffSynced(userId);
      handleError(error, 'Staff Google Sheets sync');
      return;
    }
    // Success
    markStaffSynced(userId);
  } catch (error: any) {
    const msg = error?.message || '';
    if (msg.toLowerCase().includes('already')) markStaffSynced(userId);
    handleError(error, 'Staff Google Sheets sync');
  } finally {
    staffSyncInFlight.delete(userId);
  }
};

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number?: string;
  role: 'Admin' | 'Staff' | 'Other' | 'Photographer' | 'Cinematographer' | 'Editor' | 'Drone Pilot';
  firm_id?: string;
  created_at: string;
  updated_at: string;
}

interface FirmData {
  id: string;
  name: string;
  logo_url?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  spreadsheet_id?: string;
  calendar_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  loading: boolean;
  authReady: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<ProfileData | null>;
  currentFirmId: string | null;
  currentFirm: FirmData | null;
  firms: FirmData[];
  isEmailVerified: boolean;
  updateCurrentFirm: (firmId: string | null) => void;
  loadFirms: () => Promise<void>;
  firmsLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  profile: null,
  loading: true,
  authReady: false,
  signOut: async () => {},
  refreshProfile: async () => null,
  currentFirmId: null,
  currentFirm: null,
  firms: [],
  isEmailVerified: false,
  updateCurrentFirm: () => {},
  loadFirms: async () => {},
  firmsLoading: false
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
  const [authReady, setAuthReady] = useState(false);
  const { toast } = useToast();
  
  const { 
    currentFirmId, 
    currentFirm, 
    firms, 
    updateCurrentFirm, 
    loadFirms,
    loading: firmsLoading 
  } = useFirmState(user?.id);

  // Initialize Google Sheets sync listeners
  useGoogleSheetsSync();

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
      
      // Transform the role to ensure consistency (convert Videographer to Cinematographer)
      const transformedData = data ? {
        ...data,
        role: displayRole(data.role) as ProfileData['role']
      } : null;
      
      setProfile(transformedData);
      return transformedData;
    } catch (error) {
      handleError(error, 'Refreshing profile');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setAuthReady(false);
      cleanupAuthState();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      // Sign out error - cleanup auth state
      cleanupAuthState();
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
      setAuthReady(false);
      setLoading(false);
    }
  };

  // Centralized auth state completion checker
  const completeAuthStateUpdate = (newUser: User | null, newProfile: ProfileData | null) => {
    const profileResolved = (!newUser) || newProfile !== undefined;
    
    // Only consider firms resolved when useFirmState has finished loading AND
    // either there's no user or firm state is properly initialized
    const firmResolved = (!newUser) || (!firmsLoading);

    const isComplete = profileResolved && firmResolved;
    
    // Prevent flickering by ensuring consistent state updates
    if (isComplete && (!authReady || loading)) {
      // Immediate state update - remove setTimeout to prevent flickering
      setLoading(false);
      setAuthReady(true);
    } else if (!isComplete && (authReady || !loading)) {
      setLoading(true);
      setAuthReady(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initializationStarted = false;

    const initializeAuth = async () => {
      if (initializationStarted) return;
      initializationStarted = true;

      try {
        // Get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          // No session or error
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsEmailVerified(false);
            completeAuthStateUpdate(null, null);
          }
          return;
        }
        
        if (mounted) {
          setSession(session);
          setUser(session.user);
          setIsEmailVerified(session.user.email_confirmed_at !== null);
          
          // Load profile
          try {
            const profileData = await refreshProfile(session.user.id);
            if (mounted) {
              if (profileData && (profileData as any)?.firm_id) {
                syncStaffToGoogleSheets(session.user.id);
              }
              completeAuthStateUpdate(session.user, profileData);
            }
          } catch (error) {
            handleError(error, 'Profile loading');
            if (mounted) {
              setProfile(null);
              completeAuthStateUpdate(session.user, null);
            }
          }
        }
      } catch (error) {
        // Auth initialization failed
        cleanupAuthState();
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsEmailVerified(false);
          completeAuthStateUpdate(null, null);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Batch all state updates to prevent flickering
        const updateStates = () => {
          // Handle sign out
          if (event === 'SIGNED_OUT') {
            cleanupAuthState();
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsEmailVerified(false);
            completeAuthStateUpdate(null, null);
            return;
          }
          
          // Handle token refresh failures
          if (event === 'TOKEN_REFRESHED' && !session) {
            cleanupAuthState();
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsEmailVerified(false);
            completeAuthStateUpdate(null, null);
            return;
          }

          // Update session and user state
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setIsEmailVerified(session.user.email_confirmed_at !== null);
            
            // Load profile if user changed or signed in
            if (!profile || profile.user_id !== session.user.id || event === 'SIGNED_IN') {
              // Don't update loading state here - let completeAuthStateUpdate handle it
              refreshProfile(session.user.id).then((profileData) => {
                if (mounted) {
                  if (profileData && (profileData as any)?.firm_id) {
                    syncStaffToGoogleSheets(session.user.id);
                  }
                  completeAuthStateUpdate(session.user, profileData);
                }
              }).catch(error => {
                handleError(error, 'Profile loading during auth change');
                if (mounted) {
                  setProfile(null);
                  completeAuthStateUpdate(session.user, null);
                }
              });
            } else {
              // Profile already loaded for this user
              completeAuthStateUpdate(session.user, profile);
            }
          } else {
            setProfile(null);
            setIsEmailVerified(false);
            completeAuthStateUpdate(null, null);
          }
        };

        // Execute updates immediately to prevent flickering
        updateStates();
      }
    );

    // Initialize auth state AFTER setting up listener
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Keep empty dependencies to prevent infinite loops

  // Re-evaluate readiness when critical states change
  useEffect(() => {
    // Immediate update without timeout to prevent flickering
    completeAuthStateUpdate(user, profile);
  }, [firmsLoading, user, profile]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      authReady,
      signOut, 
      refreshProfile,
      currentFirmId,
      currentFirm,
      firms,
      isEmailVerified,
      updateCurrentFirm,
      loadFirms,
      firmsLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
