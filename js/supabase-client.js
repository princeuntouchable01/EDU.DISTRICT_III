/* =========================================
   EDU. DISTRICT III - Supabase client
   Only the PUBLISHABLE key belongs here.
   NEVER put the service_role / secret key in any file served to browsers.
   Row Level Security in the database is what protects the data.
   ========================================= */
(function () {
  "use strict";

  var SUPABASE_URL = "https://iqxznslksfljaachwdde.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZttZbPVtdYPf_Br5UxUK3g_pZ3kNrId";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase library failed to load.");
    return;
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
