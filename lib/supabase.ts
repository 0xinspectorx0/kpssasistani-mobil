import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Kullanıcı hesapları için oturum AsyncStorage'da saklanır (kalıcı giriş).
// Erişim güvenliği hâlâ sunucu tarafındaki RLS politikalarıyla sağlanır:
// istemci yalnızca kendi rolünün izin verdiği kayıtlara erişebilir.
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
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;

export function requireBackend() {
  if (!supabase)
    throw new Error(
      'Supabase bağlantısı yapılandırılmamış. docs/ADMIN.md dosyasındaki kurulum adımlarını uygulayın.',
    );
  return supabase;
}
