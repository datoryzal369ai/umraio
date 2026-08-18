import { describe, expect, it } from "vitest";

import {
  buildEliteRead,
  eliteHandoffBrief,
  eliteSalesInstruction,
  type EliteInput,
} from "@/lib/sales/elite/elite-sales.core";
import {
  buildEliteNextActions,
  computeEliteMetrics,
} from "@/lib/sales/elite/elite-metrics.core";

const base = (over: Partial<EliteInput> = {}): EliteInput => ({
  domain: "agency_customer",
  customerMessages: [],
  ...over,
});

describe("AI SALES ELITE — acceptance scenarios", () => {
  it("1. new cold lead → understand before selling, no close", () => {
    const r = buildEliteRead(base({ customerMessages: ["Salam, nak tanya pasal umrah"] }));
    expect(r.state).toBe("EXPLORING");
    expect(["CLARIFY", "ANSWER", "QUALIFY"]).toContain(r.action);
    expect(r.closingMode).toBe("NONE");
  });

  it("2. interested lead → recommend, still no forced close", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Saya berminat pakej 12 hari", "Boleh cadangkan yang sesuai?"],
        signals: ["INTERESTED", "RECOMMENDATION_REQUEST"],
        buyingSignals: ["INTEREST"],
        known: ["pax", "travel_month"],
        missing: ["budget"],
      }),
    );
    expect(r.state).toBe("INTERESTED");
    expect(r.action).toBe("RECOMMEND");
    expect(r.psychology.readiness).toBe("medium");
  });

  it("3. price objection → value reframing, never a reflex discount", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Mahal sangat ni, boleh kurang tak?"],
        signals: ["PRICE_CONCERN"],
        activeObjections: ["PRICE"],
      }),
    );
    expect(r.objectionFocus).toBe("PRICE");
    expect(r.action).toBe("HANDLE_OBJECTION");
    expect(r.psychology.priceSensitivity).toBe("high");
    expect(eliteSalesInstruction(r)).toMatch(/never discount reflexively/i);
  });

  it("3b. price objection with strong intent → negotiate with VALUE close", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Saya nak ambil pakej ni tapi mahal sikit, boleh kurang?"],
        signals: ["PRICE_CONCERN", "READY_TO_BOOK"],
        activeObjections: ["PRICE"],
      }),
    );
    expect(r.action).toBe("NEGOTIATE");
    expect(r.closingMode).toBe("VALUE");
  });

  it("4. competitor comparison → honest comparison, consultative", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Saya tengah banding dengan agensi lain juga"],
        activeObjections: ["COMPARISON"],
      }),
    );
    expect(r.psychology.comparing).toBe(true);
    expect(r.action).toBe("COMPARE");
    expect(r.followUp?.angle).toMatch(/comparison/i);
  });

  it("5. 'need to discuss with husband' → support the shared decision, SUMMARY close", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Saya kena bincang dengan suami dulu ya"],
        signals: ["INTERESTED"],
        buyingSignals: ["INTEREST"],
      }),
    );
    expect(r.psychology.decisionAuthority).toBe("shared");
    expect(r.action).toBe("REASSURE");
    expect(r.followUp?.angle).toMatch(/spouse\/family/i);
    const instruction = eliteSalesInstruction(r);
    expect(instruction).toMatch(/never pressure them to decide alone/i);
  });

  it("6. strong buying signal → ask for the commitment, not for interest", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Ok saya rasa pakej ni sesuai, macam mana nak proceed?"],
        signals: ["READY_TO_BOOK"],
        buyingSignals: ["PROCEED"],
      }),
    );
    expect(["HIGH_INTENT", "READY_TO_CLOSE"]).toContain(r.state);
    expect(["ASK_FOR_COMMITMENT", "CLOSE"]).toContain(r.action);
    expect(r.closingMode).not.toBe("NONE");
  });

  it("7. ready to purchase with a quotation → assumptive close", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Okay, let's proceed. Berapa deposit?"],
        signals: ["DEPOSIT_INTENT", "READY_TO_BOOK"],
        known: ["name", "pax", "travel_month"],
        quotationStatus: "sent",
      }),
    );
    expect(r.state).toBe("READY_TO_CLOSE");
    expect(r.action).toBe("CLOSE");
    expect(r.closingMode).toBe("ASSUMPTIVE");
  });

  it("8. customer stops responding → context-anchored follow-up, no pressure", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Nanti saya reply ya"],
        known: ["name", "pax"],
        missing: ["budget"],
        hoursSinceCustomerMessage: 48,
      }),
    );
    expect(r.action).toBe("FOLLOW_UP");
    expect(r.followUp).not.toBeNull();
    expect(r.closingMode).toBe("NONE");
  });

  it("9. frustrated customer → repair first, never sell", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Dah lama tunggu tak jawab, teruk betul servis ni"],
        signals: ["FRUSTRATED"],
      }),
    );
    expect(r.psychology.emotion).toBe("frustrated");
    expect(r.action).toBe("REASSURE");
    expect(r.closingMode).toBe("NONE");
    expect(eliteSalesInstruction(r)).toMatch(/do not sell in this message/i);
  });

  it("10. agency owner evaluating UMRAIO → product domain framing", () => {
    const r = buildEliteRead(
      base({
        domain: "umraio_product",
        customerMessages: ["Saya owner agensi, nak tahu macam mana UMRAIO boleh bantu team saya"],
      }),
    );
    expect(r.domain).toBe("umraio_product");
    expect(r.psychology.decisionAuthority).toBe("sole");
    expect(eliteSalesInstruction(r)).toMatch(/selling UMRAIO® itself/i);
  });
});

