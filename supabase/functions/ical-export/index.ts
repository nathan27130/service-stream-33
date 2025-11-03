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
    const url = new URL(req.url);
    const serviceId = url.searchParams.get("service");

    if (!serviceId) {
      return new Response("Service ID required", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch orders for the service
    const { data: orders, error } = await supabase
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
