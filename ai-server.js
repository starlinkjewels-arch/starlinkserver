const express = require("express");
const cors = require("cors");

const app = express();

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "sk_2t16g3mg_vGOQ02P32gztEJDrHpb7jmfO";
const SARVAM_MODEL = process.env.SARVAM_MODEL || "sarvam-105b";
const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai";
const PORT = process.env.AI_PORT || 5174;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["*"];

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS,
  })
);
app.use(express.json({ limit: "2mb" }));

if (!SARVAM_API_KEY) {
  console.error("Missing SARVAM_API_KEY environment variable.");
}

const buildPrompt = ({ topic, keywords, tone, length, brand }) => {
  const safeKeywords = keywords ? `Target keywords: ${keywords}.` : "";
  return `
You are an expert SEO copywriter for a luxury jewelry brand named ${brand}.
Write a high-quality blog post about: "${topic}".
Tone: ${tone}.
Length: ${length}.
${safeKeywords}

Requirements:
- Return JSON only.
- JSON fields: title, metaTitle, metaDescription, contentHtml.
- contentHtml must be clean semantic HTML with <h2>, <h3>, <p>, <ul><li>.
- Include an FAQ section with 3-4 Q&A items at the end.
- Avoid medical, financial, or legal advice claims.
`.trim();
};

const buildProductSeoPrompt = ({ name, category, description, price, brand }) => {
  return `
You are an expert SEO copywriter for a luxury jewelry brand named ${brand}.
Generate SEO meta and FAQ for the product below.

Product Name: ${name}
Category: ${category || "Jewelry"}
Price: ${price || "N/A"}
Description: ${description || "N/A"}

Requirements:
- Return JSON only.
- JSON fields: metaTitle, metaDescription, faqItems.
- metaTitle <= 60 chars.
- metaDescription 140-170 chars.
- faqItems: array of 3 objects with question, answer.
`.trim();
};

const buildCategorySeoPrompt = ({ name, description, brand }) => {
  return `
You are an expert SEO copywriter for a luxury jewelry brand named ${brand}.
Generate SEO meta and FAQ for the category below.

Category Name: ${name}
Description: ${description || "N/A"}

Requirements:
- Return JSON only.
- JSON fields: metaTitle, metaDescription, faqItems.
- metaTitle <= 60 chars.
- metaDescription 140-170 chars.
- faqItems: array of 3 objects with question, answer.
`.trim();
};

const buildBlogSeoPrompt = ({ title, content, brand }) => {
  return `
You are an expert SEO copywriter for a luxury jewelry brand named ${brand}.
Generate SEO meta and FAQ for the blog below.

Blog Title: ${title}
Blog Content: ${content ? content.slice(0, 1200) : "N/A"}

Requirements:
- Return JSON only.
- JSON fields: metaTitle, metaDescription, faqItems.
- metaTitle <= 60 chars.
- metaDescription 140-170 chars.
- faqItems: array of 3 objects with question, answer.
`.trim();
};

const buildGuideSeoPrompt = ({ title, content, brand }) => {
  return `
You are an expert SEO copywriter for a luxury jewelry brand named ${brand}.
Generate SEO meta and FAQ for the buying guide below.

Guide Title: ${title}
Guide Content: ${content ? content.slice(0, 1200) : "N/A"}

Requirements:
- Return JSON only.
- JSON fields: metaTitle, metaDescription, faqItems.
- metaTitle <= 60 chars.
- metaDescription 140-170 chars.
- faqItems: array of 3 objects with question, answer.
`.trim();
};

const sarvamChat = async (messages) => {
  const payload = {
    model: SARVAM_MODEL,
    messages,
    temperature: 0.4,
    top_p: 1,
    max_tokens: 1200,
  };

  const response = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": SARVAM_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Sarvam API error");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
};

app.get("/", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/ai/blog", async (req, res) => {
  try {
    if (!SARVAM_API_KEY) return res.status(500).json({ error: "SARVAM_API_KEY not set" });
    const { topic, keywords, tone, length, brand } = req.body || {};
    if (!topic) return res.status(400).json({ error: "Missing topic" });

    const parsed = await sarvamChat([
      { role: "system", content: "You are a helpful SEO writer who returns JSON only." },
      { role: "user", content: buildPrompt({ topic, keywords, tone, length, brand }) },
    ]);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/ai/product", async (req, res) => {
  try {
    if (!SARVAM_API_KEY) return res.status(500).json({ error: "SARVAM_API_KEY not set" });
    const { name, category, description, price, brand } = req.body || {};
    if (!name) return res.status(400).json({ error: "Missing product name" });

    const parsed = await sarvamChat([
      { role: "system", content: "You are a helpful SEO writer who returns JSON only." },
      { role: "user", content: buildProductSeoPrompt({ name, category, description, price, brand }) },
    ]);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/ai/category", async (req, res) => {
  try {
    if (!SARVAM_API_KEY) return res.status(500).json({ error: "SARVAM_API_KEY not set" });
    const { name, description, brand } = req.body || {};
    if (!name) return res.status(400).json({ error: "Missing category name" });

    const parsed = await sarvamChat([
      { role: "system", content: "You are a helpful SEO writer who returns JSON only." },
      { role: "user", content: buildCategorySeoPrompt({ name, description, brand }) },
    ]);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/ai/blog-seo", async (req, res) => {
  try {
    if (!SARVAM_API_KEY) return res.status(500).json({ error: "SARVAM_API_KEY not set" });
    const { title, content, brand } = req.body || {};
    if (!title) return res.status(400).json({ error: "Missing blog title" });

    const parsed = await sarvamChat([
      { role: "system", content: "You are a helpful SEO writer who returns JSON only." },
      { role: "user", content: buildBlogSeoPrompt({ title, content, brand }) },
    ]);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: "AI generation failed" });
  }
});

app.post("/api/ai/guide-seo", async (req, res) => {
  try {
    if (!SARVAM_API_KEY) return res.status(500).json({ error: "SARVAM_API_KEY not set" });
    const { title, content, brand } = req.body || {};
    if (!title) return res.status(400).json({ error: "Missing guide title" });

    const parsed = await sarvamChat([
      { role: "system", content: "You are a helpful SEO writer who returns JSON only." },
      { role: "user", content: buildGuideSeoPrompt({ title, content, brand }) },
    ]);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: "AI generation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`AI server running on http://localhost:${PORT}`);
});
