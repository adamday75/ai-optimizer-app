#!/bin/bash
# Simulates a cron job that checks status every 5 minutes
# Same prompt every time = perfect for caching!

curl -s http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{
      "role": "user",
      "content": "Daily status check: Is the system running? Respond with: SYSTEM OK"
    }]'
