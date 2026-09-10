# NAO Group Admin

Internal admin dashboard for managing NAO Group members, payments, announcements, referral codes, and email campaigns.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The prototype login is prefilled for local review.

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

Routes are available at `/members`, `/payments`, `/announcements/banners`, `/referrals`, and `/emails`.

The current implementation uses local mock data and Zustand client state. Uploaded images are kept as local data URLs for the prototype; replace these mutations and image storage with API/object-storage calls when the backend contract is available.
