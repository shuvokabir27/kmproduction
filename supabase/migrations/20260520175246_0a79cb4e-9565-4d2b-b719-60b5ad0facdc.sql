INSERT INTO public.feature_flags (key, enabled)
VALUES ('weather_widget', true)
ON CONFLICT (key) DO NOTHING;