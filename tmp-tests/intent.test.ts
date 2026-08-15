import { expect, test } from "vitest";
import { detectUmrahIntent } from "../src/lib/sales-intent.core";
const cases: [string,string][] = [
["Nak tempah pakej umrah","UMRAH_PACKAGE_PURCHASE"],
["Saya nak tempah pakej baru","UMRAH_PACKAGE_PURCHASE"],
["Berapa harga pakej umrah?","UMRAH_PACKAGE_PRICE_ENQUIRY"],
["Saya nak pergi umrah bulan 12","UMRAH_TRAVEL_ENQUIRY"],
["Ada pakej untuk keluarga?","UMRAH_PACKAGE_ENQUIRY"],
["Boleh saya booking sekarang?","BOOKING_INTENT"],
["Saya nak tahu pakej yang ada","UMRAH_PACKAGE_ENQUIRY"],
["Saya nak umrah untuk 4 orang","UMRAH_PACKAGE_ENQUIRY"],
["Macam mana nak buat tempahan?","BOOKING_INTENT"],
];
test("intents", () => { for (const [t,e] of cases) expect([t,detectUmrahIntent(t)]).toEqual([t,e]); });
