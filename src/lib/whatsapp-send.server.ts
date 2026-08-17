/**
 * Single outbound WhatsApp send path.
 *
 * Every automated outbound message (AI reply, follow-up dispatch, quotation
 * delivery) goes through here so credentials stay server-side and every send
 * is logged the same way.
 */
export async function sendWhatsappText(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
): Promise<boolean> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    // Meta error bodies never contain the token; safe to log verbatim.
    console.error(`[whatsapp] outbound send failed status=${res.status} body=${await res.text()}`);
    return false;
  }
  console.log(`[whatsapp] outbound send ok status=${res.status}`);
  return true;
}
