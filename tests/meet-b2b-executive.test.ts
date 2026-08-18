import { describe, expect, it } from "vitest";

import type { DemoMessage } from "@/lib/meet-executive.core";
import {
  analyzeMeetConversation,
  buildMeetExecutiveBrief,
  deriveMeetEvents,
  meetExecutiveInstruction,
} from "@/lib/meet/b2b-executive.core";

const v = (content: string): DemoMessage => ({ role: "visitor", content });
const e = (content: string): DemoMessage => ({ role: "executive", content });

function convo(...parts: string[]): DemoMessage[] {
  const out: DemoMessage[] = [e("Opening")];
  for (const p of parts) {
    out.push(v(p), e("Noted."));
  }
  return out;
}

describe("STEP 3B — Meet Your UMRAIO Executive™", () => {
  /* A / B / C — language */
  it("A. detects Bahasa Melayu discovery", () => {
    const i = analyzeMeetConversation(convo("Sales saya ada 5 orang dan kami guna WhatsApp sahaja."));
    expect(i.language).toBe("ms");
    expect(i.facts.salesTeam).toBe(5);
    expect(i.facts.channelWhatsapp).toBe(true);
  });

  it("B. detects English discovery", () => {
    const i = analyzeMeetConversation(convo("We have 8 sales consultants handling WhatsApp enquiries."));
    expect(i.language).toBe("en");
    expect(i.facts.salesTeam).toBe(8);
  });

  it("C. handles Manglish", () => {
    const i = analyzeMeetConversation(convo("Team saya ada 4 orang, tapi enquiry banyak so cannot reply all."));
    expect(["ms", "mix"]).toContain(i.language);
    expect(i.facts.salesTeam).toBe(4);
  });

  it("D. follows a language switch", () => {
    const i = analyzeMeetConversation(
      convo("Sales saya ada 5 orang.", "Can UMRAIO handle enquiries after office hours as well?"),
    );
    expect(i.language).toBe("en");
  });

  it("E. understands short forms and typos", () => {
    const i = analyzeMeetConversation(convo("sy ada 3 org sales, brp enquiry pun tk sempat reply"));
    expect(i.facts.salesTeam).toBe(3);
  });

  /* F–I — profile and gaps */
  it("F. records an existing sales team as an objection, not a rejection", () => {
    const i = analyzeMeetConversation(convo("Saya dah ada sales team, tak perlu AI rasanya."));
    expect(i.objections.map((o) => o.category)).toContain("ALREADY_HAVE_SALES_TEAM");
    expect(i.nextBestAction).toBe("HANDLE_OBJECTION");
  });

  it("G. captures high lead volume", () => {
    const i = analyzeMeetConversation(convo("Kami dapat 800 lebih enquiry sebulan."));
    expect(i.facts.monthlyEnquiries).toBe(800);
    expect(i.snapshot.find((r) => r.key === "volume")?.status).toBe("CONFIRMED");
  });

  it("H. detects an after-hours response gap", () => {
    const i = analyzeMeetConversation(
      convo("Kadang-kadang lead masuk malam tapi esok baru sempat reply."),
    );
    expect(i.detectedGaps.map((g) => g.key)).toContain("after_hours");
    expect(i.gaps.find((g) => g.key === "after_hours")?.consequence).toBeTruthy();
  });

  it("I. detects a follow-up gap", () => {
    const i = analyzeMeetConversation(convo("Follow up kami manual, selalu lupa."));
    expect(i.detectedGaps.map((g) => g.key)).toContain("followup");
  });

  /* J–M — objections */
  it("J. detects the AI trust / robotic objection", () => {
    const i = analyzeMeetConversation(convo("Saya takut AI reply macam robot."));
    expect(i.objections.map((o) => o.category)).toContain("AI_SOUNDS_ROBOTIC");
  });

  it("K. detects the price objection", () => {
    const i = analyzeMeetConversation(convo("AI ni mahal tak untuk agency kecil?"));
    expect(i.objections.map((o) => o.category)).toContain("COST");
  });

  it("L. detects the existing CRM objection", () => {
    const i = analyzeMeetConversation(convo("Actually team saya dah ada CRM."));
    expect(i.objections.map((o) => o.category)).toContain("ALREADY_HAVE_CRM");
  });

  it("M. treats partner approval as a decision process", () => {
    const i = analyzeMeetConversation(convo("Saya kena bincang dengan partner dulu."));
    expect(i.nextBestAction).toBe("SUPPORT_DECISION_MAKER");
  });

  /* N–R — intent ladder */
  it("N. recognises a high-intent agency", () => {
    const i = analyzeMeetConversation(convo("Macam mana nak mula free trial untuk agency saya?"));
    expect(i.stage).toBe("TRIAL_READY");
    expect(i.nextBestAction).toBe("INVITE_TRIAL");
  });

  it("O. keeps a low-intent visitor in discovery", () => {
    const i = analyzeMeetConversation(convo("Hi, apa ni?"));
    expect(["CURIOUS", "LOW_INTENT"]).toContain(i.stage);
    expect(i.nextBestAction).toBe("DISCOVER_AGENCY_PROFILE");
  });

  it("P. recognises a demo request", () => {
    const i = analyzeMeetConversation(convo("Boleh tunjuk contoh macam mana AI reply customer?"));
    expect(i.stage).toBe("DEMO_READY");
    expect(i.nextBestAction).toBe("RUN_DEMONSTRATION");
    expect(i.demoPath).toBeTruthy();
  });

  it("Q. recognises subscription interest", () => {
    const i = analyzeMeetConversation(convo("Saya nak langgan, ada plan bulanan?"));
    expect(i.stage).toBe("SUBSCRIPTION_READY");
    expect(i.nextBestAction).toBe("MOVE_TO_SUBSCRIPTION");
  });

  it("R. stops autonomous selling on an explicit human request", () => {
    const i = analyzeMeetConversation(convo("Saya nak cakap dengan manusia."));
    expect(i.humanRequested).toBe(true);
    expect(i.stage).toBe("HUMAN_HANDOFF");
    expect(i.nextBestAction).toBe("HUMAN_HANDOFF");
  });

  it("S. enforces opt-out above everything else", () => {
    const i = analyzeMeetConversation(convo("Stop, jangan hubungi saya lagi."));
    expect(i.optedOut).toBe(true);
    expect(i.stage).toBe("DO_NOT_CONTACT");
    expect(i.nextBestAction).toBe("STOP_CONTACT");
  });

  it("T. repairs the experience when the visitor is frustrated", () => {
    const i = analyzeMeetConversation(convo("Awak tanya soalan sama berulang kali, menyusahkan betul"));
    expect(i.frustration.length).toBeGreaterThan(0);
    expect(i.nextBestAction).toBe("REPAIR_EXPERIENCE");
  });

  /* U / V — no invented data */
  it("U. never invents business data", () => {
    const i = analyzeMeetConversation(convo("Kami agency Umrah di Shah Alam."));
    expect(i.facts.salesTeam).toBeNull();
    expect(i.facts.monthlyEnquiries).toBeNull();
    expect(i.snapshot.find((r) => r.key === "team")?.value).toBe("Not provided");
  });

  it("V. never fabricates ROI in the instruction", () => {
    const i = analyzeMeetConversation(convo("Lead masuk malam, esok baru reply."));
    const text = meetExecutiveInstruction(i);
    expect(text).toMatch(/never claim guaranteed bookings, revenue/i);
    expect(text).not.toMatch(/\d+%\s*(increase|conversion|roi)/i);
  });

  /* W–Y — behaviour of the engine */
  it("W. picks the correct next-best-action ladder position", () => {
    const i = analyzeMeetConversation(
      convo("Sales saya 5 orang.", "800 enquiry sebulan.", "Lead masuk malam, esok baru sempat reply."),
    );
    expect(["EXPLAIN_CONSEQUENCE", "GENERATE_DIAGNOSIS", "RECOMMEND_CAPABILITY"]).toContain(
      i.nextBestAction,
    );
  });

  it("X. updates the business snapshot live without 'insufficient data'", () => {
    const before = analyzeMeetConversation(convo("Hello"));
    expect(before.snapshot.every((r) => r.value !== "Insufficient data")).toBe(true);
    const after = analyzeMeetConversation(convo("Hello", "Sales saya 5 orang, 800 enquiry sebulan."));
    expect(after.snapshot.find((r) => r.key === "team")?.value).toContain("5");
    expect(after.snapshot.find((r) => r.key === "volume")?.value).toContain("800");
  });

  it("Y. produces a diagnosis only when evidence exists", () => {
    const thin = analyzeMeetConversation(convo("Sales saya 5 orang."));
    expect(thin.diagnosis).toBeNull();

    const rich = analyzeMeetConversation(
      convo(
        "Sales saya 5 orang.",
        "800 enquiry sebulan melalui WhatsApp.",
        "Lead masuk malam, esok baru sempat reply.",
        "Follow up kami manual, selalu lupa.",
      ),
    );
    expect(rich.diagnosis).not.toBeNull();
    expect(rich.diagnosis?.primaryOpportunity.status).toBe("DETECTED");
    const brief = buildMeetExecutiveBrief(rich);
    expect(brief).toContain("UMRAIO EXECUTIVE BRIEF");
    expect(brief).toContain("KEY OPPORTUNITY");
    expect(deriveMeetEvents(rich)).toContain("diagnosis_generated");
  });

  it("does not re-ask facts that are already known", () => {
    const i = analyzeMeetConversation(convo("Sales saya 5 orang, 800 enquiry sebulan."));
    const text = meetExecutiveInstruction(i);
    expect(text).toContain("sales team = 5");
    expect(text).toContain("monthly enquiries = 800");
    expect(i.missingFacts).not.toContain("sales team size");
  });
});
