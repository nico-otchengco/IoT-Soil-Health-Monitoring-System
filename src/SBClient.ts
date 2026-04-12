import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SB_URL as string;
const key = import.meta.env.VITE_SB_ANON_KEY as string;

export const sb = createClient(url, key, {
  auth: {
    persistSession: true,
    storageKey: 'smartsoil',
    storage: window.localStorage,
    autoRefreshToken: true,
  }
});