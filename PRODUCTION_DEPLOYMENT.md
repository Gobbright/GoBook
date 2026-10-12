# GoBook Production Deployment

## Domains

- Frontend: `https://gobooksuite.com`
- Backend API: `https://api.gobooksuite.com`
- API base used by frontend: `https://api.gobooksuite.com/api`

## Important Secret Safety

The MongoDB password was shared in chat. Rotate that MongoDB Atlas database user password before deployment, then use the new password only in the hosting provider environment variables or `backend/.env`.

## Backend

1. Use `backend/.env` on Hostinger for production.
2. Fill/verify all production values, especially `MONGODB_URI`, `JWT_SECRET`, admin password, SMTP, and payment/meta keys.
3. Install and start:

```bash
cd backend
npm install
NODE_ENV=production npm start
```

4. Point `api.gobooksuite.com` to this backend server and enable HTTPS.
5. Confirm these URLs work:

```text
https://api.gobooksuite.com/health
https://api.gobooksuite.com/api/auth/me
```

The second URL should return unauthorized without a token; that is fine.

## Frontend

1. Use `frontend/.env` for production. For local development, copy `frontend/.env.local.example` to `frontend/.env`.
2. Build and deploy `frontend/dist`:

```bash
cd frontend
npm install
npm run build
```

3. Point `gobooksuite.com` to the deployed frontend.

## DNS

Create DNS records at your domain provider:

```text
gobooksuite.com      -> frontend hosting target
www.gobooksuite.com  -> frontend hosting target or redirect to gobooksuite.com
api.gobooksuite.com  -> backend hosting target
```

## Google Sign-In

In Google Cloud Console, add:

```text
https://gobooksuite.com
https://www.gobooksuite.com
```

Use the same client ID in:

```text
frontend VITE_GOOGLE_CLIENT_ID
backend GOOGLE_CLIENT_ID
```
