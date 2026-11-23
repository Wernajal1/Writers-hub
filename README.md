# Writers Hub

A React/Vite writer community with an Express API and PostgreSQL persistence.

## Local setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. Create a database role and the local database:

   ```sh
   sudo -u postgres createuser --pwprompt writers_hub_app
   sudo -u postgres createdb --owner=writers_hub_app writers_hub
   ```

3. Copy `.env.example` to `.env`. Set the database password in `DATABASE_URL`, a long random `JWT_SECRET`, and a separate `ADMIN_SECRET`. The schema is applied automatically at API startup.
4. Install dependencies and start both development servers:

   ```sh
   npm install
   npm run dev
   ```

   Vite runs at `http://localhost:5173`; the API runs at `http://localhost:5000`.

5. To prepare a production build, run `npm run build`, then start the API with `npm start`. The API serves `frontend/dist` when that directory exists.

## External service setup

- **Formspree:** `FORMSPREE_ENDPOINT` is configured in `.env.example`. The API records each application in PostgreSQL first, then sends a notification. If notification delivery fails, the application remains recorded and the API reports that separately.
- **TinyPesa:** payment initiation and confirmation are intentionally unavailable until its API documentation, credentials, signing/verification requirements, and callback format are provided. The activation API returns an explicit `503`; it does not pretend a payment succeeded. The provider adapter is in `backend/src/tinypesa.js`.

## Routes

- `/register`, `/login`, `/activate-payment`
- `/survey` (paid accounts only), `/feed` (paid accounts with completed writer profile)
- `/admin` (requires the `ADMIN_SECRET` value)

The Express API enforces the same account gates as the frontend. `backend/db/schema.sql` creates the user, payment, gig, application, and community-post tables.
