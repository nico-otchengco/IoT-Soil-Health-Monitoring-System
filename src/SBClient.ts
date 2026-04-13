import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SB_URL as string;
const key = import.meta.env.VITE_SB_ANON_KEY as string;

export const sb = createClient(url, key, {
  auth: {
    persistSession: true,
    storageKey: 'smartsoil',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

sb.auth.onAuthStateChange((event) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed successfully');
  }

  if (event === 'SIGNED_OUT') {
    window.localStorage.removeItem('smartsoil');
    window.location.href = '/login';
  }
});