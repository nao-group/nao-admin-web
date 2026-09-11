# NAO Group Admin

Internal admin dashboard for managing NAO Group members, payments, announcements, referral codes, and email campaigns.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with a staff account.

The login now uses `nao-service`. Set `NAO_API_URL` when the backend is not
available at the default `http://localhost:8000` address. Access and refresh
tokens are kept in secure, HTTP-only cookies by the Next.js auth route handlers.

## Included modules

- ThinkNAO and StudyNAO member overview, growth chart, distribution, search, and filters
- Payment records, date/status filters, revenue metrics, and revenue chart
- Announcement banner CRUD with PNG/JPG upload preview, optional redirect URL, scheduling, and a ThinkNAO-style carousel preview
- Referral code CRUD
- Individual and blast announcement email CRUD

## Project structure

The app follows the same domain-oriented App Router structure used by `thinknao-web`:

- `app/(admin)/<feature>` contains each admin route, its mock data, and feature-only components
- `components` contains shared shell, authentication, chart, and UI components
- `constants`, `lib`, `store`, and `types` contain cross-feature concerns

Routes are available at `/members`, `/payments`, `/announcements/banners`, `/referrals`, `/emails`, and `/learning`.

Dashboard feature data still uses local mock data. Uploaded images are kept as local data URLs for the prototype; replace these mutations and image storage with API/object-storage calls when the backend contract is available.
