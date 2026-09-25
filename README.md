# Lyvor

A premium, India-first clothing storefront built as a lightweight static site. It includes a demo catalog, responsive shop, product options, search and filters, saved items, a persistent shopping bag, a COD checkout preview, and a Supabase integration for real accounts, orders, inventory, coupons, and protected store tools.

## What works before connecting services

You can browse the seeded collection, search and filter pieces, pick a colour and size, save favourites, keep a bag between refreshes, and complete a local checkout preview with Indian delivery fields and the sample coupon codes. Preview orders are saved only in your browser. The confirmation says **preview only**; no order reaches Lyvor or any fulfilment system until Supabase is configured.

Cash on delivery is the only payment method shown. No online card payment is implemented.

## Local setup

Requirements: Node.js 20 or later. There are no build-time dependencies.

```powershell
pnpm build
pnpm preview
```

Open the local preview URL printed by the command. Cart, saved items, and preview orders use this browser's local storage.

The checked-in `config.js` is an empty local default. For a configured local build, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your shell before `pnpm build`; the build writes them to `dist/config.js`. They are public browser values. The Supabase JavaScript client is loaded from esm.sh at runtime, so a network connection is needed for auth and database access.

## Supabase setup

1. Create a Supabase project on the free tier and keep its database password and service-role key private.
2. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql). The schema creates the tables, indexes, auth profile trigger, role checks, Row Level Security policies, secure order and cancellation functions, coupon validation, and transactional stock and total checks.
3. For local development, pass your **Project URL** and **anon/public key** through `SUPABASE_URL` and `SUPABASE_ANON_KEY` when building. Never put the service-role key in browser config.
4. In Supabase Authentication settings, set the Site URL to your deployed site and add the exact Pages origin and path to the allowed redirect URLs. Enable email confirmation for customer registration if desired. The seeded administrator is explicitly email-confirmed by the local seeding script.
5. Create the initial administrator from a trusted local PowerShell session. Enter the service-role key and initial password at hidden prompts so they remain in that session's environment only:

   ```powershell
   $env:SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
   $secureServiceKey = Read-Host 'Supabase service-role key' -AsSecureString
   $env:SUPABASE_SERVICE_ROLE_KEY = [System.Net.NetworkCredential]::new('', $secureServiceKey).Password
   $securePassword = Read-Host 'Initial administrator password' -AsSecureString
   $env:ADMIN_INITIAL_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
   node scripts/seed-admin.mjs
   Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
   Remove-Item Env:ADMIN_INITIAL_PASSWORD
   ```

   The seed script creates the Supabase Auth user for username `prince.lyvor`, marks its profile as an admin, and requires a password change on first sign-in. Sign in with that username; the app maps it to the internal `@lyvor.in` auth email. The script does not print the password or service-role key and will not reset an existing account's password when rerun. Never put the service-role key or initial password in SQL, source, GitHub Actions, or committed documentation.

### Database protections

- Customers can read and update only their own order history through the provided policies and RPCs; administrators receive store access only from the protected `profiles.role` value.
- Browser users cannot insert orders or edit prices, totals, discounts, coupons, roles, or stock directly. `create_order` reads current database prices and inventory, locks requested variants, recalculates shipping and coupon values, checks the India delivery fields, decrements stock, and writes the order plus item snapshots in one transaction.
- Customer and administrator cancellations go through protected functions that restore stock and release a coupon redemption when allowed.
- The `anon` key is public by design. Do not expose the Supabase service-role key to the browser.

## Build and deploy to GitHub Pages

The checked-in workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds the static site and deploys it on pushes to `main`. It writes the public Supabase URL and anon key into the built `config.js` from GitHub Actions secrets. Set repository secrets named `SUPABASE_URL` and `SUPABASE_ANON_KEY` if the live Pages site should use Supabase. If they are not set, Pages deploys in clearly labelled local-preview mode.

The build uses relative asset paths, so a project Pages address such as `https://OWNER.github.io/lyvor.in/` works without assuming that `lyvor.in` is a configured custom domain. GitHub Pages must be enabled with **GitHub Actions** as the build and deployment source. The workflow does not need or receive the Supabase service-role key.

The app's build-time environment variables are:

| Variable | Used by | Secret? |
| --- | --- | --- |
| `SUPABASE_URL` | Browser config generated at build time | Public project URL |
| `SUPABASE_ANON_KEY` | Browser config generated at build time | Public anon key; RLS is required |
| `SUPABASE_SERVICE_ROLE_KEY` | Local administrator seeding script only | **Yes; never publish** |
| `ADMIN_INITIAL_PASSWORD` | Local administrator seeding script only | **Yes; enter through a local environment variable** |

## Store admin

Once the database is connected and `prince.lyvor` has been seeded, use **Store admin** in the footer or go to `/#admin`. The first sign-in requires a new password. Admin tools cover products and size/colour stock, categories, orders and fulfilment, customer profiles, coupons, homepage content, delivery settings, and sales/order summaries. Non-admin accounts see an access-denied screen; database policies enforce the same boundary even if someone bypasses the UI.

## Product images and logo

The Lyvor logo supplied with the project is in `public/assets/lyvor-logo.jpeg`. Product and editorial photos use direct Unsplash image URLs. Failed photo requests show a warm branded fallback rather than an empty product tile. Product image URLs can be changed in the protected product editor.

## Repository and custom domain

The source repository is [`princeoffice/lyvor.in`](https://github.com/princeoffice/lyvor.in). Its GitHub Pages project URL is `https://princeoffice.github.io/lyvor.in/` after the first successful Actions deployment. The app does not infer ownership or DNS configuration from the repository name. A `lyvor.in` custom domain, DNS records, Supabase project, and live admin account exist only after an owner provisions and verifies them.
