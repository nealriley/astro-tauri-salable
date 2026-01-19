#!/bin/bash
# Run Tauri in headless mode (without starting Astro dev server)
# Uses TAURI_DEV_HOST env var or defaults to localhost

HOST="${TAURI_DEV_HOST:-localhost}"
PORT="${TAURI_DEV_PORT:-4321}"

exec tauri dev -c "{\"build\":{\"beforeDevCommand\":\"\",\"devUrl\":\"http://${HOST}:${PORT}\"}}"
