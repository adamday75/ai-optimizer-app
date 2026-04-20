# AI Optimizer v2.1.3 Release Notes

## Summary
v2.1.3 is a stability and usability release focused on making the desktop install flow behave the way users expect.

## What changed

### 1. UI-saved API key now takes precedence
The proxy now prefers the API key saved through the desktop app UI before checking developer fallbacks.

New lookup order:
1. Electron userData key saved from the UI
2. `OPENAI_API_KEY` environment variable (developer / standalone fallback)
3. repo-local `api-key.json` (developer fallback)

Why this matters:
- prevents stale dev keys from overriding the user's real saved key
- reduces confusing "saved in UI but requests still fail" behavior
- makes the install flow cleaner for normal customers

### 2. Cache TTL is now configurable
The proxy cache TTL is no longer hardcoded to 5 minutes.

New environment variables:
- `AI_OPTIMIZER_CACHE_TTL_SECONDS`
- `AI_OPTIMIZER_CACHE_CHECK_PERIOD_SECONDS`

Defaults remain:
- TTL: 300 seconds
- cleanup check period: 60 seconds

Why this matters:
- supports controlled testing for cron-style workflows
- lets us experiment with longer cache windows without code edits
- useful for proving cost-saving behavior in repeated request patterns

## Recommended user-facing positioning
This release improves reliability for the normal desktop user flow.

Users should:
- install the app
- enter their OpenAI API key in the UI
- save it
- start the proxy

They should not need to manually edit `.env` for normal product usage.

## Validation checklist
- [ ] Install app
- [ ] Enter API key in UI
- [ ] Save API key
- [ ] Start proxy
- [ ] Make a test OpenAI request
- [ ] Confirm the UI-saved key is used successfully
- [ ] Confirm `/stats` responds normally
- [ ] Optionally test custom cache TTL with env vars

## Suggested tag/version
- `v2.1.3`
