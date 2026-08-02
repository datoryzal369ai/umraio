import { supabase } from "@/integrations/supabase/client";

export type WhatsappConfig = {
  id: string;
  agency_id: string;
  display_phone_number: string | null;
  phone_number_id: string | null;
  business_account_id: string | null;
  access_token: string | null;
  verify_token: string;
  is_connected: boolean;
  auto_reply: boolean;
  last_inbound_at: string | null;
};

export type WhatsappInput = {
  display_phone_number: string | null;
  phone_number_id: string | null;
  business_account_id: string | null;
  access_token: string | null;
  auto_reply: boolean;
};

const COLUMNS =
  "id, agency_id, display_phone_number, phone_number_id, business_account_id, access_token, verify_token, is_connected, auto_reply, last_inbound_at";

export async function fetchWhatsappConfig(): Promise<WhatsappConfig | null> {
  const { data, error } = await supabase
    .from("whatsapp_configs")
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as WhatsappConfig | null) ?? null;
}

export async function saveWhatsappConfig(
  agencyId: string,
  existingId: string | null,
  input: WhatsappInput,
): Promise<WhatsappConfig> {
  const isConnected = Boolean(input.phone_number_id && input.access_token);
  if (existingId) {
    const { data, error } = await supabase
      .from("whatsapp_configs")
      .update({ ...input, is_connected: isConnected })
      .eq("id", existingId)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data as WhatsappConfig;
  }
  const { data, error } = await supabase
    .from("whatsapp_configs")
    .insert({ ...input, agency_id: agencyId, is_connected: isConnected })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as WhatsappConfig;
}

export async function disconnectWhatsapp(id: string) {
  const { error } = await supabase
    .from("whatsapp_configs")
    .update({ is_connected: false, access_token: null })
    .eq("id", id);
  if (error) throw error;
}
