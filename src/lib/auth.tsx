import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profile } from './database.types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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

  useEffect(() => {
    let mounted = true;

    // Initial session load — await profile fetch so `loading` accurately
    // reflects that we know both user AND profile state before flipping false.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        // On SIGNED_IN for the same user (e.g. lock screen re-auth),
        // don't null-flash the profile — just refresh it in the background.
        // For a different user or initial sign-in, fetch fresh.
        await fetchProfile(s.user.id);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
      // Don't setProfile(null) for TOKEN_REFRESHED or other events
      // where user is temporarily null but session is being restored.
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    // The handle_new_user trigger auto-creates the profile row. We just
    // update the metadata to match what the user typed (trigger uses
    // raw_user_meta_data which Supabase populates from `options.data`).
    if (data.user) {
      // Best-effort update: if the trigger already ran, UPDATE the row;
      // if RLS blocks the update, we continue silently — the OTP flow
      // is the actual gate before any portal access.
      await (supabase.from('profiles').update as any)({
        full_name: meta.full_name,
        company_name: meta.company_name,
      }).eq('id', data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    // 1. Tenter un signOut global (revoque le refresh token cote serveur)
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      // Si le serveur est injoignable ou le token deja expire,
      // on force au moins le nettoyage local (supprime la session du localStorage).
      console.warn("[auth] global signOut failed, forcing local cleanup", error.message);
      await supabase.auth.signOut({ scope: 'local' });
    }
    // 2. Clear le state React
    setUser(null);
    setSession(null);
    setProfile(null);
    // 3. Hard redirect pour eviter qu'un autre tab/composant mette en cache
    // l'ancien etat auth (cookie partage *.atlas-studio.org).
    if (typeof window !== "undefined") {
      window.location.assign("/portal/login");
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, isSuperAdmin, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
