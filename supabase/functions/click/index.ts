import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // THE FIX: Create an admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use the powerful service role key
    );

    const url = new URL(req.url);
    const campaign_id = url.searchParams.get('cid');
    const recipient_email = url.searchParams.get('email');
    const redirect_url = url.searchParams.get('redirect');

    if (campaign_id && recipient_email && redirect_url) {
        // Use the admin client to insert data
        await supabaseAdmin.from('email_clicks').insert({ campaign_id, recipient_email, redirect_url });
    }
    
    if (redirect_url) {
        return Response.redirect(redirect_url, 302);
    } else {
        return new Response('Link expired or invalid.', { headers: { ...corsHeaders } });
    }
    
  } catch (error) {
    // If there's an error, still try to redirect the user
    const url = new URL(req.url);
    const redirect_url = url.searchParams.get('redirect');
    if (redirect_url) {
        return Response.redirect(redirect_url, 302);
    }
    return new Response('An error occurred.', { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})