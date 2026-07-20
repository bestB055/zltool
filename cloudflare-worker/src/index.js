const DOUBAO_SEARCH_URL = 'https://open.feedcoopapi.com/search_api/web_search';

export default {
    async fetch(request, env) {
        const corsHeaders = buildCorsHeaders(request, env);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const url = new URL(request.url);
        if (url.pathname !== '/doubao-search') {
            return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
        }

        const authorization = request.headers.get('Authorization') || '';
        if (!authorization.startsWith('Bearer ')) {
            return jsonResponse({ error: 'Missing search API key' }, 401, corsHeaders);
        }

        let payload;
        try {
            payload = await request.json();
        } catch {
            return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
        }

        const query = String(payload.Query || '').trim().slice(0, 100);
        if (!query) {
            return jsonResponse({ error: 'Query is required' }, 400, corsHeaders);
        }

        const body = {
            Query: query,
            SearchType: 'web',
            Count: Math.min(50, Math.max(1, Number(payload.Count) || 10)),
            Filter: {
                NeedContent: true,
                NeedUrl: true,
            },
            ContentFormats: 'text',
        };

        const timeRange = String(payload.TimeRange || '').trim();
        if (timeRange) body.TimeRange = timeRange;

        try {
            const response = await fetch(DOUBAO_SEARCH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: authorization,
                },
                body: JSON.stringify(body),
            });

            const responseHeaders = new Headers(corsHeaders);
            responseHeaders.set(
                'Content-Type',
                response.headers.get('Content-Type') || 'application/json; charset=utf-8',
            );
            responseHeaders.set('Cache-Control', 'no-store');

            return new Response(await response.text(), {
                status: response.status,
                headers: responseHeaders,
            });
        } catch {
            return jsonResponse({ error: 'Doubao search request failed' }, 502, corsHeaders);
        }
    },
};

function buildCorsHeaders(request, env) {
    const allowedOrigin = String(env.ALLOWED_ORIGIN || '').trim();
    const requestOrigin = request.headers.get('Origin') || '';
    const origin = allowedOrigin && requestOrigin === allowedOrigin ? allowedOrigin : (allowedOrigin ? 'null' : '*');

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

function jsonResponse(body, status, corsHeaders) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}