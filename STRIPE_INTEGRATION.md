# Stripe Integration Guide for Languaro

## 🚨 First: Fix the corrupted script.js

1. Delete `script.js`
2. Rename `script-new.js` to `script.js`

(Or just copy contents of `script-new.js` into `script.js`)

---

## 🎯 Complete Setup Process

### 1. Set Up Stripe Products

1. Go to https://dashboard.stripe.com
2. Navigate to **Products** → **Add product**

**Create Product 1: Monthly Pro**
- Name: `Languaro Pro - Monthly`
- Description: `500 translations/month with priority support`
- Pricing: Recurring → `$8.99/month`
- Click **Save**
- **Copy the Price ID** (looks like `price_1xxx...`)

**Create Product 2: Lifetime Pro**
- Name: `Languaro Pro - Lifetime`  
- Description: `Unlimited translations, lifetime access`
- Pricing: One-time → `$49`
- Click **Save**
- **Copy the Price ID** (looks like `price_1yyy...`)

### 2. Update Your Website HTML

Edit `index.html` and replace the placeholder price IDs:

**Line 232** (Monthly button):
```html
<button class="plan-btn plan-btn-pro" data-plan="monthly" data-stripe-price="price_YOUR_MONTHLY_ID">
```

**Line 265** (Lifetime button):
```html
<button class="plan-btn plan-btn-lifetime" data-plan="lifetime" data-stripe-price="price_YOUR_LIFETIME_ID">
```

Replace `price_YOUR_MONTHLY_ID` and `price_YOUR_LIFETIME_ID` with your actual Stripe Price IDs.

### 3. Add Environment Variables to Vercel

Go to Vercel → Your project → Settings → Environment Variables

Add these:

| Variable Name | Value | Where to Get It |
|--------------|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_live_xxx` or `sk_test_xxx` | Stripe Dashboard → Developers → API Keys |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Already have this |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx...` | Already have this |
| `ADMIN_SECRET` | Make up a password | For manual user additions |

**Important:** Use `sk_test_xxx` for testing, then switch to `sk_live_xxx` for production!

### 4. Set Up Stripe Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://languaro.com/api/purchase-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded` (for subscriptions)
5. Click **Add endpoint**
6. (Optional) Copy the **Signing secret** and add as `WEBHOOK_SECRET` in Vercel

### 5. Create Success Page (Optional but Recommended)

Create `success.html` in your website root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You - Languaro</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <div class="success-message">
            <h1>🎉 Welcome to Languaro Pro!</h1>
            <p>Your payment was successful.</p>
            
            <div class="next-steps">
                <h2>Next Steps:</h2>
                <ol>
                    <li>Check your email for a receipt</li>
                    <li>Download Languaro app</li>
                    <li>Open Settings → Pro Activation</li>
                    <li>Enter your email to activate</li>
                </ol>
            </div>
            
            <a href="/" class="btn">Back to Home</a>
        </div>
    </div>
</body>
</html>
```

### 6. Install Stripe npm Package

In your `languaro-waitlist` folder, create `package.json` if it doesn't exist:

```json
{
  "name": "languaro-waitlist",
  "version": "1.0.0",
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

Then run:
```bash
npm install
```

Vercel will automatically install this when deploying.

### 7. Deploy & Test

1. Commit all changes
2. Push to GitHub (triggers Vercel deploy)
3. Wait for deployment to complete
4. Test with Stripe test cards:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

---

## 🔄 How It All Works Together

```
User clicks "Choose Pro"
        ↓
Website calls /api/create-checkout
        ↓
Stripe creates checkout session
        ↓
User redirected to Stripe payment page
        ↓
User enters card details and pays
        ↓
Stripe processes payment
        ↓
Stripe sends webhook to /api/purchase-webhook
        ↓
Webhook extracts email + plan
        ↓
Webhook adds user to Supabase "users" table
        ↓
User receives email receipt from Stripe
        ↓
User downloads Languaro app
        ↓
User enters email in Settings → Pro Activation
        ↓
App queries Supabase to verify email
        ↓
App unlocks Pro features! ✨
```

---

## 🧪 Testing Checklist

- [ ] Created Stripe products (Monthly + Lifetime)
- [ ] Copied Price IDs and updated HTML buttons
- [ ] Added `STRIPE_SECRET_KEY` to Vercel
- [ ] Installed `stripe` npm package
- [ ] Deployed website to Vercel
- [ ] Clicked "Choose Pro" button - redirects to Stripe
- [ ] Made test purchase with test card
- [ ] Checked Stripe dashboard - payment successful
- [ ] Checked Vercel logs - webhook received
- [ ] Checked Supabase - user added to table
- [ ] Tested activation in desktop app

---

## 💡 Tips

**For MVP (First Week):**
- Use Stripe test mode (`sk_test_xxx`)
- Test with friends/family first
- Manually verify each purchase in Supabase

**Before Real Launch:**
- Switch to live mode (`sk_live_xxx`)
- Update webhook URL in Stripe
- Test one final time with real card (then refund)
- Update Price IDs in HTML to live versions

**Email to Send After Purchase:**
```
Subject: Welcome to Languaro Pro! 🎉

Hi there!

Thanks for purchasing Languaro Pro!

To activate:
1. Download Languaro from languaro.com
2. Open the app and click Settings (tray icon)
3. Expand "⭐ Pro Activation"
4. Enter your email: {customer_email}
5. Click "Activate Pro"

That's it! You're all set.

Need help? Just reply to this email.

- The Languaro Team
```

---

## 🐛 Troubleshooting

**"Stripe not configured" error:**
- Check `STRIPE_SECRET_KEY` is set in Vercel
- Make sure you redeployed after adding the variable

**Payment succeeds but user not in Supabase:**
- Check Vercel function logs for webhook errors
- Verify webhook is configured in Stripe
- Check webhook URL is correct
- Test webhook with Stripe CLI: `stripe trigger checkout.session.completed`

**Button does nothing when clicked:**
- Check browser console for errors
- Verify you replaced `script.js` with `script-new.js`
- Verify Price IDs are correct in HTML

---

## 🔐 Security Notes

- ✅ **Never commit** `STRIPE_SECRET_KEY` to git
- ✅ Always use environment variables
- ✅ Test mode first, live mode later
- ✅ Webhook signature verification (optional with `WEBHOOK_SECRET`)
- ✅ HTTPS required for webhooks

---

You're all set! This gives you a complete payment → activation flow. 🚀
