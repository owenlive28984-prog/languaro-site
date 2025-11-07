// Server-side proxy to fetch telemetry data from the backend
// This keeps the backend URL and any tokens secure (not exposed to clients)

module.exports = async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const backendUrl = process.env.TELEMETRY_BACKEND_URL;
    const readToken = process.env.TELEMETRY_READ_TOKEN; // Optional: use if your backend requires auth

    if (!backendUrl) {
        return res.status(500).json({ 
            ok: false, 
            error: 'TELEMETRY_BACKEND_URL environment variable not configured' 
        });
    }

    try {
        // Fetch analytics data from your telemetry backend
        const url = `${backendUrl}/analytics/overall`;
        const headers = {
            'Content-Type': 'application/json',
        };

        // Add bearer token if configured
        if (readToken) {
            headers['Authorization'] = `Bearer ${readToken}`;
        }

        const response = await fetch(url, { 
            method: 'GET',
            headers 
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Telemetry backend error:', response.status, errorText);
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();

        // Return the data with no-cache headers to ensure fresh stats
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        
        return res.status(200).json(data);

    } catch (error) {
        console.error('Metrics fetch error:', error);
        return res.status(500).json({ 
            ok: false, 
            error: 'Failed to fetch metrics',
            details: error.message 
        });
    }
}
