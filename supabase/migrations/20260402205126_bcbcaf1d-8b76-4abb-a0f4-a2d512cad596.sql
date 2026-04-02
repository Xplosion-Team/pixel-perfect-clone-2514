
CREATE TABLE public.custom_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lo NUMERIC NOT NULL DEFAULT 0,
  hi NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('onetime', 'monthly')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view custom costs"
  ON public.custom_costs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert custom costs"
  ON public.custom_costs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update custom costs"
  ON public.custom_costs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete custom costs"
  ON public.custom_costs FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_custom_costs_updated_at
  BEFORE UPDATE ON public.custom_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
