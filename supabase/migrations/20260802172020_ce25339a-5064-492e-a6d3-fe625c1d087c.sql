
CREATE TYPE public.lead_stage AS ENUM ('new','contacted','qualified','proposal','booked','lost');
CREATE TYPE public.channel AS ENUM ('whatsapp','web','manual');
CREATE TYPE public.msg_sender AS ENUM ('customer','ai','human');
CREATE TYPE public.followup_status AS ENUM ('pending','sent','skipped','failed');

CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  hotel_makkah text,
  hotel_madinah text,
  star_rating int NOT NULL DEFAULT 4,
  nights int NOT NULL DEFAULT 12,
  departure_date date,
  airline text,
  price_myr numeric(12,2) NOT NULL DEFAULT 0,
  inclusions text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  source text NOT NULL DEFAULT 'whatsapp',
  stage public.lead_stage NOT NULL DEFAULT 'new',
  score int NOT NULL DEFAULT 0,
  budget_myr numeric(12,2),
  pax int NOT NULL DEFAULT 1,
  preferred_month text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  channel public.channel NOT NULL DEFAULT 'whatsapp',
  external_id text,
  status text NOT NULL DEFAULT 'open',
  ai_enabled boolean NOT NULL DEFAULT true,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender public.msg_sender NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  pax int NOT NULL DEFAULT 1,
  amount_myr numeric(12,2) NOT NULL DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.followup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Follow up',
  channel public.channel NOT NULL DEFAULT 'whatsapp',
  run_at timestamptz NOT NULL DEFAULT now(),
  status public.followup_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'ai',
  action text NOT NULL,
  entity text,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followup_jobs TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.packages, public.leads, public.conversations, public.messages, public.bookings, public.followup_jobs, public.activity_log TO service_role;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage packages" ON public.packages FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "agency members manage leads" ON public.leads FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "agency members manage conversations" ON public.conversations FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "agency members manage messages" ON public.messages FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "agency members manage bookings" ON public.bookings FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "agency members manage followups" ON public.followup_jobs FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());
CREATE POLICY "agency members view activity" ON public.activity_log FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());
CREATE POLICY "agency members write activity" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());

CREATE INDEX ON public.leads (agency_id, created_at DESC);
CREATE INDEX ON public.conversations (agency_id, last_message_at DESC);
CREATE INDEX ON public.bookings (agency_id, created_at DESC);
CREATE INDEX ON public.followup_jobs (agency_id, run_at);
CREATE INDEX ON public.activity_log (agency_id, created_at DESC);

CREATE TRIGGER packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Demo data for existing agencies
INSERT INTO public.packages (agency_id, name, hotel_makkah, hotel_madinah, star_rating, nights, departure_date, airline, price_myr, inclusions)
SELECT a.id, p.name, p.hm, p.hd, p.stars, p.nights, p.dep::date, p.airline, p.price, p.inc
FROM public.agencies a
CROSS JOIN (VALUES
  ('Umrah Ekonomi 12 Hari','Swissotel Al Maqam','Frontel Al Harithia',4,12,'2026-09-14','Malaysia Airlines',9800,ARRAY['Visa','Penerbangan','Ziarah']),
  ('Umrah Premium 14 Hari','Fairmont Clock Royal Tower','Anwar Al Madinah Movenpick',5,14,'2026-10-02','Saudia',15900,ARRAY['Visa','Penerbangan','Ziarah','Mutawwif']),
  ('Umrah Ramadan 15 Hari','Hilton Suites Makkah','Dar Al Taqwa',5,15,'2027-02-20','Qatar Airways',18500,ARRAY['Visa','Penerbangan','Iftar','Ziarah'])
) AS p(name,hm,hd,stars,nights,dep,airline,price,inc);

