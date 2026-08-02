import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { currentAgencyId } from "@/lib/leads";
import {
  KB_CATEGORIES,
  KB_CATEGORY_LABELS,
  createArticle,
  deleteArticle,
  extractPdfText,
  fetchArticles,
  knowledgeFileUrl,
  updateArticle,
  uploadKnowledgePdf,
  type KbCategory,
  type KnowledgeArticle,
} from "@/lib/knowledge";

export const Route = createFileRoute("/_authenticated/knowledge/")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — UMRAIO" },
      {
        name: "description",
        content:
          "Feed your AI Sales Executive with FAQs, travel guides, package, visa and hotel information, plus uploaded PDF documents.",
      },
      { property: "og:title", content: "Knowledge Base — UMRAIO" },
      {
        property: "og:description",
        content: "Articles and PDFs the AI reads before answering every Umrah enquiry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePage,
});

type FormState = {
  title: string;
  category: KbCategory;
  summary: string;
  content: string;
  tags: string;
  is_active: boolean;
  file_name: string | null;
  file_path: string | null;
};

const emptyForm: FormState = {
  title: "",
  category: "faq",
  summary: "",
  content: "",
  tags: "",
  is_active: true,
  file_name: null,
  file_path: null,
};

function KnowledgePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeArticle | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: fetchArticles,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!term) return true;
      return [a.title, a.summary, a.content, a.file_name, ...(a.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [articles, search, category]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["knowledge"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        summary: form.summary.trim() || null,
        content: form.content.trim(),
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        is_active: form.is_active,
        file_name: form.file_name,
        file_path: form.file_path,
      };
      if (!payload.title) throw new Error("Title is required.");
      if (!payload.content) throw new Error("Add some content or upload a PDF.");
      if (editing) return updateArticle(editing.id, payload);
      const agencyId = await currentAgencyId(user!.id);
      return createArticle(agencyId, payload, user!.id);
    },
    onSuccess: async () => {
      toast.success(editing ? "Article updated." : "Article added to the knowledge base.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (article: KnowledgeArticle) => deleteArticle(article),
    onSuccess: async () => {
      toast.success("Article deleted.");
      setPendingDelete(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (article: KnowledgeArticle) =>
      updateArticle(article.id, { is_active: !article.is_active }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }
    setUploading(true);
    try {
      const agencyId = await currentAgencyId(user!.id);
      const [text, uploaded] = await Promise.all([
        extractPdfText(file).catch(() => ""),
        uploadKnowledgePdf(agencyId, file),
      ]);
      setForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.pdf$/i, ""),
        content: text ? `${prev.content ? `${prev.content}\n\n` : ""}${text}` : prev.content,
        file_name: uploaded.name,
        file_path: uploaded.path,
      }));
      toast.success(
        text ? "PDF uploaded and text extracted for the AI." : "PDF uploaded (no readable text).",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openFile(article: KnowledgeArticle) {
    if (!article.file_path) return;
    const url = await knowledgeFileUrl(article.file_path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Could not open the document.");
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function startEdit(article: KnowledgeArticle) {
    setEditing(article);
    setForm({
      title: article.title,
      category: article.category,
      summary: article.summary ?? "",
      content: article.content,
      tags: (article.tags ?? []).join(", "),
      is_active: article.is_active,
      file_name: article.file_name,
      file_path: article.file_path,
    });
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Knowledge Base
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Articles, FAQs and PDF documents your AI Sales Executive reads before answering any
            enquiry.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="size-4" />
          New article
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles, FAQs, documents…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {KB_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {KB_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <p className="font-medium">No knowledge articles yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add FAQs, travel guides, visa rules, hotel details or upload agency PDFs so the AI never
            guesses an answer.
          </p>
          <Button variant="outline" onClick={startCreate}>
            <Plus className="size-4" />
            Add your first article
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((article) => (
            <article
              key={article.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{KB_CATEGORY_LABELS[article.category]}</Badge>
                    {!article.is_active && <Badge variant="outline">Disabled</Badge>}
                  </div>
                  <h2 className="mt-2 truncate font-medium">{article.title}</h2>
                </div>
                <Switch
                  checked={article.is_active}
                  onCheckedChange={() => toggleMutation.mutate(article)}
                  aria-label="Use this article in AI answers"
                />
              </div>

              <p className="line-clamp-3 text-sm text-muted-foreground">
                {article.summary || article.content}
              </p>

              {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {article.file_path && (
                  <Button variant="outline" size="sm" onClick={() => openFile(article)}>
                    <FileText className="size-4" />
                    PDF
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => startEdit(article)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(article)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit article" : "New knowledge article"}</DialogTitle>
            <DialogDescription>
              The AI searches this content before replying to customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Umrah visa requirements 2026"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as KbCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KB_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {KB_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-tags">Tags (comma separated)</Label>
                <Input
                  id="kb-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="visa, passport, ramadan"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-summary">Short summary</Label>
              <Input
                id="kb-summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="One line the AI uses to pick the right article"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-content">Content</Label>
              <Textarea
                id="kb-content"
                rows={10}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write the FAQ answer, travel guide, package or hotel details…"
              />
            </div>

            <div className="rounded-lg border border-dashed border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Upload PDF</p>
                  <p className="text-xs text-muted-foreground">
                    Text is extracted automatically so the AI can quote it.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? "Processing…" : "Choose PDF"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </div>
              {form.file_name && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4" />
                  {form.file_name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Use in AI answers</p>
                  <p className="text-xs text-muted-foreground">
                    Disabled articles stay saved but are ignored by the AI.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Add article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title} will be removed from the knowledge base, along with any
              uploaded PDF.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
