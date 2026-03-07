# BidnSteal Workspace

Production-ready workspace built from the original source folders without modifying them.

## Structure

- `client/front`: storefront
- `client/admin`: admin dashboard
- `server`: Express + MongoDB + Redis API
- `server/uploads`: self-hosted file storage root (created automatically unless `UPLOADS_DIR` is changed)
- `frontend only`: untouched original frontend source
- `admin panel with backend`: untouched original admin/backend source

## Local development

1. Create `server/.env` from [server/.env.example](/c:/Users/toxic/Pictures/mern%20stack/server/.env.example)
2. Install dependencies:

```bash
npm install
```

3. Start MongoDB and Redis locally.
4. Run the workspace:

```bash
npm run dev
```

Default local URLs:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:5173/tufayel`
- API: `http://localhost:4000`

`client/front` and `client/admin` now auto-target `http://localhost:4000/api` during local dev, so `VITE_API_BASE` is only needed when you want a different API origin.

These separate ports are only for local development. In production, the built app can be served from one domain:

- Storefront: `https://www.bidnsteal.com/`
- Admin login: `https://www.bidnsteal.com/tufayel`
- Admin panel: `https://www.bidnsteal.com/tufayel/panel`

## Build

```bash
npm run build
```

After `npm run build`, the Express server can serve both built SPAs from the same host:

- `/` -> storefront build from `client/front/dist`
- `/tufayel` and `/tufayel/panel` -> admin build from `client/admin/dist`
- `/api/*` -> backend API
- `/uploads/*` -> self-hosted uploaded files

## Single-domain production

Recommended final production shape:

- `https://www.bidnsteal.com/` -> storefront
- `https://www.bidnsteal.com/tufayel` -> admin login
- `https://www.bidnsteal.com/tufayel/panel` -> admin dashboard
- `https://www.bidnsteal.com/api/*` -> backend API
- `https://www.bidnsteal.com/uploads/*` -> uploaded media from your VPS disk

### App steps

1. Set production values in `server/.env`:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/bidnsteal
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_PASSWORD=replace-with-a-strong-password
CLIENT_URLS=https://www.bidnsteal.com
SITE_URL=https://www.bidnsteal.com
SITE_NAME=BidnSteal
SUPPORT_EMAIL=support@bidnsteal.com
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
COOKIE_DOMAIN=.bidnsteal.com
TRUST_PROXY=true
AUTO_SEED=false
UPLOADS_DIR=/var/www/bidnsteal/uploads
```

2. Build the apps:

```bash
npm install
npm run build
```

3. Run only the backend server in production:

```bash
npm --workspace server run start
```

The Express server now serves both built frontends itself, so you do not need separate public ports for the React apps.

### Nginx reverse proxy example

```nginx
server {
    listen 80;
    server_name www.bidnsteal.com bidnsteal.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

With HTTPS enabled through Certbot or your preferred TLS setup, this gives:

- same domain for shop and admin
- same cookies/session scope
- same-origin API requests
- uploaded files served from your own VPS storage

## Local accounts

- Admin: `admin@bidnsteal.com` / value from `ADMIN_PASSWORD`
- Customer: `racer@example.com` / `Racer123!`

`AUTO_SEED=true` is meant for local development only. Set `AUTO_SEED=false` in production.

## Production checklist

- Use a real MongoDB instance with persistent storage.
- Use Redis for rate limits, readiness, and cache (`REDIS_URL` is required in production).
- Set a strong `JWT_SECRET`.
- Set a real `ADMIN_PASSWORD`.
- Set `CLIENT_URLS=https://www.bidnsteal.com` for the single-domain setup.
- Set `SITE_NAME`, `SITE_URL`, `SUPPORT_EMAIL`, and optional public support/social links (`SUPPORT_PHONE`, `SUPPORT_WHATSAPP_NUMBER`, `FACEBOOK_URL`).
- Set `SESSION_COOKIE_SECURE=true` behind HTTPS.
- Set `TRUST_PROXY` correctly when running behind Nginx or another reverse proxy.
- Keep uploads on VPS/local disk with `UPLOADS_DIR` on persistent storage.
- Leave `VITE_API_BASE` unset for the single-domain setup.

## Implemented

- Live storefront products, auctions, auth, coupons, checkout, account history, and profile/shipping updates
- Auction bidding, buy-now, and claim-to-order flow
- Admin products, auctions, orders, users, subscribers, campaigns, coupons, media, and settings connected to real API data
- Self-hosted uploads on disk instead of third-party storage
- Redis-backed rate limiting and health/readiness support
- CSRF protection, secure cookie configuration, input validation, SMTP sending, and courier integration hooks
