# UI/UX Modern Minimalist Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire ADSE Media Hub portal using a Modern Minimalist Light/Dark Mode bento layout with a blue & white primary theme and subtle yellow borders/outlines.

**Architecture:** Utilize Tailwind CSS v4 custom `@theme` variables driven by semantic CSS custom properties inside `globals.css`. Wrap component layouts with soft cards, crisp thin borders, and golden highlight states.

**Tech Stack:** Next.js 16.2.10, Tailwind CSS v4, Lucide React (or SVG icons), and React hooks.

## Global Constraints
- Do not break existing page functionality, sheet updates, API endpoint interfaces, or session authentication behavior.
- Ensure that transitions between light and dark modes are handled via CSS variable values responsive to system settings.
- Run `npm run lint` and `npm run build` at the end of each task to prevent regressions.

---

## Tasks

### Task 1: Theme Setup & Font configuration
**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update theme custom properties and font mappings in globals.css**
  Modify [globals.css](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/globals.css) to set up custom blue-white variables and Tailwind v4 mapping:
  ```css
  @import "tailwindcss";

  :root {
    --background: #f8fafc;
    --foreground: #0f172a;
    
    --card: #ffffff;
    --card-foreground: #0f172a;
    
    --muted: #f1f5f9;
    --muted-foreground: #64748b;
    
    --border: #e2e8f0; 
    
    --yellow-outline: #fef08a;
    --yellow-accent: #d97706;
    
    --primary: #1e40af;
    --primary-foreground: #ffffff;
    
    --accent: #3b82f6;
    --accent-foreground: #ffffff;
    
    --ring: #3b82f6;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: #0b0f19;
      --foreground: #f8fafc;
      
      --card: #111827;
      --card-foreground: #f8fafc;
      
      --muted: #1e293b;
      --muted-foreground: #94a3b8;
      
      --border: #1e293b;
      
      --yellow-outline: #fef08a;
      --yellow-accent: #fbbf24;
      
      --primary: #3b82f6;
      --primary-foreground: #0b0f19;
      
      --accent: #2563eb;
      --accent-foreground: #ffffff;
      
      --ring: #3b82f6;
    }
  }

  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--color-card-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-border: var(--border);
    --color-yellow-outline: var(--yellow-outline);
    --color-yellow-accent: var(--yellow-accent);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --font-sans: "Outfit", "Inter", sans-serif;
  }

  body {
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans), sans-serif;
  }
  ```

- [ ] **Step 2: Add Google Font (Outfit) loading in layout.tsx**
  Update [layout.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/layout.tsx):
  ```tsx
  import { Inter, Outfit } from "next/font/google";
  
  const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
  ```
  And apply it to the body tag: `<body className={`${outfit.variable} font-sans`}>`.

- [ ] **Step 3: Verify build**
  Run: `npm run build`
  Expected: Compile successfully.

---

### Task 2: Layout & Global Navigation Redesign
**Files:**
- Modify: `src/components/Layout/Header.tsx`
- Modify: `src/components/Layout/Sidebar.tsx`

- [ ] **Step 1: Redesign the Header component**
  In [Header.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/components/Layout/Header.tsx), apply a clean sticky header with a light/dark border bottom (`border-b border-border`) and modern layout spacing. Replace generic colored classes with `bg-card`, `text-card-foreground`, and `border-border`. Use subtle yellow outlines for interactive state indications.

- [ ] **Step 2: Redesign the Sidebar navigation component**
  In [Sidebar.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/components/Layout/Sidebar.tsx), style active menu items with a yellow accent left-border indicator, using a clean minimal typography scale. Let's view the file first to know its contents, then apply:
  - Base wrapper: `bg-card border-r border-border text-foreground`
  - Active state: `bg-muted text-primary border-l-4 border-yellow-accent`

- [ ] **Step 3: Run verify command**
  Run: `npm run lint`

---

### Task 3: Auth Pages UI (Login & Register)
**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Redesign Login page form container**
  Update [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28auth%29/login/page.tsx) with a minimalist aesthetic, bento-style card background (`bg-card`), crisp input border outlines that glow golden on focus, and clean layout margins.

- [ ] **Step 2: Redesign Register page form container**
  Update [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28auth%29/register/page.tsx) similarly with clear section groupings and the same minimalist light/dark variables.

- [ ] **Step 3: Verify build & lint**
  Run: `npm run build && npm run lint`

---

### Task 4: Dashboard Bento Grid Layout
**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Re-layout Dashboard Grid**
  Modify [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/dashboard/page.tsx):
  - Convert stats blocks and Quick Actions into a Bento-like grid layout using Tailwind's `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.
  - Update stat cards to use a subtle outline in `border-border hover:border-yellow-accent/40` and dynamic animations on hover (`hover:scale-[1.01] transition`).
  - Redesign metrics text styling and icon wrappers.

- [ ] **Step 2: Verify lint**
  Run: `npm run lint`

---

### Task 5: Notifications Page Bento Layout
**Files:**
- Modify: `src/app/(dashboard)/notifications/page.tsx`

- [ ] **Step 1: Style notifications list**
  In [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/notifications/page.tsx), convert the layout into a clean structured list with `bg-card`, thin separation lines, and subtle blue/yellow markers for unread notifications.

- [ ] **Step 2: Verify build**
  Run: `npm run build`

---

### Task 6: Requests Page Layout & Bento Forms
**Files:**
- Modify: `src/app/(dashboard)/requests/page.tsx`
- Modify: `src/app/(dashboard)/requests/new/page.tsx`

- [ ] **Step 1: Clean requests table grid**
  In [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/requests/page.tsx), style the table container with soft cards (`bg-card`), light borders, and color-coded status badges that blend nicely into light/dark settings.

- [ ] **Step 2: Stylize new request creation form**
  In [new/page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/requests/new/page.tsx), update input wrappers, focus highlights (golden outlines), and submit buttons.

---

### Task 7: Tasks Page & Creation Form Redesign
**Files:**
- Modify: `src/app/(dashboard)/tasks/page.tsx`
- Modify: `src/app/(dashboard)/tasks/new/page.tsx`

- [ ] **Step 1: Apply Bento layout to tasks board**
  In [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/tasks/page.tsx), format task list cards using modern structural frames with hover animations.

- [ ] **Step 2: Redesign task assignment form**
  In [new/page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/tasks/new/page.tsx), update form controls.

---

### Task 8: User Management Page Bento Grid
**Files:**
- Modify: `src/app/(dashboard)/users/page.tsx`

- [ ] **Step 1: Redesign User lists table**
  In [page.tsx](file:///D:/Ongoing%20Projects/ADSE%20Media%20Hub/src/app/%28dashboard%29/users/page.tsx), style rows and headers with clean layout scales, highlighting pending users in a soft yellow-amber warning state and approved users in clean blue.

- [ ] **Step 2: Final Verification**
  Run: `npm run lint && npm run build`
  Expected: Clean build with zero errors.
