import { describe, expect, it } from "vitest";

import {
  CANONICAL_PLANS,
  LEGACY_PLAN_MAP,
  formatPlanPrice,
  foundingNote,
  getPlan,
  isLegacyPlanCode,
  pricingFactSheet,
  publicPlans,
  resolveDisplayPlan,
} from "@/lib/billing/pricing.core";
import { closingInstruction } from "@/lib/meet/closing-engine.core";

describe("UMRAIO canonical pricing (Step 3G.1)", () => {
  it("Basic is RM199/month", () => {
    expect(getPlan("basic").priceMyrMonthly).toBe(199);
    expect(formatPlanPrice(getPlan("basic"))).toBe("RM199/month");
  });

  it("Pro is RM299/month with RM499 reference price and founding status", () => {
    const pro = getPlan("pro");
    expect(pro.priceMyrMonthly).toBe(299);
    expect(pro.referencePriceMyrMonthly).toBe(499);
    expect(pro.founding).toBe(true);
    expect(pro.baseName).toBe("Pro");
    expect(pro.name).toBe("Pro — Founding");
    expect(foundingNote(pro)).toBe("Founding price · Reference RM499");
  });

  it("Premium is RM799/month", () => {
    expect(getPlan("premium").priceMyrMonthly).toBe(799);
  });

  it("Enterprise has no invented price", () => {
    const ent = getPlan("enterprise");
    expect(ent.priceMyrMonthly).toBeNull();
    expect(formatPlanPrice(ent)).toBe("Custom");
    expect(ent.cta).toBe("talk_to_team");
  });

  it("exposes exactly four commercial plans and no separate Founding plan", () => {
    expect(publicPlans().map((p) => p.id)).toEqual(["basic", "pro", "premium", "enterprise"]);
    expect(CANONICAL_PLANS.some((p) => p.id === ("founding" as never))).toBe(false);
    expect(CANONICAL_PLANS.filter((p) => p.founding)).toHaveLength(1);
  });

  it("keeps legacy entitlement codes resolvable without altering them", () => {
    for (const code of ["founding", "trial", "growth", "scale"]) {
      expect(isLegacyPlanCode(code)).toBe(true);
      expect(resolveDisplayPlan(code).id).toBeTruthy();
    }
    expect(LEGACY_PLAN_MAP.founding).toEqual({
      canonical: "pro",
      founding: true,
      note: "Founding entitlement on the Pro plan.",
    });
    expect(LEGACY_PLAN_MAP.scale.canonical).toBe("premium");
    expect(LEGACY_PLAN_MAP.trial.canonical).toBe("basic");
  });

  it("RAIŌ pricing fact sheet only contains canonical figures", () => {
    const sheet = pricingFactSheet();
    expect(sheet).toContain("RM199/month");
    expect(sheet).toContain("RM299/month");
    expect(sheet).toContain("reference price RM499/month");
    expect(sheet).toContain("RM799/month");
    expect(sheet).toContain("custom pricing");
    expect(sheet).not.toMatch(/RM\s?1,?299|RM\s?149|discount|promo/i);
  });

  it("closing directive quotes canonical pricing and never claims payment", () => {
    const read = {
      readiness: "READY_TO_SUBSCRIBE",
      reason: "price question",
      cta: "START_FREE_TRIAL",
      priceQuestion: true,
      paymentQuestion: true,
      stopDiscovery: true,
      confirmUnderstanding: false,
      ctaPresented: false,
      postCta: "NONE",
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } as any;
    const text = closingInstruction(read);
    expect(text).toContain("RM299/month");
    expect(text).toContain("Never invent discounts");
    expect(text).toMatch(/not processed in this demonstration/i);
  });
});
