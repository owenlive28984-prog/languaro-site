// Private dashboard with HTTP Basic Authentication
// Protected route - only accessible with correct username/password

module.exports = async (req, res) => {
    const hqUser = process.env.HQ_USER || 'admin';
    const hqPass = process.env.HQ_PASS || 'languaro2025';

    // Check for Basic Auth header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        // No auth provided - request it
        res.setHeader('WWW-Authenticate', 'Basic realm="Languaro Dashboard"');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(401).send('Authentication required');
    }

    // Decode and verify credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    if (username !== hqUser || password !== hqPass) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Languaro Dashboard"');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.status(401).send('Invalid credentials');
    }

    // Authentication successful - return the dashboard HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>Languaro HQ - Private Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-900 text-white">
    <div id="app" class="p-8">
        <div class="flex h-screen items-center justify-center">
            <div class="text-2xl text-gray-400">Loading dashboard...</div>
        </div>
    </div>

    <script>
        let data = {};
        let lastUpdate = 'loading…';
        let isLoading = true;
        let error = null;

        async function loadMetrics() {
            try {
                const res = await fetch('/api/metrics');
                if (!res.ok) {
                    throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
                }
                data = await res.json();
                error = null;
                lastUpdate = new Date().toLocaleTimeString();
                isLoading = false;
                render();
                
                // Auto-refresh every 60 seconds
                setTimeout(loadMetrics, 60000);
            } catch (err) {
                console.error('Failed to load metrics:', err);
                error = err.message;
                isLoading = false;
                render();
                
                // Retry after 30 seconds on error
                setTimeout(loadMetrics, 30000);
            }
        }

        function render() {
            const app = document.getElementById('app');
            
            if (isLoading) {
                app.innerHTML = \`
                    <div class="flex h-screen items-center justify-center">
                        <div class="text-2xl text-gray-400">Loading dashboard...</div>
                    </div>
                \`;
                return;
            }

            if (error) {
                app.innerHTML = \`
                    <div class="flex h-screen items-center justify-center">
                        <div class="text-center">
                            <div class="text-2xl text-red-400 mb-4">⚠️ Error loading metrics</div>
                            <div class="text-gray-400">\${error}</div>
                            <div class="text-sm text-gray-500 mt-4">Retrying in 30 seconds...</div>
                        </div>
                    </div>
                \`;
                return;
            }

            const dau = data.dau ?? 0;
            const mau = data.mau ?? 0;
            const avgSessionMin = data.avg_session ? (data.avg_session / 60).toFixed(1) : 0;
            const translationsWeek = data.translations_week?.toLocaleString() ?? 0;
            const topPairs = data.top_pairs || {};
            const ocrCount = data.ocr ?? 0;
            const clipboardCount = data.clipboard ?? 0;
            const total = ocrCount + clipboardCount;
            const ocrPercent = total > 0 ? ((ocrCount / total) * 100).toFixed(0) : 0;

            let topPairsHtml = '';
            for (const [pair, count] of Object.entries(topPairs)) {
                topPairsHtml += \`
                    <div class="flex justify-between py-1 border-b border-gray-700">
                        <span class="text-gray-300">\${pair}</span>
                        <span class="text-green-400 font-semibold">\${count}</span>
                    </div>
                \`;
            }

            app.innerHTML = \`
                <h1 class="text-4xl font-bold mb-2">Languaro HQ</h1>
                <div class="text-sm text-gray-400 mb-8 flex items-center gap-2">
                    <span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live • Refreshes every 60s • Last update: \${lastUpdate}
                </div>

                <!-- Key Metrics Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition">
                        <div class="text-5xl font-bold text-blue-400 mb-2">\${dau}</div>
                        <div class="text-gray-400 text-sm uppercase tracking-wide">Daily Active Users</div>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition">
                        <div class="text-5xl font-bold text-purple-400 mb-2">\${mau}</div>
                        <div class="text-gray-400 text-sm uppercase tracking-wide">Monthly Active Users</div>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition">
                        <div class="text-5xl font-bold text-green-400 mb-2">\${avgSessionMin}<span class="text-2xl"> min</span></div>
                        <div class="text-gray-400 text-sm uppercase tracking-wide">Avg Session Length</div>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition">
                        <div class="text-5xl font-bold text-yellow-400 mb-2">\${translationsWeek}</div>
                        <div class="text-gray-400 text-sm uppercase tracking-wide">Translations This Week</div>
                    </div>
                </div>

                <!-- Detailed Analytics Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
                            🌍 Top Language Pairs
                        </h2>
                        <div class="space-y-1">
                            \${topPairsHtml || '<div class="text-gray-500">No data yet</div>'}
                        </div>
                    </div>

                    <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
                            📊 Feature Usage Split
                        </h2>
                        <div class="space-y-4">
                            <div>
                                <div class="text-6xl font-bold text-blue-400">OCR \${ocrPercent}%</div>
                                <div class="text-gray-400 mt-2">\${ocrCount.toLocaleString()} OCR translations</div>
                            </div>
                            <div class="h-px bg-gray-700"></div>
                            <div>
                                <div class="text-3xl font-semibold text-gray-300">Clipboard \${(100 - ocrPercent)}%</div>
                                <div class="text-gray-400 mt-1">\${clipboardCount.toLocaleString()} clipboard translations</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 text-center text-gray-500 text-sm">
                    🔒 This dashboard is private and protected
                </div>
            \`;
        }

        // Start loading metrics immediately
        loadMetrics();
    </script>
</body>
</html>`;

    return res.status(200).send(html);
}
