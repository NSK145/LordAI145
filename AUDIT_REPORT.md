# LORD AI Project Audit

Audit date: 2026-06-24

## Architecture Summary

LORD AI is a TanStack Start + Vite + React 19 application with Capacitor wrappers for Android/iOS. The authenticated app is route-grouped under `src/routes/_authenticated`, with Supabase handling auth, profiles, settings, conversations, messages, and memories. AI requests stream through `src/routes/api/chat.ts`, which calls the Lovable AI gateway from server-only code. Voice activation is browser-based, using OpenWakeWord ONNX with a Web Speech fallback. UI is a custom HUD shell with reusable lord components and shadcn/Radix UI primitives.

Core data surfaces:

- Supabase: auth, profiles, user settings, conversations, chat messages, memories.
- Browser storage: study tests, productivity/task local state, some legacy local helpers.
- AI gateway: server route `/api/chat`, authenticated and Zod-validated.
- Voice: microphone, AudioWorklet, ONNX runtime, Web Speech fallback.
- Mobile: Capacitor runtime initialization and native plugin dependencies.

## Critical Issues Fixed

1. Build-breaking API middleware type mismatch

- Problem: `src/routes/api/chat.ts` used `requireSupabaseAuth`, a TanStack `function` middleware, as route `request` middleware. `npx tsc --noEmit` failed with `Type '"function"' is not assignable to type '"request"'`.
- Fix: Added shared auth extraction plus `requireSupabaseRequestAuth` in `src/integrations/supabase/auth-middleware.ts`, and changed `/api/chat` to use the request middleware.
- Result: TypeScript now passes.

2. Authenticated chat endpoint was unreachable from feature pages

- Problem: `/api/chat` requires a Supabase bearer token, but Chat, Study, Research, and Documents made requests without `Authorization`. Signed-in users would still hit 401/unauthorized for AI features.
- Fix: Added `src/lib/authenticated-fetch.ts` with `getSupabaseAuthHeaders()` and `authenticatedFetch()`. Wired `DefaultChatTransport` and manual streaming calls to include the current Supabase token.
- Result: The authenticated AI route now has matching authenticated clients.

3. Production-hostile debug logging

- Problem: Existing modified files logged auth lifecycle details, user email, token presence, settings payloads, and Supabase auth checks to the browser/server console.
- Fix: Removed the debug logging from `AppShell` and `user-settings.functions.ts`; retained only useful error logging.
- Result: Less sensitive operational data in logs, cleaner production behavior, and lint formatting restored.

4. Deprecated server function validator

- Problem: Build warned that `createServerFn().inputValidator()` is deprecated.
- Fix: Updated settings mutation to `createServerFn().validator()`.
- Result: Deprecation warning removed.

## Important Remaining Issues

1. Voice is wake detection only, not full voice assistant flow

- Evidence: `WakeWordProvider` sets a static reply after wake detection and tells the user to open Chat; it does not capture a post-wake command, call `/api/chat`, or speak the response.
- Impact: Voice recognition, AI responses, and TTS are not complete as an end-to-end voice assistant.
- Recommended fix: Add a short command-capture SpeechRecognition phase after wake, send transcript to `/api/chat`, stream the answer, and use `speechSynthesis` respecting `auto_speak` and `voice_rate`.

2. "Hey Lord" wake word is branded over a "hey_jarvis" model

- Evidence: `src/lib/voice/openwakeword-engine.ts` documents that "Hey Lord" is not in the pretrained model bank and defaults to `hey_jarvis_v0.1`.
- Impact: Wake accuracy will not match the displayed phrase and may confuse users.
- Recommended fix: Add a real `public/wake/hey_lord.onnx` model or change UI copy to reflect supported phrases.

3. Wake-word model payload is very large

- Evidence: production build emits `ort-wasm-simd-threaded...wasm` at about 26 MB raw and `ort.bundle.min...js` at about 401 KB.
- Impact: Slow first load on mobile and constrained networks, especially if voice code is pulled into the main shell path.
- Recommended fix: lazy-load the provider/engine only after the user enables voice, or isolate ONNX runtime into a voice-only route/chunk.

4. Settings are not fully applied

- Evidence: Settings stores `default_mode`, `voice_rate`, `auto_speak`, and `notifications_enabled`, but Chat initializes `mode` to `"balanced"` locally and Voice does not read saved speech settings.
- Impact: Saved preferences do not consistently change runtime behavior.
- Recommended fix: hydrate settings into app context and initialize Chat/Voice from those values.

5. Document Intelligence is incomplete for PDFs/DOCX

- Evidence: non-text uploads set a placeholder saying PDF/DOCX OCR is coming soon.
- Impact: The UI name suggests document intelligence, but only text-like files are actually parsed.
- Recommended fix: support PDF text extraction and DOCX parsing, or narrow accepted file types/copy until implemented.

6. Manual streaming parsers are duplicated

- Evidence: Study, Research, and Documents each parse AI SDK SSE chunks manually.
- Impact: Higher maintenance cost and inconsistent error handling.
- Recommended fix: extract one `streamLordResponse()` helper that checks `res.ok`, parses chunks, handles API error JSON, and supports aborting.

7. Some user-facing claims are stale or inconsistent

- Evidence: README says some voice capabilities are roadmap, while the app includes wake-word UI; Settings says memories and conversations are stored in the account, while some modules still use localStorage.
- Impact: Users and contributors get an inaccurate picture of feature maturity.
- Recommended fix: update README/settings copy to distinguish account-backed data from browser-only state.

## Minor Issues

1. Lint passes with 8 Fast Refresh warnings in mixed component/export files.

2. `src/integrations/supabase/client.ts` still logs Supabase client creation details. This is lower risk than auth payload logging, but should be quieted for production.

3. There are dual lockfiles (`package-lock.json` and `bun.lock`), which can cause package drift unless the team standardizes on npm or Bun.

4. `conversations.user_id` lacks an explicit `REFERENCES auth.users(id)` in the first migration, although RLS still protects rows.

5. Several network features show generic `"Connection error."` messages and do not surface structured API errors to users.

6. The root metadata includes duplicated `description` entries and some Lovable/project boilerplate copy that does not match LORD AI.

## Security Notes

- API key handling is server-only for Lovable AI, which is good.
- Supabase RLS exists for conversations, messages, memories, profiles, and settings.
- The AI endpoint is authenticated after the fix, reducing credit-abuse risk.
- Client-side localStorage remains appropriate only for non-sensitive browser-local state; avoid storing secrets or highly sensitive memory there.

## Verification

Passed:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Notes:

- `npm run lint` passes with 8 Fast Refresh warnings and 0 errors.
- `npm run build` must be allowed to open a local preview server for TanStack prerendering. In the sandbox it failed with `listen EPERM`; outside the sandbox it completed and prerendered `/`.
- Production build still warns about large chunks, mainly from ONNX/runtime assets and the main app bundle.

## Recommended Next Fix Order

1. Complete the end-to-end voice command flow and make settings drive TTS.
2. Lazy-load or defer ONNX wake-word runtime to improve mobile performance.
3. Centralize AI streaming/error handling for Study, Research, and Documents.
4. Align settings/default chat mode behavior.
5. Update documentation and in-app copy to match actual shipped behavior.
6. Add focused tests around auth headers, chat persistence, and settings persistence.
