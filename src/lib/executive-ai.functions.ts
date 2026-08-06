import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  TASK_KINDS,
  runDocumentTask,
  runFollowupSweep,
  runLeadIntelligence,
} from "./executive-ai.server";

export const runExecutiveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; brief?: string }) => {
    if (!input?.kind || !TASK_KINDS[input.kind]) throw new Error("Unknown task kind");
    return { kind: input.kind, brief: (input.brief ?? "").slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const spec = TASK_KINDS[data.kind]!;

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();
    const agencyId = profile?.agency_id as string | undefined;
    if (!agencyId) throw new Error("No agency found for this account");

    const { data: task, error: insertError } = await supabase
      .from("ai_tasks")
      .insert({
        agency_id: agencyId,
        worker_key: spec.worker,
        title: spec.label,
        kind: data.kind,
        status: "processing",
        input: { brief: data.brief },
        minutes_saved: spec.minutes,
        requires_approval: spec.worker === "marketing" || spec.worker === "content",
        created_by: userId,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    await supabase
      .from("ai_workers")
      .update({ status: "processing", last_run_at: new Date().toISOString() })
      .eq("agency_id", agencyId)
      .eq("worker_key", spec.worker);

    try {
      let document;
      let summarySuffix = "";

      if (data.kind === "lead_scoring") {
        const res = await runLeadIntelligence(supabase, agencyId, data.brief);
        document = res.document;
        summarySuffix = ` · ${res.updated} leads rescored`;
      } else if (data.kind === "followup_sweep") {
        const res = await runFollowupSweep(supabase, agencyId, data.brief);
        document = res.document;
        summarySuffix = ` · ${res.scheduled} follow-ups scheduled`;
      } else {
        document = await runDocumentTask(supabase, agencyId, data.kind, data.brief);
      }

      const requiresApproval = spec.worker === "marketing" || spec.worker === "content";
      const status = requiresApproval ? "waiting_approval" : "completed";

      await supabase
        .from("ai_tasks")
        .update({
          status,
          output: document,
          summary: `${document.summary}${summarySuffix}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      await supabase
        .from("ai_workers")
        .update({ status: requiresApproval ? "waiting_approval" : "completed" })
        .eq("agency_id", agencyId)
        .eq("worker_key", spec.worker);

      await supabase.from("activity_log").insert({
        agency_id: agencyId,
        actor: "ai",
        action: `${spec.worker === "whatsapp" ? "AI WhatsApp Executive" : spec.worker === "marketing" ? "AI Marketing Executive" : spec.worker === "content" ? "AI Content Executive" : "AI Lead Intelligence"} completed: ${spec.label}`,
        entity: "ai_task",
        entity_id: task.id,
        meta: { kind: data.kind, status },
      });

      return { taskId: task.id as string, status };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Task failed";
      await supabase
        .from("ai_tasks")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      await supabase
        .from("ai_workers")
        .update({ status: "idle" })
        .eq("agency_id", agencyId)
        .eq("worker_key", spec.worker);
      throw new Error(message);
    }
  });

export const decideExecutiveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string; decision: "approve" | "reject" }) => {
    if (!input?.taskId) throw new Error("taskId is required");
    if (input.decision !== "approve" && input.decision !== "reject")
      throw new Error("Invalid decision");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: task, error } = await supabase
      .from("ai_tasks")
      .select("id, agency_id, title, worker_key")
      .eq("id", data.taskId)
      .maybeSingle();
    if (error) throw error;
    if (!task) throw new Error("Task not found");

    const status = data.decision === "approve" ? "completed" : "rejected";
    await supabase
      .from("ai_tasks")
      .update({
        status,
        approved_at: data.decision === "approve" ? new Date().toISOString() : null,
        approved_by: data.decision === "approve" ? userId : null,
      })
      .eq("id", task.id);

    await supabase.from("activity_log").insert({
      agency_id: task.agency_id,
      actor: "human",
      action: `${data.decision === "approve" ? "Approved" : "Rejected"} AI output: ${task.title}`,
      entity: "ai_task",
      entity_id: task.id,
      meta: { worker_key: task.worker_key },
    });

    const { count } = await supabase
      .from("ai_tasks")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", task.agency_id)
      .eq("worker_key", task.worker_key)
      .eq("status", "waiting_approval");

    await supabase
      .from("ai_workers")
      .update({ status: (count ?? 0) > 0 ? "waiting_approval" : "idle" })
      .eq("agency_id", task.agency_id)
      .eq("worker_key", task.worker_key);

    return { status };
  });
