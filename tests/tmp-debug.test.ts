import { test } from "bun:test";
import { extractAgencyFacts, analyzeMeetConversation } from "@/lib/meet/b2b-executive.core";
test("d", () => {
for (const m of ["Enquiry banyak tapi team tak sempat follow-up.","My team can't reply fast enough on WhatsApp."]) {
  console.log(m, JSON.stringify(extractAgencyFacts([m])));
  console.log(analyzeMeetConversation([{role:"visitor",content:m}]).detectedGaps.map(g=>g.key));
}
});
