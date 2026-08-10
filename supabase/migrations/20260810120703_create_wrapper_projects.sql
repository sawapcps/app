/*
# Create wrapper projects table

1. New Tables
- `wrapper_projects` stores generated website-wrapper projects created from a URL.
- `id` is the unique project identifier.
- `name` is the app display name.
- `url` is the validated website URL to wrap.
- `platforms` stores requested target platforms as JSON.
- `status` tracks whether the project is ready to download.
- `created_at` records when the project was created.

2. Security
- Row Level Security is enabled.
- This first version is intentionally single-tenant and does not include sign-in, so the anonymous client can create and view the shared project list.
- Four explicit CRUD policies are provided for anon and authenticated roles.

3. Important Notes
- No destructive changes are made.
- Platform metadata is stored for the download center and can be expanded later with real build artifacts.
*/

CREATE TABLE IF NOT EXISTS public.wrapper_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  platforms jsonb NOT NULL DEFAULT '{"windows":true,"android":true,"macos":true}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wrapper_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view wrapper projects" ON public.wrapper_projects;
CREATE POLICY "Public can view wrapper projects"
  ON public.wrapper_projects FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can create wrapper projects" ON public.wrapper_projects;
CREATE POLICY "Public can create wrapper projects"
  ON public.wrapper_projects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update wrapper projects" ON public.wrapper_projects;
CREATE POLICY "Public can update wrapper projects"
  ON public.wrapper_projects FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete wrapper projects" ON public.wrapper_projects;
CREATE POLICY "Public can delete wrapper projects"
  ON public.wrapper_projects FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS wrapper_projects_created_at_idx
  ON public.wrapper_projects (created_at DESC);