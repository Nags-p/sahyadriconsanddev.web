import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // THE FIX: Create an admin client that can write data regardless of who calls the function
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use the powerful service role key
    );
    
    const url = new URL(req.url);
    const campaign_id = url.searchParams.get('cid');
    const recipient_email = url.searchParams.get('email');

    if (campaign_id && recipient_email) {
        // Use the admin client to insert the data
        await supabaseAdmin.from('email_opens').insert({ campaign_id, recipient_email });
    }
    
    // Return the 1x1 transparent pixel
    const pixel = new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]);
    return new Response(pixel, { headers: { ...corsHeaders, 'Content-Type': 'image/gif' } });

  } catch (error) {
    // Return a pixel even on error to prevent broken images in emails
    const pixel = new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]);
    return new Response(pixel, { headers: { ...corsHeaders, 'Content-Type': 'image/gif' } });
  }
})