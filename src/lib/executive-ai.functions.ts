import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { TASK_KINDS } from "./executive-ai.server";
import { createTask, executeTask } from "./task-engine.server";

export const runExecutiveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; brief?: string }) => {
    if (!input?.kind || !TASK_KINDS[input.kind]) throw new Error("Unknown task kind");
    return { kind: input.kind, brief: (input.brief ?? "").slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();
    const agencyId = profile?.agency_id as string | undefined;
    if (!agencyId) throw new Error("No agency found for this account");

    const taskId = await createTask(supabase, agencyId, {
      kind: data.kind,
      brief: data.brief,
      origin: "manual",
      createdBy: userId,
    });
    const status = await executeTask(supabase, agencyId, taskId);
    return { taskId, status };
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
