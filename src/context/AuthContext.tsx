import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type DatabaseProfile } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: DatabaseProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Fallback for session storage / local dev fallback
        const isSessionAdmin = sessionStorage.getItem('ssp-admin-auth') === 'true';
        setIsAdmin(isSessionAdmin);
        setProfile({
          id: userId,
          full_name: 'Admin User',
          email: email,
          is_admin: isSessionAdmin,
          created_at: new Date().toISOString()
        });
      } else if (data) {
        setProfile(data as DatabaseProfile);
        setIsAdmin(data.is_admin);
        if (data.is_admin) {
          sessionStorage.setItem('ssp-admin-auth', 'true');
        } else {
          sessionStorage.removeItem('ssp-admin-auth');
        }
      }
    } catch (err) {
      console.error('Catch profile error:', err);
    }
  };

  const checkSession = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email || '');
      } else {
        // Fallback check if user was manually authenticated in development
        const isSessionAdmin = sessionStorage.getItem('ssp-admin-auth') === 'true';
        if (isSessionAdmin) {
          setIsAdmin(true);
          setProfile({
            id: 'mock-admin-id',
            full_name: 'SS Pharmacy Admin',
            email: 'admin@sspharmacy.com',
            is_admin: true,
            created_at: new Date().toISOString()
          });
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          sessionStorage.removeItem('ssp-admin-auth');
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      sessionStorage.removeItem('ssp-admin-auth');
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    await checkSession();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
