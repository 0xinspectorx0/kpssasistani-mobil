// SUPABASE SERVICE ROLE GEREKTIRIR — yalnızca sunucuda çalışır (Edge Function).
// Kurulum: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>
//          supabase functions deploy delete-user --no-verify-jwt
// Endpoint: /functions/v1/delete-user
//
// KULLANIM: Yönetici paneli bu fonksiyonu çağırmadan önce kullanıcının yetkisini
// 'resolve_user_id' RPC'si ile doğrular. Fonksiyon kendi içinde de token'daki
// kullanıcının admin olduğunu doğrular (anon key jwt + RPC via POST).

declare const Deno: any;

interface DeleteRequest {
  target_email?: string;
  target_id?: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Yalnızca POST desteklenir.' }),
      { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const apikey = req.headers.get('apikey') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!serviceKey) {
    return new Response(
      JSON.stringify({ error: 'SERVICE_ROLE_KEY tanımlanmamış.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  let body: DeleteRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Geçersiz JSON.' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  const callerToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!callerToken) {
    return new Response(
      JSON.stringify({ error: 'Kimlik doğrulaması yok.' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Çağıranın admin olduğunu doğrula (anon anahtarla auth)
  const callerJwt = callerToken.split('.')[1];
  let caller: { sub?: string; role?: string } = {};
  try {
    caller = JSON.parse(atob(callerJwt.replace(/-/g, '+').replace(/_/g, '/'))) || {};
  } catch {
    return new Response(
      JSON.stringify({ error: 'Geçersiz token.' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  const url = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
  const adminReq = await fetch(`${url}/rest/v1/rpc/resolve_user_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey,
      Authorization: `Bearer ${callerToken}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ target_email: body.target_email ?? '' }),
  });

  let targetId = body.target_id ?? '';
  let resolvedError: string | null = null;
  try {
    const resolvedResp = await adminReq.json();
    targetId = targetId || resolvedResp;
    if (!adminReq.ok) resolvedError = resolvedResp?.message ?? String(adminReq.status);
  } catch {
    resolvedError = 'Yanıt okunamadı.';
  }

  if (resolvedError) {
    return new Response(
      JSON.stringify({ error: resolvedError }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  if (!targetId) {
    return new Response(
      JSON.stringify({ error: 'Hedef kullanıcı bulunamadı veya admin yetkiniz yok.' }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // Service role ile kullanıcıyı sil
  const deleteReq = await fetch(`${url}/auth/v1/admin/users/${targetId}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (deleteReq.status === 200 || deleteReq.status === 204) {
    return new Response(
      JSON.stringify({ ok: true, message: 'Kullanıcı silindi.' }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ error: 'Kullanıcı silinemedi (' + deleteReq.status + ').' }),
    { status: deleteReq.status, headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
