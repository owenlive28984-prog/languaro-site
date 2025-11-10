// Webhook endpoint for Gumroad/Stripe purchase notifications
// This will add the purchaser's email to the Supabase users table as a pro user

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('❌ Supabase environment variables not configured');
        return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    console.log('🔍 Webhook received, Supabase configured:', !!supabaseUrl);

    try {
        const body = await getRequestBody(req);
        console.log('📦 Body parsed successfully');
        
        // Check if this is a Stripe webhook (has event type)
        if (body.type && body.data?.object) {
            console.log('📬 Stripe webhook received:', body.type);
            
            // Note: Signature verification disabled for testing
            // TODO: Re-enable after confirming webhooks work

            // Handle different Stripe event types
            const event = body;
            const eventType = event.type;

            switch (eventType) {
                case 'checkout.session.completed': {
                    // Initial purchase - activate subscription
                    const session = event.data.object;
                    const email = session.customer_details?.email || session.customer_email;
                    
                    if (!email || !EMAIL_REGEX.test(email)) {
                        console.error('❌ Invalid email:', email);
                        return res.status(400).json({ ok: false, error: 'Invalid email' });
                    }

                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

                    await updateSupabaseUser(supabaseUrl, supabaseServiceRoleKey, {
                        email: email.trim().toLowerCase(),
                        is_pro: true,
                        plan: determinePlanFromStripe(event),
                        activated_at: new Date().toISOString(),
                        subscription_expires_at: expiresAt.toISOString(),
                        purchase_data: {
                            source: 'stripe',
                            session_id: session.id,
                            amount: session.amount_total,
                        },
                    });

                    console.log('✅ Subscription activated for:', email);
                    return res.status(200).json({ ok: true, message: 'Subscription activated' });
                }

                case 'invoice.payment_succeeded': {
                    // Recurring payment succeeded - extend subscription
                    const invoice = event.data.object;
                    let email = invoice.customer_email;

                    // If no email on invoice, fetch from customer
                    if (!email) {
                        const customer = await stripe.customers.retrieve(invoice.customer);
                        email = customer.email;
                    }

                    if (!email || !EMAIL_REGEX.test(email)) {
                        console.error('❌ Invalid email:', email);
                        return res.status(400).json({ ok: false, error: 'Invalid email' });
                    }

                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30); // Extend by 30 days

                    await updateSupabaseUser(supabaseUrl, supabaseServiceRoleKey, {
                        email: email.trim().toLowerCase(),
                        is_pro: true,
                        subscription_expires_at: expiresAt.toISOString(),
                    });

                    console.log('✅ Subscription extended for:', email);
                    return res.status(200).json({ ok: true, message: 'Subscription extended' });
                }

                case 'customer.subscription.deleted': {
                    // Subscription cancelled - revoke access
                    const subscription = event.data.object;
                    const customer = await stripe.customers.retrieve(subscription.customer);
                    const email = customer.email;

                    if (!email || !EMAIL_REGEX.test(email)) {
                        console.error('❌ Invalid email:', email);
                        return res.status(400).json({ ok: false, error: 'Invalid email' });
                    }

                    await updateSupabaseUser(supabaseUrl, supabaseServiceRoleKey, {
                        email: email.trim().toLowerCase(),
                        is_pro: false,
                    });

                    console.log('✅ Subscription cancelled for:', email);
                    return res.status(200).json({ ok: true, message: 'Subscription cancelled' });
                }

                case 'payment_intent.succeeded':
                case 'invoice.payment_failed': {
                    // Log these events but don't take action
                    console.log(`ℹ️  Event ${eventType} received (no action needed)`);
                    return res.status(200).json({ ok: true, message: 'Event logged' });
                }

                default:
                    console.log(`⚠️  Unhandled event type: ${eventType}`);
                    return res.status(200).json({ ok: true, message: 'Event received' });
            }
        }
        
        // Fallback: Handle legacy Gumroad webhooks
        console.log('📬 Legacy webhook received');
        
        let email, plan, purchaseData;

        if (body.email || body.purchaser?.email) {
            email = body.email || body.purchaser?.email;
            plan = determinePlanFromGumroad(body);
            purchaseData = {
                source: 'gumroad',
                sale_id: body.sale_id,
                product_name: body.product_name,
            };
        }
        else {
            console.error('❌ Could not extract email from webhook');
            return res.status(400).json({ ok: false, error: 'Invalid webhook payload' });
        }

        email = email?.trim().toLowerCase();
        if (!email || !EMAIL_REGEX.test(email)) {
            console.error('❌ Invalid email:', email);
            return res.status(400).json({ ok: false, error: 'Invalid email format' });
        }

        await updateSupabaseUser(supabaseUrl, supabaseServiceRoleKey, {
            email,
            is_pro: true,
            plan,
            activated_at: new Date().toISOString(),
            purchase_data: purchaseData,
        });

        return res.status(200).json({
            ok: true,
            message: 'Purchase processed successfully',
            email,
            plan,
        });
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        return res.status(500).json({ 
            ok: false, 
            error: error.message || 'Server error' 
        });
    }
}

// Helper function to update user in Supabase
async function updateSupabaseUser(supabaseUrl, supabaseServiceRoleKey, userData) {
    const response = await fetch(
        `${supabaseUrl.replace(/\/$/, '')}/rest/v1/users`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseServiceRoleKey,
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
                Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify(userData),
        }
    );

    if (!response.ok) {
        const errorPayload = await safeJson(response);
        console.error('❌ Supabase error:', errorPayload);
        const errorMessage = errorPayload?.message || errorPayload?.error || response.statusText;
        throw new Error(errorMessage || 'Failed to update user');
    }

    const result = await response.json();
    console.log('✅ User updated successfully:', result);
    return result;
}

// Helper function to determine plan from Gumroad webhook
function determinePlanFromGumroad(body) {
    const productName = body.product_name?.toLowerCase() || '';
    const price = parseInt(body.price) || 0;

    if (productName.includes('lifetime') || price >= 4900) {
        return 'lifetime';
    } else if (productName.includes('monthly') || price < 1000) {
        return 'monthly';
    }
    
    // Default to pro if we can't determine
    return 'pro';
}

// Helper function to determine plan from Stripe webhook
function determinePlanFromStripe(body) {
    const stripeObject = body.data?.object || {};
    const amount = stripeObject.amount_total ?? stripeObject.amount ?? 0;
    const recurring = stripeObject.recurring || stripeObject.subscription_details?.interval;

    if (recurring && (recurring.interval === 'month' || recurring === 'month')) {
        return 'monthly';
    } else if (recurring && (recurring.interval === 'year' || recurring === 'year')) {
        return 'yearly';
    } else if (amount >= 4900) {
        return 'lifetime';
    }

    return 'pro';
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

async function safeJson(response) {
    try {
        return await response.json();
    } catch (err) {
        return null;
    }
}
