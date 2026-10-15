/**
 * Gemini AI Smart Assistant for Instagram comments & DMs.
 * Generates contextual, persona-aligned replies when no static keyword matches.
 */

interface ProductContext {
  name: string;
  price: number | null;
  currency?: string;
  url: string | null;
}

interface GenerateAiReplyParams {
  commentText: string;
  commenterUsername?: string;
  personaPrompt?: string;
  products?: ProductContext[];
  apiKey?: string;
}

export async function generateSmartAiReply(params: GenerateAiReplyParams): Promise<string | null> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const persona =
    params.personaPrompt ||
    "Friendly, helpful brand assistant for an Instagram store. Warm, enthusiastic, concise.";

  let catalogContext = "";
  if (params.products && params.products.length > 0) {
    catalogContext = `Store Products: ${params.products
      .map(
        (p) =>
          `${p.name}${p.price ? ` (${p.currency === "INR" ? "₹" : "$"}${p.price})` : ""}${
            p.url ? ` - link: ${p.url}` : ""
          }`
      )
      .join("; ")}`;
  }

  const systemInstruction = `You are an automated Instagram DM/Comment reply assistant.
Persona: ${persona}
${catalogContext}

Rules:
1. Keep the reply short (maximum 1-2 friendly sentences, under 180 characters).
2. Sound natural, warm, and authentic like a creator talking to a follower. Use 1-2 subtle emojis.
3. If they ask about price or link, reference the product information if available.
4. Never make up shipping policies or return guarantees. Tell them you'll check with the team if unsure.`;

  const userPrompt = `A follower (@${params.commenterUsername || "customer"}) commented: "${params.commentText}".
Generate the best direct public comment reply or DM message for them.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[Gemini AI] API responded with HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate && typeof candidate === "string") {
      return candidate.trim();
    }
    return null;
  } catch (err: any) {
    console.warn("[Gemini AI] Error generating smart reply:", err?.message || err);
    return null;
  }
}
