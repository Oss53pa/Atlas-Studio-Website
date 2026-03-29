-- Migration: add color, icon, highlights, pricing_period to apps table
-- Run this on existing Supabase instances

ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS pricing_period TEXT NOT NULL DEFAULT 'mois';
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#C8A960';
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'receipt';
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS highlights TEXT[] NOT NULL DEFAULT '{}';
