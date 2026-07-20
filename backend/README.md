# GoBook Backend

Express and MongoDB API scaffold for the GoBook billing, GST, accounting, CRM, inventory, payroll, and settings modules.

## Structure

```text
Backend/
  src/
    config/
    constants/
    middleware/
    models/
    modules/
      auth/
      dashboard/
      sales/
      gst/
      accounting/
      crm/
      inventory/
      hr-payroll/
      more-modules/
      settings/
    routes/
    services/
    utils/
    validators/
  tests/
```

## Database

Set `MONGODB_URI` and `MONGODB_DB_NAME` in `.env`.

```env
MONGODB_URI=mongodb://127.0.0.1:27017/gobook
MONGODB_DB_NAME=gobook
```

## Local Run

Start MongoDB, then run the backend:

```bash
npm run dev
```

The frontend should use:

```env
VITE_API_URL=http://localhost:5000/api
```

## Production

Backend environment for Hostinger:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://gobook.gobrightglobal.com
ALLOWED_ORIGINS=https://gobook.gobrightglobal.com,https://www.gobook.gobrightglobal.com
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.8mb0fod.mongodb.net/
MONGODB_DB_NAME=gobook
JWT_SECRET=change-this
```

Frontend production environment:

```env
VITE_API_URL=https://api-gobook.gobrightglobal.com/api
```

After deployment, check:

```text
https://api-gobook.gobrightglobal.com/health
```
