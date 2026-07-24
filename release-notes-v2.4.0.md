# AI Optimizer v2.4.0

AI Optimizer v2.4.0 adds **truthful partial prompt caching visibility for OpenAI** while keeping the local-first proxy workflow simple.

This release is about **honest proof**, not inflated claims.

## What’s new

- Added **OpenAI partial prompt caching visibility**
- Added **Partial Hits (OpenAI)** to the app stats
- Added **Tokens Reused (OpenAI)** to the app stats
- Kept **exact cache hits** working as before
- Updated app versioning and footer display to **v2.4.0**

## What this means

AI Optimizer can now surface when OpenAI actually reuses prompt tokens on the provider side.

If OpenAI reports real reused prompt tokens, AI Optimizer shows that clearly in the app.

If OpenAI does **not** report reused prompt tokens, AI Optimizer does **not** fake a partial hit.

That means:

- **Exact Cache Hits** = repeated requests fully served from local cache
- **Partial Hits (OpenAI)** = OpenAI reported real provider-side reused prompt tokens
- **Tokens Reused (OpenAI)** = total reused prompt tokens reported by OpenAI

## Why this matters

A lot of products would be tempted to overstate this feature.

v2.4.0 does the opposite.

This release is designed so that partial prompt caching stats only move when there is **real evidence from OpenAI**. That makes the product more trustworthy for developers, agents, scripts, automations, and recurring workflows where cost visibility actually matters.

## Current scope

- **OpenAI** remains the strongest and broadest lane
- **Anthropic** support remains focused on chat completions
- **Google Gemini** support remains intentionally narrower around supported chat-completions style workflows
- One active provider at a time
- No fake cross-provider parity

## Best fit

AI Optimizer works best for:

- repeat-heavy scripts
- agent workflows
- cron jobs
- automations
- local tools that send repeated or similar requests

## Notes

- Partial prompt caching visibility in this release is **OpenAI-only**
- Highly dynamic requests may not benefit much from caching
- Windows may ask for local firewall permission because AI Optimizer runs a local proxy on `localhost:3000`

## Downloads

Includes updated builds for:

- macOS
- Windows
- Linux
