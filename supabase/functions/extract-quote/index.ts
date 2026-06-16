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

    // Le prompt demande maintenant aussi une proposition de service par ligne
    // et le type de prestation (particulier / pro / traiteur), pour pré-remplir
    // directement le dispatch dans l'app plutôt que de juste renvoyer du texte brut.
    const systemPrompt = `Tu es un assistant d'extraction de devis IsaFact pour La Ferme du Louvier (élevage de porcs et poulets en plein air, vente de charcuterie, traiteur, boutique).

Tu reçois un PDF de devis et tu retournes UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) avec cette structure exacte :
{
  "client": { "nom": string, "adresse": string|null, "email": string|null, "telephone": string|null },
  "numero_devis": string|null,
  "date_devis": string|null,
  "date_prestation": string|null,
  "heure_livraison": string|null,
  "nb_personnes": number|null,
  "customer_type": "particulier" | "pro" | "traiteur",
  "lignes": [
    {
      "description": string,
      "quantite": number,
      "unite": string|null,
      "prix_unitaire_ttc": number,
      "total_ttc": number,
      "service_suggere": "cuisine" | "charcuterie" | "commande" | "boutique"
    }
  ],
  "total_ht": number|null,
  "total_ttc": number|null,
  "tva": number|null,
  "notes": string|null
}

Règles pour "customer_type" :
- "traiteur" si le devis mentionne une prestation traiteur, un nombre de personnes/adultes, un événement, une livraison à heure fixe.
- "pro" si le client est une entreprise, un revendeur, ou si le devis mentionne un tarif professionnel / une remise B2B.
- "particulier" sinon (vente directe boutique/marché).

Règles pour "service_suggere" par ligne (à partir de la désignation du produit) :
- "charcuterie" : tout produit de porc transformé (rôti, saucisson, jambon, terrine, pâté, rillettes, tomme, caussenard, fromages).
- "cuisine" : plats préparés, salades composées, plateaux, traiteur cuisiné (taboulé, lentilles, salade de pommes de terre, plats chauds).
- "boutique" : produits vendus en l'état pour la vente directe (jus de fruits, conserves, produits d'épicerie).
- "commande" : si aucune des catégories précédentes ne correspond clairement, ou produit générique/transversal.

Si une information manque, mets null. Les nombres doivent être des numbers, pas des strings.`;

    const body = {
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrais les données de ce devis IsaFact et propose un service par ligne.' },
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
