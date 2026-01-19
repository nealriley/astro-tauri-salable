# CloudVault - Astro + Tauri + Salable Demo

A demo application showcasing how to build a cross-platform desktop app with subscription billing using:

- **[Astro](https://astro.build)** - Fast, modern web framework with SSR
- **[Tauri](https://v2.tauri.app)** - Native desktop app wrapper (Rust-based)
- **[Salable](https://salable.app)** - Subscription & licensing management
- **[React](https://react.dev)** - UI components
- **[Tailwind CSS](https://tailwindcss.com)** - Styling

## Features

- Landing page with signup/login flow
- Feature-gated dashboard based on subscription tier
- Pricing page with Stripe checkout integration
- Works as both a web app and native desktop app
- Three subscription tiers: Free, Pro, Business

## Prerequisites

- **Node.js** 18+ 
- **Rust** (for Tauri) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Tauri prerequisites** - [Platform-specific dependencies](https://v2.tauri.app/start/prerequisites/)
- **Salable account** - [Sign up at beta.salable.app](https://beta.salable.app)

### Linux Dependencies (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libglib2.0-dev \
  libcairo2-dev \
  libpango1.0-dev \
  libatk1.0-dev \
  libgdk-pixbuf-2.0-dev
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and add your Salable API key:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Get your API key from https://beta.salable.app -> Settings -> API Keys
SALABLE_API_KEY=your_api_key_here

# Your Salable Product ID
SALABLE_PRODUCT_ID=your_product_id

# Plan IDs from your Salable dashboard
SALABLE_PLAN_FREE=your_free_plan_id
SALABLE_PLAN_PRO=your_pro_plan_id
SALABLE_PLAN_BUSINESS=your_business_plan_id
```

### 3. Run the Application

#### Web Development (Astro only)

```bash
npm run dev
```

Opens at http://localhost:4321

#### Desktop Development (Tauri + Astro)

```bash
npm run tauri:dev:local    # Both Astro server + Tauri app (localhost)
npm run tauri:dev          # Uses devUrl from tauri.conf.json
```

#### Headless Mode (Tauri connects to remote Astro server)

Useful when running Astro on a different machine:

```bash
# Set the remote host
export TAURI_DEV_HOST=your-server-hostname

# Run Tauri without starting local Astro
npm run tauri:dev:headless
```

### 4. Build for Production

```bash
npm run tauri:build
```

Outputs native binaries to `src-tauri/target/release/bundle/`

## Project Structure

```
/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Astro pages & API routes
│   │   ├── api/        # Server-side API endpoints
│   │   ├── index.astro # Dashboard
│   │   └── pricing.astro
│   ├── lib/            # Utilities (Tauri bridge, user management)
│   └── layouts/        # Page layouts
├── src-tauri/          # Tauri (Rust) configuration
│   ├── src/            # Rust source code
│   ├── tauri.conf.json # Tauri configuration
│   └── Cargo.toml      # Rust dependencies
├── scripts/            # Helper scripts
├── .env.example        # Environment template
└── salable-product-config.json  # Product configuration template
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro dev server (web only) |
| `npm run tauri:dev` | Start Tauri + Astro together |
| `npm run tauri:dev:local` | Tauri + Astro with localhost URL |
| `npm run tauri:dev:headless` | Tauri only (connects to remote Astro) |
| `npm run tauri:build` | Build native desktop app |
| `npm run build` | Build Astro for production |
| `npm run preview` | Preview production Astro build |

## Setting Up Salable

This project uses Salable for subscription management. You have two options to set up your product:

### Option A: Use AI Agent (Recommended)

The `SALABLE_BETA_CLIENT_AGENT.md` file contains comprehensive instructions for AI coding assistants (Claude, GPT, etc.) to help you create and manage your Salable product.

Simply ask your AI assistant:
> "Use the instructions in SALABLE_BETA_CLIENT_AGENT.md to create a product similar to the one defined in salable-product-config.json"

The agent will:
1. Check for existing entitlements
2. Create any missing entitlements
3. Create the product
4. Create plans with correct entitlements and pricing

### Option B: Import Configuration Manually

Use the `salable-product-config.json` as a reference to create your product in the [Salable Beta UI](https://beta.salable.app):

```json
{
  "product": { "name": "CloudVault" },
  "entitlements": [
    "basic_storage",
    "file_sharing", 
    "advanced_sync",
    "priority_support",
    "team_folders",
    "admin_console"
  ],
  "plans": [
    { "name": "Free", "price": "$0/mo", "entitlements": ["basic_storage", "file_sharing"] },
    { "name": "Pro", "price": "$9/mo", "entitlements": ["...all above + advanced_sync, priority_support"] },
    { "name": "Business", "price": "$29/mo", "entitlements": ["...all above + team_folders, admin_console"] }
  ]
}
```

### Option C: Use the API Directly

Follow the build order in `SALABLE_BETA_CLIENT_AGENT.md`:

1. **Create entitlements** (org-level, reusable)
2. **Create product**
3. **Create plans** via `/api/plans/save` with entitlements and line items

## How It Works

### Authentication Flow

1. User enters username on landing page
2. App checks if user has existing subscription via `/api/user/status.json`
3. If subscription exists: redirect to dashboard
4. If no subscription: redirect to Stripe checkout for free tier

### Entitlement Checking

The app uses Salable's entitlement system to gate features:

```typescript
// Check if user has access to a feature
const response = await fetch(`/api/entitlements/check.json?granteeId=${username}`);
const { entitlements } = await response.json();

const hasFeature = entitlements.some(e => e.value === 'advanced_sync');
```

### Tauri Integration

When running as a desktop app, Tauri provides:
- Native window management
- System username detection
- Access to filesystem and OS APIs

The app detects its environment and adapts accordingly:

```typescript
import { isTauriEnvironment, getUsername } from '@/lib/tauri';

if (isTauriEnvironment()) {
  const systemUser = await getUsername();
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SALABLE_API_KEY` | Your Salable API key | Yes |
| `SALABLE_PRODUCT_ID` | Your product ID | Yes |
| `SALABLE_PLAN_FREE` | Free plan ID | Yes |
| `SALABLE_PLAN_PRO` | Pro plan ID | Yes |
| `SALABLE_PLAN_BUSINESS` | Business plan ID | Yes |
| `DEMO_USERNAME` | Default username for testing | No |
| `TAURI_DEV_HOST` | Remote Astro server hostname (headless mode) | No |

## Tauri Configuration

The `src-tauri/tauri.conf.json` controls the desktop app behavior:

- `build.devUrl` - URL of Astro server during development
- `build.frontendDist` - Path to built Astro files for production
- `app.windows` - Window size, title, and behavior

For remote development (Astro on different machine):

```json
{
  "build": {
    "devUrl": "http://your-server:4321"
  }
}
```

## Resources

- [Tauri v2 Documentation](https://v2.tauri.app)
- [Astro Documentation](https://docs.astro.build)
- [Salable Beta](https://beta.salable.app)
- [Salable Agent Instructions](./SALABLE_BETA_CLIENT_AGENT.md)

## License

MIT
