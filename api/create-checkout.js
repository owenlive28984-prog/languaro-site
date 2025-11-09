// Stripe Checkout Session Creation
// This endpoint creates a Stripe checkout session and returns the URL

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
        return res.status(500).json({ ok: false, error: 'Stripe not configured' });
    }

    try {
        const body = await getRequestBody(req);
        const { priceId, plan } = body;

        if (!priceId) {
            return res.status(400).json({ ok: false, error: 'Price ID required' });
        }

        // Import Stripe dynamically
        const stripe = require('stripe')(stripeSecretKey);

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: plan === 'monthly' ? 'subscription' : 'payment',
            success_url: `${req.headers.origin || 'https://languaro.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://languaro.com'}/#pricing`,
            customer_email: body.email || undefined, // Pre-fill if provided
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: {
                plan: plan || 'unknown',
            },
        });

        return res.status(200).json({
            ok: true,
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return res.status(500).json({ 
            ok: false, 
            error: error.message || 'Failed to create checkout session' 
        });
    }
}

async function getRequestBody(req) {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    if (typeof req.body === 'string') {
        return safeParse(req.body);
    }

    return new Promise((resolve, reject) => {
        let raw = '';
        req.setEncoding('utf8');
        req.on('data', chunk => {
            raw += chunk;
        });
        req.on('end', () => {
            resolve(safeParse(raw));
        });
        req.on('error', reject);
    });
}

function safeParse(value) {
    if (!value) return {};
    try {
        return JSON.parse(value);
    } catch (err) {
        return {};
    }
}
