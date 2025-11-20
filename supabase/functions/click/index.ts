import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const url = new URL(req.url);
    const campaign_id = url.searchParams.get('cid');
    const recipient_email = url.searchParams.get('email');
    const redirect_url = url.searchParams.get('redirect');

    if (campaign_id && recipient_email && redirect_url) {
        await supabase.from('email_clicks').insert({ campaign_id, recipient_email, redirect_url });
    }
    
    // Redirect to the final destination URL
    if (redirect_url) {
        return Response.redirect(redirect_url, 302);
    } else {
        // Fallback if no redirect URL is provided
        return new Response('Link expired or invalid.', { headers: { ...corsHeaders } });
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})