describe("AI SALES ELITE — control & safety", () => {
  it("explicit human request always escalates", () => {
    const r = buildEliteRead(
      base({ customerMessages: ["Saya nak cakap dengan staf sebenar"], humanRequested: true }),
    );
    expect(r.escalate).toBe(true);
    expect(r.action).toBe("ESCALATE_TO_HUMAN");
  });

  it("opt-out is CLOSED_LOST with no follow-up and no selling", () => {
    const r = buildEliteRead(
      base({ customerMessages: ["Jangan hantar mesej lagi"], optOut: true, signals: ["DO_NOT_CONTACT"] }),
    );
    expect(r.state).toBe("CLOSED_LOST");
    expect(r.followUp).toBeNull();
    expect(r.closingMode).toBe("NONE");
  });

  it("trust concern lowers trust and forces a low-friction path", () => {
    const r = buildEliteRead(
      base({
        customerMessages: ["Betul ke agensi ni selamat? Takut kena scam"],
        signals: ["TRUST_CONCERN", "READY_TO_BOOK"],
        activeObjections: ["TRUST"],
      }),
    );
    expect(r.psychology.trust).toBe("low");
    expect(r.action).toBe("REASSURE");
  });

  it("instruction never leaks the framework and forbids fabrication", () => {
    const text = eliteSalesInstruction(buildEliteRead(base({ customerMessages: ["hi"] })));
    expect(text).toMatch(/NEVER mention it, quote it/i);
    expect(text).toMatch(/no fabricated prices/i);
  });

  it("handoff brief carries full context so the customer never repeats", () => {
    const read = buildEliteRead(
      base({
        customerMessages: ["Saya nak book untuk 4 orang bulan Mac"],
        signals: ["READY_TO_BOOK"],
        known: ["pax", "travel_month", "name"],
      }),
    );
    const brief = eliteHandoffBrief({
      read,
      customerName: "Aisyah",
      pax: 4,
      budgetMyr: 9000,
      packageInterest: "Umrah 12 Hari",
      discussed: ["package fit", "travel month"],
      reason: "Booking verification",
    });
    expect(brief).toContain("Aisyah");
    expect(brief).toContain("Umrah 12 Hari");
    expect(brief).toMatch(/RECOMMENDED NEXT ACTION/);
    expect(brief).toMatch(/must NOT be asked to repeat/i);
  });
});

describe("AI SALES ELITE — pipeline metrics", () => {
  const iso = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
  const leads = [
    { id: "1", full_name: "A", stage: "qualified", score: 80, budget_myr: 8000, pax: 2, last_contact_at: iso(100), created_at: iso(200) },
    { id: "2", full_name: "B", stage: "new", score: 20, budget_myr: null, pax: 1, last_contact_at: iso(2), created_at: iso(3) },
    { id: "3", full_name: "C", stage: "booked", score: 90, budget_myr: 9000, pax: 3, last_contact_at: iso(10), created_at: iso(50) },
    { id: "4", full_name: "D", stage: "lost", score: 30, budget_myr: null, pax: 1, last_contact_at: iso(80), created_at: iso(90) },
  ];

  it("computes elite metrics from existing pipeline rows", () => {
    const m = computeEliteMetrics({
      leads,
      followups: [{ id: "f1", run_at: iso(1), status: "pending", lead_id: "1" }],
      bookings: [{ amount_myr: 27000, status: "confirmed", created_at: iso(10) }],
      conversations: [{ id: "c1", status: "open", ai_enabled: true, last_message_at: iso(1) }],
    });
    expect(m.qualifiedLeads).toBe(2);
    expect(m.highIntentLeads).toBe(1);
    expect(m.salesWon).toBe(1);
    expect(m.conversionRate).toBe(25);
    expect(m.followupsDue).toBe(1);
    expect(m.revenueInfluencedMyr).toBeGreaterThan(27000);
  });

  it("surfaces prioritised next best actions", () => {
    const metrics = computeEliteMetrics({
      leads,
      followups: [{ id: "f1", run_at: iso(1), status: "pending", lead_id: "1" }],
      bookings: [],
      conversations: [{ id: "c1", status: "open", ai_enabled: false, last_message_at: iso(1) }],
    });
    const actions = buildEliteNextActions({
      leads,
      followups: [{ id: "f1", run_at: iso(1), status: "pending", lead_id: "1" }],
      conversations: [{ id: "c1", status: "open", ai_enabled: false, last_message_at: iso(1) }],
      metrics,
    });
    expect(actions[0]!.priority).toBe("critical");
    expect(actions.some((a) => a.id === "followups")).toBe(true);
    expect(actions.some((a) => a.id === "stale")).toBe(true);
    expect(actions.length).toBeLessThanOrEqual(5);
  });
});
