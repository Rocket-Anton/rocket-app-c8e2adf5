import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();
    
    console.log('Processing invitation for:', email, name);
    
    // Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate magic link for user invitation
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (error) {
      console.error('Error generating magic link:', error);
      throw error;
    }

    console.log('Magic link generated successfully');

    // Send invitation email via Resend
    const emailResponse = await resend.emails.send({
      from: 'Rocket System <onboarding@resend.dev>',
      to: [email],
      subject: 'Willkommen im Rocket Team!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">Willkommen im Team!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hallo ${name || 'dort'},
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Du wurdest zum Rocket System eingeladen. Klicke auf den untenstehenden Link, um dich anzumelden:
          </p>
          <div style="margin: 30px 0;">
            <a href="${data.properties.action_link}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Jetzt anmelden
            </a>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Dieser Link ist 24 Stunden gültig.
          </p>
          <p style="color: #999; font-size: 14px;">
            Falls du diese E-Mail nicht erwartet hast, kannst du sie einfach ignorieren.
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        emailId: emailResponse.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-invitation-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});