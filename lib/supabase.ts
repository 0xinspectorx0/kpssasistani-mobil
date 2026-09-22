import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Admin sessions deliberately live in memory only. No passwords/tokens in AsyncStorage.
// Reopening/reloading the application requires signing in again.
export const supabase =
  url && key && /^https:\/\//.test(url)
    ? createClient(url, key, {
        global: {
          fetch: async (input, init) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const relayAbort = () => controller.abort();
            if (init?.signal?.aborted) controller.abort();
            init?.signal?.addEventListener('abort', relayAbort);
            try {
              return await fetch(input, { ...init, signal: controller.signal });
            } finally {
              clearTimeout(timeout);
              init?.signal?.removeEventListener('abort', relayAbort);
            }
          },
        },
        auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock },
      })
    : null;
export function requireBackend() {
  if (!supabase)
    throw new Error(
      'Supabase bağlantısı yapılandırılmamış. docs/ADMIN.md dosyasındaki kurulum adımlarını uygulayın.',
    );
  return supabase;
}
