-- Migration 02: add avatar_url to users for profile photos
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
