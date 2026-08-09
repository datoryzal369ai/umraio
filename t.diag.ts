import { createClient } from "@supabase/supabase-js";
import { generateAgentReply } from "@/lib/sales-ai.server";
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const agencyId = process.argv[2]!;
const scenarios = [
  ["TEST1", "Apakah UMRAIO sebenarnya?"],
  ["TEST2", "UMRAIO boleh bantu apa?"],
  ["TEST3", "Ada pakej September?"],
  ["TEST4", "Budget RM10k untuk 2 orang."],
  ["TEST5", "Saya nak cakap dengan staff manusia boleh?"],
];
const { data: conv } = await db.from("conversations").insert({ agency_id: agencyId, channel: "web", external_id: "diag-test-"+Date.now() }).select("id").single();
const id = conv!.id;
for (const [name, text] of scenarios) {
  await db.from("messages").insert({ agency_id: agencyId, conversation_id: id, sender: "customer", body: text });
  let reply = "";
  try { reply = await generateAgentReply(db as never, id); } catch (e) { reply = "ERROR " + (e as Error).message; }
  await db.from("messages").insert({ agency_id: agencyId, conversation_id: id, sender: "ai", body: reply });
  const { data: c } = await db.from("conversations").select("ai_enabled, human_attention_required").eq("id", id).single();
  console.log(`\n=== ${name}: ${text}\n${reply}\n-> ai_enabled=${c!.ai_enabled} human_attention=${c!.human_attention_required}`);
}
// TEST6: another message after the knowledge gap
await db.from("messages").insert({ agency_id: agencyId, conversation_id: id, sender: "customer", body: "Ok, saya nak Umrah bulan Disember." });
const { data: c2 } = await db.from("conversations").select("ai_enabled").eq("id", id).single();
console.log("\nTEST6 ai_enabled before reply:", c2!.ai_enabled);
if (c2!.ai_enabled) console.log("TEST6 reply:", await generateAgentReply(db as never, id));
await db.from("messages").delete().eq("conversation_id", id);
await db.from("conversations").delete().eq("id", id);
console.log("\ncleaned up");
