import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { signMetaPayload, verifyMetaSignature } from "../src/lib/whatsapp-signature";
import { WHATSAPP_CLIENT_COLUMNS } from "../src/lib/whatsapp";

const SECRET = "test_app_secret_value";
const BODY = JSON.stringify({
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: "1234567890" },
            contacts: [{ profile: { name: "Ali" }, wa_id: "60123456789" }],
            messages: [{ from: "60123456789", type: "text", text: { body: "Salam, umrah package?" } }],
          },
        },
      ],
    },
  ],
});

// --- Side-effect spies: any of these firing on a rejected request is a failure.
const sideEffects = {
  dbWrites: 0,
  aiCalls: 0,
  quotaConsumed: 0,
  outboundSends: 0,
};

vi.mock("@/integrations/supabase/client.server", () => {
  const builder = () => {
    const chain: Record<string, unknown> = {};
    for (const key of ["select", "eq", "update", "insert", "order", "limit"]) {
      chain[key] = () => {
        if (key === "update" || key === "insert") sideEffects.dbWrites += 1;
        return chain;
      };
    }
    chain["maybeSingle"] = async () => ({ data: null });
    chain["single"] = async () => ({ data: null });
    return chain;
  };
  return { supabaseAdmin: { from: () => builder() } };
});

vi.mock("@/lib/sales-ai.server", () => ({
  generateAgentReply: async () => {
    sideEffects.aiCalls += 1;
    return "reply";
  },
  computeLeadScore: () => 50,
  temperatureForScore: () => "warm",
}));

vi.mock("@/lib/billing/usage.server", () => ({
  recordUsageEvent: async () => {
    sideEffects.quotaConsumed += 1;
  },
  assertWithinQuota: async () => {
    sideEffects.quotaConsumed += 1;
  },
}));

async function postWebhook(body: string, signature: string | null) {
  const { Route } = await import("../src/routes/api/public/whatsapp");
  const handler = (
    Route.options as unknown as {
      server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } };
    }
  ).server.handlers.POST;
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("x-hub-signature-256", signature);
  return handler({ request: new Request("https://umraio.com/api/public/whatsapp", {
    method: "POST",
    headers,
    body,
  }) });
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sideEffects.dbWrites = 0;
  sideEffects.aiCalls = 0;
  sideEffects.quotaConsumed = 0;
  sideEffects.outboundSends = 0;
  process.env["META_APP_SECRET"] = SECRET;
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (String(input).includes("graph.facebook.com")) sideEffects.outboundSends += 1;
    return new Response("{}", { status: 200 });
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.restoreAllMocks();
});

describe("Meta webhook signature verification", () => {
  it("TEST 1 — valid signature is accepted and processed", async () => {
    const res = await postWebhook(BODY, signMetaPayload(BODY, SECRET));
    expect(res.status).toBe(200);
  });

  it("TEST 2 — invalid signature is rejected", async () => {
    const res = await postWebhook(BODY, `sha256=${"a".repeat(64)}`);
    expect(res.status).toBe(401);
  });

  it("TEST 3 — missing signature is rejected", async () => {
    const res = await postWebhook(BODY, null);
    expect(res.status).toBe(401);
  });

  it("TEST 4 — malformed signature is rejected", async () => {
    expect((await postWebhook(BODY, "not-a-signature")).status).toBe(401);
    expect((await postWebhook(BODY, "sha256=zz")).status).toBe(401);
  });

  it("TEST 5/6/7/8 — rejected request causes no DB write, AI call, quota use or outbound send", async () => {
    await postWebhook(BODY, `sha256=${"b".repeat(64)}`);
    expect(sideEffects.dbWrites).toBe(0);
    expect(sideEffects.aiCalls).toBe(0);
    expect(sideEffects.quotaConsumed).toBe(0);
    expect(sideEffects.outboundSends).toBe(0);
  });

  it("missing app secret rejects rather than processing unverified payloads", async () => {
    delete process.env["META_APP_SECRET"];
    const res = await postWebhook(BODY, signMetaPayload(BODY, SECRET));
    expect(res.status).toBe(401);
    expect(sideEffects.dbWrites).toBe(0);
  });

  it("tampered body invalidates a previously valid signature", async () => {
    const sig = signMetaPayload(BODY, SECRET);
    const res = await postWebhook(BODY.replace("Ali", "Eve"), sig);
    expect(res.status).toBe(401);
  });

  it("verifier reports precise, non-leaking reasons", () => {
    expect(verifyMetaSignature("x", null, SECRET)).toEqual({
      valid: false,
      reason: "missing_signature",
    });
    expect(verifyMetaSignature("x", "sha1=abc", SECRET)).toEqual({
      valid: false,
      reason: "malformed_signature",
    });
    expect(verifyMetaSignature("x", signMetaPayload("x", SECRET), undefined)).toEqual({
      valid: false,
      reason: "missing_secret",
    });
    expect(verifyMetaSignature("x", signMetaPayload("x", SECRET), SECRET)).toEqual({ valid: true });
  });
});

describe("access token confidentiality", () => {
  it("TEST 9/10 — client projection never requests access_token", () => {
    expect(WHATSAPP_CLIENT_COLUMNS).not.toContain("access_token");
    expect(WHATSAPP_CLIENT_COLUMNS).toContain("has_access_token");
  });

  it("TEST 14 — disconnect requests no projection back", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/whatsapp.ts", "utf8"),
    );
    const disconnect = src.slice(src.indexOf("export async function disconnectWhatsapp"));
    expect(disconnect).not.toContain(".select(");
  });

  it("settings page never renders a stored token into browser state", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("src/routes/_authenticated/settings/whatsapp.tsx", "utf8"),
    );
    expect(src).not.toContain("config.access_token");
  });
});
