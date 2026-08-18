/**
 * UMRAIO® — browser-side Paddle bootstrap (Step 3H.2).
 *
 * The client token is publishable. It can only OPEN a checkout — it can never
 * grant entitlement, which is written exclusively by the verified webhook.
 */

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

declare global {
  interface Window {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

export function hasPaddleClientToken(): boolean {
  return Boolean(clientToken);
}

let paddleInitialized = false;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("Payments are not configured.");

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      const paddleJsEnvironment =
        getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(paddleJsEnvironment);
      window.Paddle.Initialize({ token: clientToken });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load the payment provider."));
    document.head.appendChild(script);
  });
}
