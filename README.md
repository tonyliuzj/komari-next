# Komari-Next

Komari-Next is a modern frontend for the Komari monitoring project.  
It is built with **Next.js**, **TypeScript**, **Tailwind CSS** and **Shadcn UI** and packaged as a static site that can be used as a Komari theme.

> This repository contains only the frontend. You will need a running Komari backend instance for the UI to talk to. Or you can download the theme file and upload it through Komari's admin dashboard, this would be the recommanded way.

![demo](https://github.com/tonyliuzj/komari-next/blob/main/preview.png?raw=true)
![colour-theme](https://github.com/tonyliuzj/komari-next/blob/main/images/show-theme.png?raw=true)


[Demo](https://probes.top)

[Download theme file](https://github.com/tonyliuzj/komari-next/releases/latest/download/dist-release.zip)

## Features

- Real‑time dashboard for server and node status
- Instance detail pages with load and latency charts
- Node list and management views
- Internationalization (i18n) with `react-i18next`
- Responsive layout and dark mode using Shadcn + Tailwind CSS
- Theme packaging suitable for Komari's theme system
- **Extensive Customization Options:**
  - **6 Color Themes:** Default, Ocean, Sunset, Forest, Midnight, Rose
  - **4 Card Layouts:** Classic, Modern, Minimal, Detailed - each with unique visual designs and element positioning
  - **4 Graph Designs:** Circle, Progress Bar, Bar Chart, Minimal - all following the selected color theme
  - **Customizable Status Cards:** Show/hide individual metrics on the dashboard
  - All settings persist locally and sync across theme changes

## Tech Stack

- **Framework:** Next.js (App Router, static export)
- **Language:** TypeScript, React
- **UI:** Shadcn UI + Radix UI primitives, Tailwind CSS v4
- **Charts:** Recharts
- **State / Data:** Custom contexts, RPC2 client, fetch-based APIs

## Prerequisites

- **Node.js** 22 or newer (LTS recommended)
- A running **Komari backend** (API) reachable from the browser

## Getting Started

- Simply [download theme file](https://github.com/tonyliuzj/komari-next/releases/latest/download/dist-release.zip) and upload it through Komari's admin dashboard, this would be the recommanded way.

## Dev

Clone this repository and install dependencies:

```bash
npm install
```

### Configure API target

The frontend talks to the Komari backend via `/api/*` rewrites configured in `next.config.ts`.  
Set the backend base URL using `NEXT_PUBLIC_API_TARGET`:

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_TARGET=http://127.0.0.1:25774
```

Adjust the URL to point to your Komari backend instance.

### Run in development

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Build for production / theme packaging

This project is configured for static export (`output: "export"` in `next.config.ts`), with the build output written to `dist/`.

```bash
npm run build
```

After the build completes:

- Serve the `dist` directory with any static web server, **or**
- Use the contents of `dist` as part of a Komari theme bundle.

## Theme Development

This repository is designed to be used as a custom Komari theme.

1. Configure and customize the UI as needed.
2. Edit `komari-theme.json` to match your theme’s metadata and settings.
3. Build the project:

   ```bash
   npm run build
   ```

4. The static assets will be generated in the `dist` directory.  
   Combine them with `komari-theme.json` as required by Komari’s theme system and package them according to the Komari documentation.

## Scripts

- `npm run dev` – Start the Next.js development server
- `npm run build` – Build the static site into `dist/`
- `npm run lint` – Run ESLint over the project

## Contributing

Contributions are welcome.  
If you find issues or have ideas for improvements, feel free to open an issue or submit a pull request.

