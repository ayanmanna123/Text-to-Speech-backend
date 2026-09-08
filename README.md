# NeuralVoice Studio - Backend API Service

A robust, enterprise-grade Node.js / Express REST API backend powering the **NeuralVoice Studio** AI Text-to-Speech platform. Features multi-provider speech synthesis (ElevenLabs, OpenAI, Google Cloud TTS), Supabase database persistence with Row-Level Security (RLS), voice sample preview caching (`tts_voice_previews`), and user character quota management.

---

## 🚀 Features

- **Multi-Provider TTS Engine**: Seamlessly synthesize text to speech using ElevenLabs, OpenAI Audio, or Google Cloud TTS with intelligent fallback streams.
- **Voice Sample Preview Caching**: Automatically generates and caches example voice previews in the `tts_voice_previews` database table to eliminate repeat generation latency and API costs.
- **User Usage & Quota Tracking**: Manages character credits per user tier (`free`, `pro`, `enterprise`) with automatic balance verification and logging.
- **Generation History & Storage**: Persists generated audio files to Supabase Storage and records metadata in `tts_generations`.
- **Row-Level Security (RLS)**: Enforces security rules at the database level for user profiles, generations, projects, usage logs, and voice previews.
- **Robust Input Validation & Error Handling**: Zod-based request validation and centralized API error formatting.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database & Storage**: Supabase (PostgreSQL, Supabase Storage)
- **Validation**: Zod
- **Logging**: Winston Logger + Morgan HTTP request logger
- **HTTP Client**: Native Node.js Fetch API

---

## 📁 Project Structure

```text
Text-to-Speech-backend/
├── src/
│   ├── config/          # Environment vars, Supabase client, Winston logger, constants
│   ├── controllers/     # Route request handlers (TTS, Voices, Usage)
│   ├── db/              # Database SQL schemas & migrations (schema.sql)
│   ├── middlewares/     # Auth, Zod validation, error handling, rate limiting
│   ├── providers/       # TTS Provider drivers (ElevenLabs, OpenAI, Google, Base)
│   ├── routes/          # Express route definitions (/tts, /voices, /usage)
│   ├── services/        # Core business logic (TTSService, VoiceService, UsageService, StorageService)
│   ├── utils/           # Helper functions (apiError, apiResponse, audioUtils, textUtils)
│   ├── validators/      # Zod validation schemas
│   ├── app.js           # Express app setup and middleware registration
│   └── server.js        # HTTP server entry point
├── .env.example         # Environment variable template
├── package.json         # Node.js dependencies and scripts
└── README.md            # Backend documentation
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root of `Text-to-Speech-backend/` based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5174

# Supabase Credentials
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# TTS Provider API Keys (Optional - Fallback audio streams used if missing)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_TTS_API_KEY=your-google-tts-api-key

DEFAULT_TTS_PROVIDER=google
```

---

## 🗄️ Database Setup (Supabase)

Execute the SQL script located in [`src/db/schema.sql`](file:///c:/Users/manna/Coding/Internship/Text-to-Speech/Text-to-Speech-backend/src/db/schema.sql) inside your Supabase **SQL Editor**:

```sql
-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.tts_profiles (...);

-- 2. Generations Table
CREATE TABLE IF NOT EXISTS public.tts_generations (...);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.tts_projects (...);

-- 4. Usage Logs Table
CREATE TABLE IF NOT EXISTS public.tts_usage_logs (...);

-- 5. Voice Previews Table (Cached Audio Samples)
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

-- Enable RLS and Policies
ALTER TABLE public.tts_voice_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for voice previews" ON public.tts_voice_previews FOR SELECT USING (true);
CREATE POLICY "Public insert access for voice previews" ON public.tts_voice_previews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for voice previews" ON public.tts_voice_previews FOR UPDATE USING (true);
```

---

## 📡 API Endpoints Reference

### 🎙️ Voices

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/voices` | `GET` | List available voices with optional query filters (`provider`, `gender`, `category`, `search`, `language`) |
| `/api/v1/voices/preview` | `POST` | Get or generate cached voice sample preview audio. Queries `tts_voice_previews` table first |

**POST `/api/v1/voices/preview` Request Body:**
```json
{
  "voiceId": "en-US-Neural2-F",
  "voiceName": "Neural US Female",
  "provider": "google",
  "sampleText": "Hello, I am Google Neural American Female voice."
}
```

### 🗣️ Text-to-Speech (TTS)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/tts/generate` | `POST` | Synthesize speech from text, deduct quota, upload audio to storage, and save generation record |
| `/api/v1/tts/history` | `GET` | Retrieve generation history list with pagination parameters (`limit`, `page`) |

**POST `/api/v1/tts/generate` Request Body:**
```json
{
  "text": "Welcome to NeuralVoice Studio! Experience natural AI speech synthesis.",
  "voiceId": "en-US-Neural2-F",
  "voiceName": "Neural US Female",
  "provider": "google",
  "format": "mp3",
  "settings": { "speed": 1.0 }
}
```

### 📊 Usage & Health

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/usage/balance` | `GET` | Fetch character quota balance, characters used, and account tier |
| `/health` | `GET` | Server health check endpoint |

---

## ⚡ Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Start Production Server**:
   ```bash
   npm start
   ```

The backend server runs on `http://localhost:5000/`.