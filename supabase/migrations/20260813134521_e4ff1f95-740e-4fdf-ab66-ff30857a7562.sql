-- 1. Knowledge category extension (must be added before use elsewhere)
ALTER TYPE public.kb_category ADD VALUE IF NOT EXISTS 'islamic_guidance';

-- 2. Islamic policy store
CREATE TABLE public.islamic_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  code text NOT NULL,
  principle text NOT NULL,
  rule_text text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('PRODUCT','MARKETING','COMMUNICATION','TRANSACTION','CUSTOMER_INTERACTION','OPERATIONS')),
  severity text NOT NULL CHECK (severity IN ('INFO','CAUTION','REVIEW_REQUIRED','BLOCK')),
  match_patterns text[] NOT NULL DEFAULT '{}',
  source text NOT NULL,
  authority text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  requires_human_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX islamic_policies_code_version_scope
  ON public.islamic_policies (COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), code, version);
CREATE INDEX islamic_policies_lookup
  ON public.islamic_policies (scope, is_active);

GRANT SELECT ON public.islamic_policies TO authenticated;
GRANT ALL ON public.islamic_policies TO service_role;

ALTER TABLE public.islamic_policies ENABLE ROW LEVEL SECURITY;

-- Read-only for agency members: platform (global) policies + their own agency's.
-- No INSERT/UPDATE/DELETE policy exists: writes are server-side (service_role) only.
CREATE POLICY "Agency members read platform and own policies"
  ON public.islamic_policies FOR SELECT TO authenticated
  USING (agency_id IS NULL OR agency_id = private.current_agency_id());

CREATE TRIGGER islamic_policies_updated_at
  BEFORE UPDATE ON public.islamic_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Halal baseline on packages (conservative default: nothing is assumed reviewed)
ALTER TABLE public.packages
  ADD COLUMN halal_review_status text NOT NULL DEFAULT 'NOT_REVIEWED'
    CHECK (halal_review_status IN ('NOT_REVIEWED','REVIEW_REQUIRED','REVIEWED','REJECTED')),
  ADD COLUMN islamic_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN halal_reviewed_at timestamptz,
  ADD COLUMN halal_reviewed_by uuid REFERENCES auth.users(id);

-- 4. Source / authority metadata on the EXISTING knowledge repository
ALTER TABLE public.knowledge_articles
  ADD COLUMN source text,
  ADD COLUMN authority text,
  ADD COLUMN reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN version integer NOT NULL DEFAULT 1;

-- 5. Platform governance policies (UMRAIO's own operating rules, not religious rulings)
INSERT INTO public.islamic_policies
  (agency_id, code, principle, rule_text, scope, severity, match_patterns, source, authority, version, requires_human_review)
VALUES
  (NULL, 'IIL-001',
   'Certification claims must be evidence-backed',
   'Do not state or imply that a package, service or the agency is halal-certified, Shariah-certified or JAKIM-certified unless a verified certification record exists in the system.',
   'MARKETING', 'BLOCK',
   ARRAY['jakim certified','jakim-certified','disahkan jakim','halal certified','halal-certified','shariah certified','syariah certified','shariah approved','certified halal','sijil halal'],
   'UMRAIO® Islamic Implementation Layer™ — platform governance rule set v1',
   'UMRAIO® Platform Governance', 1, true),

  (NULL, 'IIL-002',
   'No absolute religious guarantees',
   'Absolute religious guarantees (for example "100% halal", "guaranteed mabrur", "fully Shariah compliant") require verified evidence and qualified human review before publication.',
   'MARKETING', 'REVIEW_REQUIRED',
   ARRAY['100% halal','100 percent halal','fully shariah compliant','100% shariah','guaranteed mabrur','dijamin mabrur','pasti halal','100% patuh syariah'],
   'UMRAIO® Islamic Implementation Layer™ — platform governance rule set v1',
   'UMRAIO® Platform Governance', 1, true),

  (NULL, 'IIL-003',
   'Religious authority boundary',
   'UMRAIO is not a mufti, Islamic scholar or Shariah authority and must not issue fatwa or definitive religious rulings. Matters requiring qualified religious judgement are routed for expert human review.',
   'CUSTOMER_INTERACTION', 'REVIEW_REQUIRED',
   ARRAY['fatwa','hukum','halal atau haram','wajib','makruh','sah atau tidak sah','patuh syariah','religious ruling','islamic ruling'],
   'UMRAIO® Islamic Implementation Layer™ — platform governance rule set v1',
   'UMRAIO® Platform Governance', 1, true),

  (NULL, 'IIL-004',
   'Halal baseline transparency',
   'A package whose halal review status is not REVIEWED must never be presented as religiously verified. Unknown status means review required — it means neither halal nor haram.',
   'PRODUCT', 'REVIEW_REQUIRED',
   ARRAY['halal','syariah','shariah','religiously approved','disahkan halal'],
   'UMRAIO® Islamic Implementation Layer™ — platform governance rule set v1',
   'UMRAIO® Platform Governance', 1, true),

  (NULL, 'IIL-005',
   'Financing and payment claims',
   'Payment, instalment or financing arrangements must not be described as Islamic, riba-free or Shariah-compliant without a verified basis recorded in the system.',
   'TRANSACTION', 'CAUTION',
   ARRAY['riba','riba-free','bebas riba','islamic financing','pembiayaan islamik','shariah compliant financing'],
   'UMRAIO® Islamic Implementation Layer™ — platform governance rule set v1',
   'UMRAIO® Platform Governance', 1, true);