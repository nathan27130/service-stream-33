import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { pdfBase64, filename } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'pdfBase64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es un assistant d'extraction de devis IsaFact. Tu reçois un PDF de devis et tu retournes UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) avec cette structure exacte :
{
  "client": { "nom": string, "adresse": string|null, "email": string|null, "telephone": string|null },
  "date_prestation": string|null,  // ISO YYYY-MM-DD si trouvable
  "numero_devis": string|null,
  "lignes": [
    { "description": string, "quantite": number, "prix_unitaire_ht": number, "total_ht": number, "unite": string|null }
  ],
  "total_ht": number|null,
  "total_ttc": number|null,
  "tva": number|null,
  "notes": string|null
}
Si une information manque, mets null. Les nombres doivent être des numbers, pas des strings.`;

    const body = {
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrais les données de ce devis IsaFact.' },
            {
              type: 'file',
              file: {
                filename: filename || 'devis.pdf',
                file_data: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Lovable-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('Gateway error', aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requêtes atteinte, réessaie plus tard.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits Lovable AI épuisés. Ajoute des crédits dans Settings → Workspace → Usage.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? '';
    let extracted;
    try {
      extracted = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      extracted = match ? JSON.parse(match[0]) : { error: 'parse_failed', raw };
    }

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
