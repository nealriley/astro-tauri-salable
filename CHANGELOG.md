# Changelog

All notable changes to the CloudVault demo project.

## [0.1.0] - 2026-01-19

### Added

#### Development Infrastructure
- **Headless dev mode** (`npm run tauri:dev:headless`) - Run Tauri without starting local Astro server, connects to remote Astro instance
- **Local dev mode** (`npm run tauri:dev:local`) - Forces localhost:4321 regardless of tauri.conf.json
- **Helper script** (`scripts/tauri-headless.sh`) - Shell script for headless mode with environment variable support
- **Environment variables**:
  - `TAURI_DEV_HOST` - Configure remote Astro server hostname for headless mode
  - `TAURI_DEV_PORT` - Configure port (defaults to 4321)

#### Configuration
- **Product configuration export** (`salable-product-config.json`) - Portable JSON export of CloudVault product structure for easy replication
- **Environment template updates** (`.env.example`) - Added `TAURI_DEV_HOST` documentation

#### Documentation
- **Comprehensive README** - Complete rewrite with:
  - Prerequisites and platform-specific dependencies
  - Quick start guide
  - All available npm commands
  - Three methods for Salable setup (AI agent, manual, API)
  - Environment variable reference
  - Tauri configuration guidance
  - Project structure overview

#### User Management
- **Explicit logout tracking** - Added `isExplicitlyLoggedOut()` function to persist logout state across page refreshes in Tauri environment
- **Logout button** - Added to both Dashboard and PricingPage headers (visible in all modes, including Tauri)

### Changed

#### Authentication Flow
- **New user signup flow** - Users are now redirected to `/pricing` page to choose a plan instead of being sent directly to free tier checkout
- **Login validation** - Both "Get Started" and "Log In" now check if user has existing subscription before proceeding
- **Username persistence** - Username is stored in localStorage before any checkout redirect

#### Configuration
- **Dev URL** - Changed default `devUrl` in `tauri.conf.json` to `http://neals-mac-studio:4321` for remote development
- **Astro dev server** - Now runs with `--host` flag by default for network accessibility
- **Plan IDs** - Moved from hardcoded values to environment variables (`SALABLE_PLAN_FREE`, `SALABLE_PLAN_PRO`, `SALABLE_PLAN_BUSINESS`)

#### Components

##### `src/components/Dashboard.tsx`
- Added logout button (previously hidden in Tauri mode)
- Added check for `isExplicitlyLoggedOut()` before auto-login
- Removed `freePlanId` dependency from LandingPage usage

##### `src/components/PricingPage.tsx`
- Added logout button with `LogOut` icon
- Added `isTauri` state tracking
- Added `handleLogout` function
- Added check for `isExplicitlyLoggedOut()` before auto-login
- Removed `freePlanId` dependency from LandingPage usage

##### `src/components/LandingPage.tsx`
- Removed direct checkout redirect for new users
- New users now redirect to `/pricing?username=X`
- Removed `freePlanId` prop (no longer needed)
- Added `setStoredUser` import for username persistence
- Added loading state for login button

##### `src/lib/user.ts`
- Added `LOGGED_OUT_KEY` constant for tracking logout state
- Added `isExplicitlyLoggedOut()` function
- Updated `clearStoredUser()` to set logged out flag
- Updated `setStoredUser()` to clear logged out flag on login

##### `src/pages/index.astro` & `src/pages/pricing.astro`
- Updated to pass `planIds` object to components
- Plan IDs now read from environment variables via `import.meta.env`

### Fixed

- **Logout persistence** - Logout now persists across page refreshes in Tauri environment (previously Tauri would auto-login with system username on refresh)
- **Login flow** - Fixed issue where returning from checkout would not recognize the correct user
- **Username caching** - Username is now properly stored before checkout redirect

### Security

- **No secrets in source code** - Verified no API keys or credentials are committed
- **`.env` properly gitignored** - Real credentials stay local
- **`.env.example` contains only placeholders** - Safe for version control

---

## File Change Summary

| File | Changes |
|------|---------|
| `.env.example` | Added TAURI_DEV_HOST, updated plan ID placeholders |
| `README.md` | Complete rewrite with comprehensive documentation |
| `package.json` | Added dev scripts, updated dev command with --host |
| `salable-product-config.json` | New file - product configuration export |
| `scripts/tauri-headless.sh` | New file - headless mode helper script |
| `src-tauri/tauri.conf.json` | Updated devUrl for remote development |
| `src/components/Dashboard.tsx` | Added logout button, logout state checking |
| `src/components/LandingPage.tsx` | Changed signup flow to redirect to pricing |
| `src/components/PricingPage.tsx` | Added logout button, logout state checking |
| `src/lib/user.ts` | Added logout persistence tracking |
| `src/pages/index.astro` | Environment variable integration for plan IDs |
| `src/pages/pricing.astro` | Environment variable integration for plan IDs |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SALABLE_API_KEY` | Yes | Salable API key from beta.salable.app |
| `SALABLE_PRODUCT_ID` | Yes | Your Salable product ID |
| `SALABLE_PLAN_FREE` | Yes | Free plan ID |
| `SALABLE_PLAN_PRO` | Yes | Pro plan ID |
| `SALABLE_PLAN_BUSINESS` | Yes | Business plan ID |
| `DEMO_USERNAME` | No | Default username for testing |
| `TAURI_DEV_HOST` | No | Remote Astro server hostname (headless mode) |
| `TAURI_DEV_PORT` | No | Remote Astro server port (default: 4321) |

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Astro dev server with --host flag |
| `npm run build` | Build Astro for production |
| `npm run preview` | Preview production build |
| `npm run tauri:dev` | Start Tauri + Astro (uses tauri.conf.json devUrl) |
| `npm run tauri:dev:local` | Start Tauri + Astro with localhost:4321 |
| `npm run tauri:dev:headless` | Start Tauri only (connects to TAURI_DEV_HOST) |
| `npm run tauri:build` | Build native desktop application |
