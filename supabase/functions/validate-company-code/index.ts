import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, companyCode, email, password, fullName } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the company code
    const hash = createHash("sha256");
    hash.update(companyCode);
    const codeHash = hash.digest("hex");

    if (action === "check") {
      // Check if a company code exists
      const { data, error } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1);

      if (error) {
        console.error("Error checking company code:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ exists: data && data.length > 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      // Check if code already exists
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: "Un code d'entreprise existe déjà" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) {
        console.error("Error creating user:", authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store the company code hash
      const { error: settingsError } = await supabase
        .from("company_settings")
        .insert({ 
          company_code_hash: codeHash,
          created_by: authData.user.id 
        });

      if (settingsError) {
        console.error("Error storing company code:", settingsError);
        // Delete the user if we can't store the code
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw settingsError;
      }

      // Assign admin role to first user
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", authData.user.id);

      if (!roleError) {
        await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "admin" });
      }

      return new Response(
        JSON.stringify({ success: true, userId: authData.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "validate") {
      // Validate the company code
      const { data, error } = await supabase
        .from("company_settings")
        .select("company_code_hash")
        .limit(1)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isValid = data.company_code_hash === codeHash;

      if (isValid) {
        // Create the user account
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        });

        if (authError) {
          console.error("Error creating user:", authError);
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ valid: true, userId: authData.user.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Action invalide" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in validate-company-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
