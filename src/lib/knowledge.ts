import { supabase } from "@/integrations/supabase/client";

export const KB_CATEGORIES = [
  "faq",
  "travel_guide",
  "package_info",
  "visa_info",
  "hotel_info",
  "general",
] as const;

export type KbCategory = (typeof KB_CATEGORIES)[number];

export const KB_CATEGORY_LABELS: Record<KbCategory, string> = {
  faq: "FAQ",
  travel_guide: "Travel Guide",
  package_info: "Package Information",
  visa_info: "Visa Information",
  hotel_info: "Hotel Information",
  general: "General",
};

export type KnowledgeArticle = {
  id: string;
  agency_id: string;
  title: string;
  category: KbCategory;
  summary: string | null;
  content: string;
  tags: string[];
  file_name: string | null;
  file_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type KnowledgeInput = {
  title: string;
  category: KbCategory;
  summary: string | null;
  content: string;
  tags: string[];
  is_active: boolean;
  file_name?: string | null;
  file_path?: string | null;
};

const COLUMNS =
  "id, agency_id, title, category, summary, content, tags, file_name, file_path, is_active, created_at, updated_at";

export async function fetchArticles(): Promise<KnowledgeArticle[]> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select(COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as KnowledgeArticle[];
}

export async function createArticle(
  agencyId: string,
  input: KnowledgeInput,
  userId: string,
): Promise<KnowledgeArticle> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .insert({ ...input, agency_id: agencyId, created_by: userId })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as KnowledgeArticle;
}

export async function updateArticle(
  id: string,
  input: Partial<KnowledgeInput>,
): Promise<KnowledgeArticle> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .update(input)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as KnowledgeArticle;
}

export async function deleteArticle(article: KnowledgeArticle): Promise<void> {
  if (article.file_path) {
    await supabase.storage.from("knowledge").remove([article.file_path]);
  }
  const { error } = await supabase.from("knowledge_articles").delete().eq("id", article.id);
  if (error) throw error;
}

export async function uploadKnowledgePdf(
  agencyId: string,
  file: File,
): Promise<{ path: string; name: string }> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${agencyId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from("knowledge")
    .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
  if (error) throw error;
  return { path, name: file.name };
}

export async function knowledgeFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("knowledge").createSignedUrl(path, 300);
  if (error) return null;
  return data.signedUrl;
}

/** Extract readable text from a PDF in the browser so the AI can use it. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 50);
  for (let i = 1; i <= max; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }
  return pages.join("\n\n").slice(0, 120_000);
}
