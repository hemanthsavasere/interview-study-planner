# Fix Markdown Rendering — Design Spec

**Date:** 2026-07-09
**Status:** Approved
**Topic:** Install and configure @tailwindcss/typography so markdown notes render with proper styling

## Problem

Notes content is rendered by `ReactMarkdown` which produces correct HTML (h1, h2, p, li, code, etc.), but the `prose` classes in `NotesView.tsx:152` depend on `@tailwindcss/typography`, which was not installed. Without the plugin, the `prose` classes are no-ops — all markdown elements appear as unstyled plain text.

## Solution

Two changes:

1. **Install** `@tailwindcss/typography` as a dependency
2. **Register** the plugin in `src/index.css` by adding `@plugin "@tailwindcss/typography";` after the `@import "tailwindcss";` line

Tailwind CSS v4 uses CSS `@plugin` directives instead of `tailwind.config.ts` for plugin registration.

## Affected Code

| File | Change |
|------|--------|
| `package.json` | New dependency (auto-added by npm) |
| `src/index.css` | Add `@plugin "@tailwindcss/typography";` after `@import "tailwindcss";` |

No component changes needed — `NotesView.tsx` already has the correct `prose prose-sm dark:prose-invert max-w-none` wrapper.

## Testing

- Verify that `npm run typecheck` passes (no type errors from the install)
- Verify that `npm run build` succeeds (typography plugin loads correctly)
- Visual: open the Notes tab, verify headings/bullets/code blocks render with proper styling
