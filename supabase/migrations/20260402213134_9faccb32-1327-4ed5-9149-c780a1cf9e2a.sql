
CREATE TABLE public.cac_ltv_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cac_ltv_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cac_ltv_assumptions" ON public.cac_ltv_assumptions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert cac_ltv_assumptions" ON public.cac_ltv_assumptions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update cac_ltv_assumptions" ON public.cac_ltv_assumptions FOR UPDATE TO public USING (true);

CREATE TRIGGER update_cac_ltv_assumptions_updated_at
  BEFORE UPDATE ON public.cac_ltv_assumptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default values
INSERT INTO public.cac_ltv_assumptions (key, value) VALUES
  ('patients', 100),
  ('rdRate', 40),
  ('rnRate', 45),
  ('maRate', 24),
  ('haRate', 16),
  ('rcRate', 4),
  ('rdHrs', 0.75),
  ('rnHrs', 0.50),
  ('maHrs', 0.75),
  ('billingPct', 4.5),
  ('revPt', 166),
  ('cacDevice', 150),
  ('cacMktg', 0),
  ('cacOnboard', 0),
  ('ltvMonths', 24),
  ('targetPts', 100),
  ('rampMo', 3),
  ('fixedCost', 2650);
