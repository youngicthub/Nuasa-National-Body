---
name: Lovable migration CSS fix
description: Lovable apps put @import before @tailwind in index.css; the copy script doesn't fix this ordering.
---

Lovable apps' index.css typically has:
1. @tailwind base/components/utilities at the top
2. @import url(...) for Google Fonts below

PostCSS (Tailwind v3) requires @import to come before any @tailwind directives. The copy script preserves this broken order. Always move @import above @tailwind after copying.

**Why:** PostCSS throws "[postcss] @import must precede all other statements" at runtime, breaking styles.

**How to apply:** After running fullstack_copy_frontend.sh for a Lovable app, always check index.css and move any @import lines above the @tailwind directives.
