-- Migration: Add icon and color columns to categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '📦',
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#8b5cf6';
