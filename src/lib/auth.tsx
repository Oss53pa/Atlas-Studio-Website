import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profile } from './database.types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, meta: { full_name: string; company_name: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    const p = (data as Profile | null);
    setProfile(p);
    return p;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Auto-create a missing profile (orphan auth user → create row)
  const ensureProfile = async (u: User): Promise<Profile | null> => {
    const existing = await fetchProfile(u.id);
    if (existing) return existing;
    // No profile — create one from user metadata
    const meta = (u.user_metadata || {}) as { full_name?: string; company_name?: string };
    const { data: created } = await supabase.from('profiles').insert({
      id: u.id,
      email: u.email || '',
      full_name: meta.full_name || '',
      company_name: meta.company_name || '',
      role: 'client',
      is_active: true,
    }).select().single();
    const p = (created as Profile | null);
    setProfile(p);
    return p;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) ensureProfile(s.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        ensureProfile(s.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, meta: { full_name: string; company_name: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) return { error: error.message };
    // Explicitly create profile row (don't rely on triggers)
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: meta.full_name,
        company_name: meta.company_name,
        role: 'client',
        is_active: true,
      });
      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { error: `Compte créé mais profil manquant: ${profileError.message}` };
      }
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
