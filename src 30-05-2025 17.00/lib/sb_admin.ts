// lib/sb_admin.ts
import { createClient } from '@supabase/supabase-js';

// Detect if we're running on the client side
const isBrowser = typeof window !== 'undefined';

// Create a dummy client for client-side
const createDummyClient = () => {
  return {
    from: () => ({
      select: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
      insert: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
      update: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
      delete: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
      order: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
      eq: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
    }),
    storage: {
      from: () => ({
        upload: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
        remove: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
        download: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
        createSignedUrl: () => ({ data: { signedUrl: '' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    auth: {
      getUser: () => ({ data: { user: null }, error: new Error('Admin operations not available in browser') }),
    },
    rpc: () => ({ data: null, error: new Error('Admin operations not available in browser') }),
  };
};

// Create the admin client only on the server side
let supabaseAdmin;

if (!isBrowser) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
 
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } else {
    console.warn('Supabase admin environment variables are missing');
    supabaseAdmin = createDummyClient();
  }
} else {
  // On the client, use a dummy client
  supabaseAdmin = createDummyClient();
}

export { supabaseAdmin };