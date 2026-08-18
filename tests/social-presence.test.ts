import { describe, expect, it } from "vitest";

import {
  buildSocialProfile,
  detectHonorific,
  detectHumanIdentityQuestion,
  detectSelfName,
  detectSocialSignals,
  resolveAddress,
  socialPresenceInstruction,
} from "@/lib/sales/social-presence.core";

const c = (body: string) => ({ sender: "customer" as const, body });
const a = (body: string) => ({ sender: "ai" as const, body });

describe("STEP 3D — Human Presence & Social Intelligence Engine", () => {
  it("extracts a self-stated name", () => {
    expect(detectSelfName("Saya Ahmad.")).toBe("Ahmad");
    expect(detectSelfName("nama saya siti nurhaliza")).toBe("Siti Nurhaliza");
    expect(detectSelfName("My name is John Lee")).toBe("John Lee");
  });

  it("never treats filler as a name", () => {
    expect(detectSelfName("saya nak tanya package")).toBeNull();
    expect(detectSelfName("sy tk berminat")).toBeNull();
  });

  it("detects honorifics without inventing them", () => {
    expect(detectHonorific("Ini Dato' Ryzal")).toBe("Dato'");
    expect(detectHonorific("Tuan Haji nak tanya")).toBe("Tuan Haji");
    expect(detectHonorific("hi nak tanya package")).toBeNull();
  });

  it("builds an address form and stops asking once known", () => {
    const r = resolveAddress({ customerMessages: ["Encik Ahmad di sini."] });
    expect(r.addressForm).toBe("Encik Ahmad");
    expect(r.shouldAskHowToAddress).toBe(false);
  });

  it("asks how to address when unknown", () => {
    const r = resolveAddress({ customerMessages: ["Hi, nak tanya pakej December."] });
    expect(r.confidence).toBe("UNKNOWN");
    expect(r.shouldAskHowToAddress).toBe(true);
  });

  it("honours a preferred nickname", () => {
    const r = resolveAddress({ customerMessages: ["Nama saya Ahmad Fauzi, panggil saya Fauzi je."] });
    expect(r.preferredName).toBe("Fauzi");
    expect(r.addressForm).toBe("Fauzi");
  });

  it("detects elderly and family empathy signals", () => {
    const s = detectSocialSignals("Mak saya dah tua, saya risau dia penat.");
    expect(s).toContain("ELDERLY_TRAVELLER");
    expect(s).toContain("FAMILY_CONCERN");
  });

  it("detects trust concerns", () => {
    expect(detectSocialSignals("Takut scam lah")).toContain("TRUST_CONCERN");
  });

  it("detects the are-you-human question", () => {
    expect(detectHumanIdentityQuestion("ni bot ke manusia?")).toBe(true);
    expect(detectHumanIdentityQuestion("berapa harga pakej?")).toBe(false);
  });

  it("mirrors a casual short-form register", () => {
    const p = buildSocialProfile({ messages: [a("Salam"), c("hi nk tanya pakej dis je")] });
    expect(p.register).toBe("casual");
    expect(p.usesShortForms).toBe(true);
  });

  it("slows pacing for elderly travellers", () => {
    const p = buildSocialProfile({
      messages: [a("Salam"), c("Mak saya dah tua, susah berjalan jauh.")],
    });
    expect(p.pacing).toBe("measured");
  });

  it("bans 'anda' and chatbot patterns in the instruction", () => {
    const p = buildSocialProfile({ messages: [c("Hi nak tanya package December.")] });
    const text = socialPresenceInstruction(p);
    expect(text).toMatch(/"anda" is NOT the default/);
    expect(text).toMatch(/NO CHATBOT PATTERNS/);
    expect(text).toMatch(/never claim to be human/i);
  });

  it("lists remembered facts so they are not re-asked", () => {
    const p = buildSocialProfile({
      messages: [c("Saya Ahmad, 4 orang.")],
      knownName: "Ahmad",
      knownFacts: { pax: 4, travel_month: "December" },
    });
    const text = socialPresenceInstruction(p);
    expect(text).toContain("pax = 4");
    expect(text).toContain("travel_month = December");
    expect(text).toContain("Ahmad");
  });

  it("injects empathy guidance before any pitch", () => {
    const p = buildSocialProfile({ messages: [c("Takut scam lah, banyak kes tipu.")] });
    const text = socialPresenceInstruction(p);
    expect(text).toMatch(/Respond to the emotion FIRST/);
    expect(text).toMatch(/never invent verification/i);
  });
});

describe("STEP 3D.1 — name & honorific evidence rules", () => {
  it("keeps the plain name when no title was given", () => {
    const a = resolveAddress({ customerMessages: ["Nama saya Rizal"] });
    expect(a.name).toBe("Rizal");
    expect(a.honorific).toBeNull();
    expect(a.addressForm).toBe("Rizal");
  });

  it("echoes a self-stated honorific with the real name", () => {
    const a = resolveAddress({ customerMessages: ["Saya Dato' Rizal"] });
    expect(a.addressForm).toBe("Dato' Rizal");
    expect(a.honorificSource).toBe("self_stated");
  });

  it("uses a trusted-context honorific when only the name is given", () => {
    const a = resolveAddress({ customerMessages: ["Nama saya Rizal"], trustedHonorific: "Dato'" });
    expect(a.addressForm).toBe("Dato' Rizal");
    expect(a.honorificSource).toBe("trusted_context");
  });

  it("respects an explicit name-only preference", () => {
    const a = resolveAddress({ customerMessages: ["Panggil saya Rizal sahaja"], trustedHonorific: "Dato'" });
    expect(a.honorificDeclined).toBe(true);
    expect(a.addressForm).toBe("Rizal");
  });

  it("keeps compound formal titles intact", () => {
    const a = resolveAddress({ customerMessages: ["Saya Tuan Haji Ahmad"] });
    expect(a.addressForm).toBe("Tuan Haji Ahmad");
  });

  it("asks for the name first at first contact", () => {
    const profile = buildSocialProfile({ messages: [{ sender: "customer", body: "Assalamualaikum" }] });
    expect(profile.needsIntroduction).toBe(true);
    expect(socialPresenceInstruction(profile)).toContain("FIRST CONTACT");
  });
});
