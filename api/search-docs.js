// /api/search-docs.js — fast keyword search over /data/docs.json
import fs from "fs";
import path from "path";

function loadDocs() {
  try {
    const p = path.join(process.cwd(), "data", "docs.json");
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function scoreDoc(q, d) {
  const ql = q.toLowerCase();
  const title = (d.title || "").toLowerCase();
  const section = (d.section || "").toLowerCase();
  const text = (d.text || "").toLowerCase();

  let score = 0;
  // whole-phrase boosts
  if (text.includes(ql)) score += 10;
  if (title.includes(ql)) score += 12;
  if (section.includes(ql)) score += 8;

  // term-wise boosts
  const terms = ql.split(/\s+/).filter(Boolean);
  for (const t of terms) {
    if (text.includes(t)) score += 2;
    if (title.includes(t)) score += 3;
    if (section.includes(t)) score += 1;
  }
  return score;
}

function clampSnippet(s, max = 700) {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

export default async function handler(req, res) {
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const q = (req.query.q || req.query.query || "").toString().trim();
  if (!q) return res.status(400).json({ ok:false, error:"Missing ?q=" });

  const docs = loadDocs();
  const ranked = docs
    .map(d => ({ d, score: scoreDoc(q, d) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 3)
    .map(x => ({
      title: x.d.title,
      section: x.d.section,
      snippet: clampSnippet(x.d.text)
    }));

  return res.status(200).json({ ok:true, count: ranked.length, results: ranked });
}
