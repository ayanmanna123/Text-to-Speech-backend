-- Supabase Schema for Text-to-Speech Application (Namespaced with tts_ prefix)

-- 1. TTS Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.tts_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    character_quota INTEGER DEFAULT 10000,
    characters_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TTS Generations Table (History of generated speech)
CREATE TABLE IF NOT EXISTS public.tts_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.tts_profiles(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    character_count INTEGER NOT NULL,
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    provider TEXT NOT NULL,
    audio_url TEXT,
    file_path TEXT,
    format TEXT DEFAULT 'mp3',
    duration_seconds INTEGER,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TTS Projects Table (Script documents & saved work)
CREATE TABLE IF NOT EXISTS public.tts_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.tts_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Script',
    description TEXT,
    script_blocks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TTS Usage Logs Table
CREATE TABLE IF NOT EXISTS public.tts_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.tts_profiles(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES public.tts_generations(id) ON DELETE SET NULL,
    characters_deducted INTEGER NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TTS Voice Previews Table (Cached example audio samples per voice)
CREATE TABLE IF NOT EXISTS public.tts_voice_previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_id TEXT UNIQUE NOT NULL,
    voice_name TEXT,
    provider TEXT NOT NULL,
    sample_text TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    file_path TEXT,
    format TEXT DEFAULT 'mp3',
    duration_seconds INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tts_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_voice_previews ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Idempotent with DROP POLICY IF EXISTS)
DROP POLICY IF EXISTS "Users can view own tts profile" ON public.tts_profiles;
CREATE POLICY "Users can view own tts profile" ON public.tts_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own tts profile" ON public.tts_profiles;
CREATE POLICY "Users can update own tts profile" ON public.tts_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own tts generations" ON public.tts_generations;
CREATE POLICY "Users can view own tts generations" ON public.tts_generations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tts generations" ON public.tts_generations;
CREATE POLICY "Users can insert own tts generations" ON public.tts_generations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tts projects" ON public.tts_projects;
CREATE POLICY "Users can manage own tts projects" ON public.tts_projects FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read access for voice previews" ON public.tts_voice_previews;
CREATE POLICY "Public read access for voice previews" ON public.tts_voice_previews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert access for voice previews" ON public.tts_voice_previews;
CREATE POLICY "Public insert access for voice previews" ON public.tts_voice_previews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access for voice previews" ON public.tts_voice_previews;
CREATE POLICY "Public update access for voice previews" ON public.tts_voice_previews FOR UPDATE USING (true);



