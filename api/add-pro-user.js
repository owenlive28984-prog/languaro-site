// Manual endpoint for adding pro users during MVP
// Use this to manually add customers who purchase before webhooks are set up
// Protect this endpoint with a secret key

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSecret = process.env.ADMIN_SECRET; // Set this in your environment

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    try {
        const body = await getRequestBody(req);
        
        // Verify admin secret
        if (!adminSecret || body.secret !== adminSecret) {
            console.error('❌ Unauthorized access attempt');
            return res.status(401).json({ ok: false, error: 'Unauthorized' });
        }

        const email = body.email?.trim().toLowerCase();
        const plan = body.plan || 'pro';

        if (!email || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({ ok: false, error: 'Invalid email format' });
        }

        console.log('➕ Manually adding pro user:', email, 'Plan:', plan);

        // Add user to Supabase
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
                body: JSON.stringify({
                    email,
                    is_pro: true,
                    plan,
                    activated_at: new Date().toISOString(),
                    purchase_data: {
                        source: 'manual',
                        added_by: 'admin',
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorPayload = await safeJson(response);
            const errorMessage = errorPayload?.message || errorPayload?.error || response.statusText;
            throw new Error(errorMessage || 'Failed to add user');
        }

        const userData = await response.json();
        console.log('✅ Pro user added:', userData);

        return res.status(200).json({
            ok: true,
            message: 'Pro user added successfully',
            user: userData,
        });
    } catch (error) {
        console.error('❌ Error adding pro user:', error);
        return res.status(500).json({ 
            ok: false, 
            error: error.message || 'Server error' 
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

async function safeJson(response) {
    try {
        return await response.json();
    } catch (err) {
        return null;
    }
}