INSERT INTO public.leads (agency_id, full_name, phone, source, stage, score, budget_myr, pax, preferred_month, last_contact_at, created_at)
SELECT a.id, l.nm, l.ph, l.src, l.stage::public.lead_stage, l.score, l.budget, l.pax, l.month, now() - (l.hrs || ' hours')::interval, now() - (l.age || ' hours')::interval
FROM public.agencies a
CROSS JOIN (VALUES
  ('Nurul Aisyah binti Rahman','+60122456781','whatsapp','qualified',88,12000,2,'September',2,3),
  ('Mohd Faizal bin Osman','+60133456782','whatsapp','new',54,9000,1,'October',1,1),
  ('Siti Khadijah Ismail','+60146456783','instagram','proposal',92,32000,4,'Ramadan',4,5),
  ('Ahmad Zulkifli','+60127456784','whatsapp','booked',96,19000,2,'October',20,60),
  ('Hafizah Yusof','+60195456785','web','contacted',71,15000,2,'December',6,26),
  ('Rosli bin Hamid','+60112456786','whatsapp','new',48,8000,1,'January',3,2),
  ('Norhayati Abdullah','+60175456787','referral','qualified',84,22000,3,'Ramadan',9,50),
  ('Zainal Abidin','+60138456788','whatsapp','lost',22,6000,1,'March',72,120)
) AS l(nm,ph,src,stage,score,budget,pax,month,hrs,age);

INSERT INTO public.conversations (agency_id, lead_id, channel, status, ai_enabled, last_message_at, created_at)
SELECT l.agency_id, l.id, 'whatsapp', CASE WHEN l.stage IN ('lost','booked') THEN 'closed' ELSE 'open' END, true,
       l.last_contact_at, l.created_at
FROM public.leads l;

INSERT INTO public.messages (agency_id, conversation_id, sender, body, created_at)
SELECT c.agency_id, c.id, m.sender::public.msg_sender, m.body, c.last_message_at - (m.off || ' minutes')::interval
FROM public.conversations c
CROSS JOIN (VALUES
  ('customer','Assalamualaikum, nak tanya pakej umrah bulan depan ada?',9),
  ('ai','Waalaikumussalam! Ada — pakej 12 hari bermula RM9,800 termasuk visa & penerbangan. Berapa orang ya?',7),
  ('customer','2 orang. Boleh hantar detail?',5),
  ('ai','Baik, saya hantar butiran pakej dan jadual bayaran sekarang.',3)
) AS m(sender,body,off);

INSERT INTO public.bookings (agency_id, lead_id, package_id, pax, amount_myr, deposit_paid, status, created_at)
SELECT l.agency_id, l.id, (SELECT p.id FROM public.packages p WHERE p.agency_id = l.agency_id LIMIT 1),
       l.pax, COALESCE(l.budget_myr,10000), true, 'confirmed', now() - (row_number() over (partition by l.agency_id) * 4 || ' days')::interval
FROM public.leads l WHERE l.stage = 'booked';

INSERT INTO public.bookings (agency_id, lead_id, package_id, pax, amount_myr, deposit_paid, status, created_at)
SELECT a.id, NULL, (SELECT p.id FROM public.packages p WHERE p.agency_id = a.id LIMIT 1), b.pax, b.amt, true, 'confirmed', now() - (b.d || ' days')::interval
FROM public.agencies a
CROSS JOIN (VALUES (2,19600,3),(4,39200,18),(2,31800,42),(3,29400,66),(2,19600,95),(5,49000,120),(2,18000,150)) AS b(pax,amt,d);

INSERT INTO public.followup_jobs (agency_id, lead_id, title, run_at, status)
SELECT l.agency_id, l.id, f.title, now() + (f.mins || ' minutes')::interval, f.st::public.followup_status
FROM public.leads l
JOIN (VALUES ('new','Hantar katalog pakej & harga',45,'pending'),
             ('qualified','Susulan deposit & slot penerbangan',180,'pending'),
             ('proposal','Panggilan penutupan tempahan',-60,'pending'),
             ('contacted','Semak minat & bajet pelanggan',1440,'pending'))
  AS f(stage,title,mins,st) ON f.stage = l.stage::text;

INSERT INTO public.activity_log (agency_id, actor, action, entity, created_at)
SELECT a.id, x.actor, x.action, x.entity, now() - (x.mins || ' minutes')::interval
FROM public.agencies a
CROSS JOIN (VALUES
  ('ai','Layan enquiry WhatsApp daripada Nurul Aisyah','conversation',6),
  ('ai','Cadang 3 pakej kepada Siti Khadijah','lead',38),
  ('ai','Kelayakan lead baharu: Mohd Faizal (skor 54)','lead',95),
  ('human','Sahkan tempahan Ahmad Zulkifli (RM19,000)','booking',220),
  ('ai','Jadualkan susulan automatik untuk 4 lead','followup',400),
  ('ai','Balas 12 mesej luar waktu pejabat','conversation',900)
) AS x(actor,action,entity,mins);
