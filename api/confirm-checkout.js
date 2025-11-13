// Confirm Stripe checkout session and update Supabase as a webhook fallback

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        return res.status(500).json({ ok: false, error: 'Stripe not configured' });
    }

    const supabaseUrl = process.env.SUPABASE_LICENSING_URL || process.env.SUPABASE_URL;
    const supabaseServiceRoleKey =
        process.env.SUPABASE_LICENSING_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_LICENSING_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ ok: false, error: 'Supabase not configured' });
    }

    try {
        const sessionId = req.query.session_id || req.query.sessionId;
        if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'Missing session_id' });
        }

        const stripe = require('stripe')(stripeSecretKey);

        // Retrieve Checkout Session and (if subscription) the subscription to get period end
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return res.status(404).json({ ok: false, error: 'Session not found' });
        }

        const email = session.customer_details?.email || session.customer_email || '';
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ ok: false, error: 'Could not determine email from session' });
        }

        // Determine subscription expiration
        let expiresAtISO = null;
        if (session.mode === 'subscription' && session.subscription) {
            try {
                const sub = await stripe.subscriptions.retrieve(session.subscription);
                if (sub?.current_period_end) {
                    expiresAtISO = new Date(sub.current_period_end * 1000).toISOString();
                }
            } catch (_) {}
        }
        // Fallback: 30 days from now
        if (!expiresAtISO) {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            expiresAtISO = d.toISOString();
        }

        // Only confirm if payment is complete/paid
        const isPaid = session.payment_status === 'paid' || session.status === 'complete';
        if (!isPaid) {
            return res.status(400).json({ ok: false, error: 'Payment not completed' });
        }

        const payload = {
            email: email.trim().toLowerCase(),
            is_pro: true,
            activated_at: new Date().toISOString(),
            subscription_expires_at: expiresAtISO,
            purchase_data: {
                source: 'stripe',
                session_id: session.id,
                amount: session.amount_total,
            },
        };

        const baseUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/users`;
        let response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseServiceRoleKey,
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
                Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok && response.status === 409) {
            // Duplicate; update instead
            const { email: _email, ...updatePayload } = payload;
            response = await fetch(`${baseUrl}?email=eq.${encodeURIComponent(payload.email)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseServiceRoleKey,
                    Authorization: `Bearer ${supabaseServiceRoleKey}`,
                    Prefer: 'return=representation',
                },
                body: JSON.stringify(updatePayload),
            });
        }

        if (!response.ok) {
            const errPayload = await safeJson(response);
            return res.status(500).json({ ok: false, error: errPayload?.message || errPayload?.error || 'Supabase update failed' });
        }

        const result = await response.json().catch(() => ({}));
        return res.status(200).json({ ok: true, email: payload.email, result });
    } catch (error) {
        console.error('Confirm checkout error:', error);
        return res.status(500).json({ ok: false, error: error.message || 'Server error' });
    }
}

async function safeJson(response) {
    try { return await response.json(); } catch (_) { return null; }
}
