import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const actionSchema = z.enum(['check', 'create', 'validate']);

const createUserSchema = z.object({
  action: z.enum(['create', 'validate']),
  email: z.string().trim().email("Invalid email format").max(255, "Email too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Name contains invalid characters"),
  companyCode: z.string()
    .min(6, "Company code must be at least 6 characters")
    .max(50, "Company code too long"),
  serviceId: z.string().uuid("Invalid service ID")
});

const checkSchema = z.object({
  action: z.literal('check')
});

const genericError = "Unable to process request. Please try again.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate action first
    const actionResult = actionSchema.safeParse(body.action);
    if (!actionResult.success) {
      console.error("Invalid action:", actionResult.error);
      return new Response(
        JSON.stringify({ error: genericError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const action = actionResult.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "check") {
      // Validate check schema
      const checkResult = checkSchema.safeParse(body);
      if (!checkResult.success) {
        console.error("Check validation failed:", checkResult.error);
        return new Response(
          JSON.stringify({ error: genericError }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
      // Validate create schema
      const createResult = createUserSchema.safeParse(body);
      if (!createResult.success) {
        console.error("Create validation failed:", createResult.error);
        return new Response(
          JSON.stringify({ error: genericError }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { email, password, fullName, companyCode, serviceId } = createResult.data;
      
      // Hash the company code
      const hash = createHash("sha256");
      hash.update(companyCode);
      const codeHash = hash.digest("hex");
      
      // Check if code already exists
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1);

      if (existing && existing.length > 0) {
        console.error("Company code already exists");
        return new Response(
          JSON.stringify({ error: genericError }),
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
        // Handle specific error cases
        if (authError.code === "email_exists" || authError.message?.includes("already been registered")) {
          return new Response(
            JSON.stringify({ error: "Un compte avec cet email existe déjà. Veuillez vous connecter." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: genericError }),
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

      // Update profile with service (profile is created by trigger)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          service_id: serviceId
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
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
      // Validate schema
      const validateResult = createUserSchema.safeParse(body);
      if (!validateResult.success) {
        console.error("Validate validation failed:", validateResult.error);
        return new Response(
          JSON.stringify({ error: genericError }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { email, password, fullName, companyCode, serviceId } = validateResult.data;
      
      // Hash the company code
      const hash = createHash("sha256");
      hash.update(companyCode);
      const codeHash = hash.digest("hex");
      
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
          // Handle specific error cases
          if (authError.code === "email_exists" || authError.message?.includes("already been registered")) {
            return new Response(
              JSON.stringify({ error: "Un compte avec cet email existe déjà. Veuillez vous connecter." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: genericError }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profile with service (profile is created by trigger)
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            service_id: serviceId
          })
          .eq("id", authData.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw profileError;
        }

        // Assign default "service" role to new users
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "service" });

        if (roleError) {
          console.error("Error assigning role:", roleError);
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
      JSON.stringify({ error: genericError }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in validate-company-code:", error);
    return new Response(
      JSON.stringify({ error: genericError }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
