const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const tableName = process.env.SUPABASE_WAITLIST_TABLE || 'waitlist_emails';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return res.status(500).json({ ok: false, error: 'Supabase environment variables not configured' });
    }

    try {
        const body = await getRequestBody(req);
        const email = (body?.email || '').trim().toLowerCase();
        const message = (body?.message || '').toString().trim();
        const pageUrl = (body?.pageUrl || '').toString().slice(0, 2048);
        const userAgent = (body?.userAgent || '').toString().slice(0, 512);

        if (!email) {
            return res.status(400).json({ ok: false, error: 'Email is required' });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ ok: false, error: 'Invalid email format' });
        }

        if (!message) {
            return res.status(400).json({ ok: false, error: 'Message is required' });
        }

        const payload = {
            email,
            support_message: message,
            last_support_at: new Date().toISOString(),
            source: 'support',
        };

        if (userAgent) payload.user_agent = userAgent;
        if (pageUrl) payload.page_url = pageUrl;

        const response = await fetch(
            `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${tableName}?on_conflict=email`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseServiceRoleKey,
                    Authorization: `Bearer ${supabaseServiceRoleKey}`,
                    Prefer: 'resolution=merge-duplicates',
                },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            const errorPayload = await safeJson(response);
            const errorMessage = errorPayload?.message || errorPayload?.error || response.statusText;
            throw new Error(errorMessage || 'Failed to submit support request');
        }

        return res.status(200).json({ ok: true, message: 'Support request sent' });
    } catch (error) {
        console.error('Support submission error:', error);
        return res.status(500).json({ ok: false, error: error.message || 'Server error' });
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
