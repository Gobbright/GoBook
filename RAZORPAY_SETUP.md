# Razorpay setup

1. Create Razorpay Test Mode API keys.
2. Add these values to `backend/.env`:

   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   RAZORPAY_WEBHOOK_SECRET=use-a-separate-long-random-secret
   ```

3. In Razorpay Dashboard, enable automatic payment capture.
4. Create a webhook using this production URL:

   ```text
   https://YOUR_API_DOMAIN/api/subscriptions/razorpay/webhook
   ```

5. Use the same value as `RAZORPAY_WEBHOOK_SECRET` in the webhook settings.
6. Subscribe to `payment.captured`, `payment.failed`, and `order.paid`.
7. Run `npm run seed:plans` inside `backend` once, or restart the backend. Both safely insert missing default plans without overwriting admin-edited prices.
8. Complete a Test Mode payment and confirm it appears under Admin -> Payments -> All Payments before switching to Live Mode keys.

Never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in frontend environment variables. The frontend receives only the public Key ID for an individual server-created order.
