const DOUBAO_SEARCH_URL = 'https://open.feedcoopapi.com/search_api/web_search';
const ARK_CHAT_COMPLETIONS_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3/chat/completions';
const ARK_MODEL = 'doubao-seed-evolving';

export default {
    async fetch(request, env) {
        const corsHeaders = buildCorsHeaders(request, env);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const url = new URL(request.url);
        if (!['/doubao-search', '/ark-messages'].includes(url.pathname)) {
            return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
        }

        let payload;
        try {
            payload = await request.json();
        } catch {
            return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
        }

        if (url.pathname === '/ark-messages') {
            return proxyArkChatCompletions(payload, env, corsHeaders);
        }

        const authorization = request.headers.get('Authorization') || '';
        if (!authorization.startsWith('Bearer ')) {
            return jsonResponse({ error: 'Missing search API key' }, 401, corsHeaders);
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

async function proxyArkChatCompletions(payload, env, corsHeaders) {
    const apiKey = String(env.ARK_API_KEY || '').trim();
    if (!apiKey) {
        return jsonResponse({ error: 'Cloudflare Worker secret ARK_API_KEY is not configured' }, 500, corsHeaders);
    }
    const system = String(payload.system || '').trim();
    const messages = Array.isArray(payload.messages)
        ? payload.messages.filter(item => ['user', 'assistant'].includes(item?.role))
        : [];
    if (!system || !messages.length) {
        return jsonResponse({ error: 'System prompt and messages are required' }, 400, corsHeaders);
    }

    try {
        const response = await fetch(ARK_CHAT_COMPLETIONS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: ARK_MODEL,
                max_tokens: Math.min(8192, Math.max(1, Number(payload.max_tokens) || 8192)),
                temperature: Number.isFinite(Number(payload.temperature)) ? Number(payload.temperature) : 0.15,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: system },
                    ...messages,
                ],
            }),
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
        return jsonResponse({ error: 'Ark model request failed' }, 502, corsHeaders);
    }
}

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
