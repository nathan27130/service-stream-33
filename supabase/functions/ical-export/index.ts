import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("iCal export attempt without authentication");
      return new Response("Authentication required", {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const url = new URL(req.url);
    const serviceId = url.searchParams.get("service");

    if (!serviceId) {
      return new Response("Invalid request", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Validate UUID format to prevent enumeration attacks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(serviceId)) {
      console.warn(`Invalid UUID format attempted: ${serviceId.substring(0, 8)}...`);
      return new Response("Invalid request", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Initialize Supabase client with user's JWT token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn("Invalid authentication token for iCal export");
      return new Response("Invalid authentication", {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Check user's role and service access
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    const isReadonly = roles?.some(r => r.role === "readonly");

    // If not admin or readonly, verify user has access to this specific service
    if (!isAdmin && !isReadonly) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("service_id")
        .eq("id", user.id)
        .single();

      if (profile?.service_id !== serviceId) {
        console.warn(`User ${user.id} attempted to access service ${serviceId} without permission`);
        return new Response("Access denied to this service", {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }

    // Use service role key only for fetching data after authentication
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch orders for the service using service role key
    const { data: orders, error } = await supabaseService
      .from("orders")
      .select(`
        id,
        due_at,
        type,
        notes,
        customers(name),
        services(name, color),
        order_items(product_name, quantity, unit)
      `)
      .eq("service_id", serviceId)
      .gte("due_at", new Date().toISOString())
      .order("due_at");

    if (error) throw error;

    // Generate iCal content
    const icalContent = generateICal(orders || [], serviceId);

    return new Response(icalContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="calendar-${serviceId}.ics"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating iCal:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateICal(orders: any[], serviceId: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const serviceName = orders[0]?.services?.name || "Service";

  let ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Commandes Services//Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Commandes ${serviceName}`,
    "X-WR-TIMEZONE:Europe/Paris",
    `X-WR-CALDESC:Calendrier des commandes pour le service`,
  ];

  for (const order of orders) {
    const dueAt = new Date(order.due_at);
    const dueAtStr = dueAt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    // Create event end time (30 min after due time)
    const endAt = new Date(dueAt.getTime() + 30 * 60 * 1000);
    const endAtStr = endAt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const customerName = order.customers?.name || "Client non spécifié";
    const orderServiceName = order.services?.name || "Service";
    
    // Build items summary
    const itemsSummary = order.order_items
      ?.map((item: any) => `${item.quantity} ${item.unit} ${item.product_name}`)
      .join(", ") || "Aucun article";

    const summary = `${customerName} - ${order.type}`;
    const description = `Service: ${orderServiceName}\\nArticles: ${itemsSummary}${
      order.notes ? `\\n\\nNotes: ${order.notes.replace(/\n/g, "\\n")}` : ""
    }`;

    ical.push(
      "BEGIN:VEVENT",
      `UID:order-${order.id}@commandes-services.app`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${dueAtStr}`,
      `DTEND:${endAtStr}`,
      `SUMMARY:${escapeICalText(summary)}`,
      `DESCRIPTION:${escapeICalText(description)}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:0`,
      "END:VEVENT"
    );
  }

  ical.push("END:VCALENDAR");

  return ical.join("\r\n");
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
