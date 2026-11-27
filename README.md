# PalBand

A Duolingo-style app that helps people increase their social frequency and build social courage.

Built with Vite + React + TypeScript + Tailwind CSS v4 (Nunito font, Duolingo green/blue/orange palette).

## Views

- Phone app: `/` - four tabs: Leaders / Match / Today / You
- Smartwatch: `/?view=watch` - circular watch UI (incoming 10s invite ring, or waiting/battle after inviting from the phone)

Tiers: Observer 👁 · Explorer ⛏ · Connector 🗣 · Socialite 🤝 · Magnet 🛰

## Run locally

```bash
pnpm install
pnpm dev
```

For deployments under a subpath, set `PUBLIC_BASE_URL` to the path without a trailing slash.

## Structure

- `src/App.tsx` - all phone + watch components and logic
- `src/index.css` - Tailwind import, theme colors, Nunito font
- `src/main.tsx` - React entry
- `index.html` - HTML shell
