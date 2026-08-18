import { describe, expect, it } from "vitest";

import { getPlan, publicPlans } from "@/lib/billing/pricing.core";
import {
  PRICING_SECTION_COPY,
  localizedPlanPrice,
  localizedReferencePrice,
  localizedSavings,
  planCopy,
} from "@/lib/billing/pricing.i18n";
import type { Locale } from "@/lib/i18n/locale";

const BM_MARKERS = [
  "bulan",
  "Jimat",
  "Pilih ",
  "Untuk agency",
  "Hubungi",
  "Analitik",
  "artikel",
  "Nombor",
];
const EN_MARKERS = ["month", "Save ", "Choose ", "For agencies", "Contact Us", "Analytics", "articles"];

function allStrings(locale: Locale): string[] {
  const copy = PRICING_SECTION_COPY[locale];
  const out = [copy.eyebrow, copy.heading, copy.intro, copy.customNote, copy.noPaymentNote, copy.availablePlans, copy.availablePlansNote, copy.selectedPlan];
  for (const plan of publicPlans()) {
    const text = planCopy(plan, locale);
    out.push(text.subtitle, text.ctaLabel, ...text.features);
  }
  return out;
}

describe("Step 3G.2 — pricing localization", () => {
  it("BM mode renders BM pricing copy", () => {
    expect(PRICING_SECTION_COPY.bm.intro).toContain("Harga bulanan dalam Ringgit Malaysia");
    expect(planCopy(getPlan("basic"), "bm").subtitle).toBe("Untuk agency yang baru mula");
    expect(planCopy(getPlan("basic"), "bm").ctaLabel).toBe("Pilih Basic");
    expect(planCopy(getPlan("pro"), "bm").ctaLabel).toBe("Pilih Pro Founding");
    expect(planCopy(getPlan("premium"), "bm").ctaLabel).toBe("Pilih Premium");
    expect(planCopy(getPlan("enterprise"), "bm").ctaLabel).toBe("Hubungi Kami");
  });

  it("English mode renders English pricing copy", () => {
    expect(PRICING_SECTION_COPY.en.intro).toContain("Monthly pricing in Malaysian Ringgit");
    expect(planCopy(getPlan("basic"), "en").subtitle).toBe("For agencies getting started");
    expect(planCopy(getPlan("basic"), "en").ctaLabel).toBe("Choose Basic");
    expect(planCopy(getPlan("pro"), "en").ctaLabel).toBe("Choose Pro Founding");
    expect(planCopy(getPlan("premium"), "en").ctaLabel).toBe("Choose Premium");
    expect(planCopy(getPlan("enterprise"), "en").ctaLabel).toBe("Contact Us");
  });

  it("does not mix languages within a locale", () => {
    const bm = allStrings("bm").join(" | ");
    const en = allStrings("en").join(" | ");
    for (const marker of EN_MARKERS) expect(bm).not.toContain(marker);
    for (const marker of BM_MARKERS) expect(en).not.toContain(marker);
  });

  it("keeps Pro as the hero in both languages", () => {
    expect(getPlan("pro").recommended).toBe(true);
    expect(PRICING_SECTION_COPY.en.mostPopular).toBe("Most Popular");
    expect(PRICING_SECTION_COPY.bm.mostPopular).toBe("Paling Popular");
  });

  it("never localizes a price figure away from the canonical source", () => {
    const pro = getPlan("pro");
    expect(localizedPlanPrice(pro, "bm")).toBe("RM299/bulan");
    expect(localizedPlanPrice(pro, "en")).toBe("RM299/month");
    expect(localizedReferencePrice(pro, "bm")).toBe("RM499/bulan");
    expect(localizedReferencePrice(pro, "en")).toBe("RM499/month");
    expect(localizedSavings(pro, "bm")).toBe("Jimat RM200/bulan");
    expect(localizedSavings(pro, "en")).toBe("Save RM200/month");
    expect(localizedPlanPrice(getPlan("basic"), "bm")).toBe("RM199/bulan");
    expect(localizedPlanPrice(getPlan("premium"), "en")).toBe("RM799/month");
    expect(localizedPlanPrice(getPlan("enterprise"), "bm")).toBe("CUSTOM");
    expect(localizedPlanPrice(getPlan("enterprise"), "en")).toBe("CUSTOM");
    expect(localizedSavings(getPlan("basic"), "en")).toBeNull();
  });

  it("covers every public plan in both languages", () => {
    for (const plan of publicPlans()) {
      for (const locale of ["bm", "en"] as const) {
        const text = planCopy(plan, locale);
        expect(text.features.length).toBeGreaterThan(0);
        expect(text.ctaLabel.length).toBeGreaterThan(0);
        expect(text.ctaLabel).not.toContain("Start Free Trial");
      }
    }
  });
});
