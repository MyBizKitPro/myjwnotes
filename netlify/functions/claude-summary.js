// Netlify Function: proxies Anthropic API calls so ANTHROPIC_API_KEY never
// reaches the browser. Frontend calls /api/claude-summary; netlify.toml
// rewrites that to /.netlify/functions/claude-summary which lands here.

export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  // claude-sonnet-4-20250514 was retired on 2026-06-15 and now returns a 404
  // `not_found_error`, which surfaced in the app as "Could not generate summary".
  // Set SUMMARY_MODEL in Netlify to override.
  const DEFAULT_MODEL = process.env.SUMMARY_MODEL || 'claude-opus-5';
  const { prompt, maxTokens = 1500, model = DEFAULT_MODEL } = body;

  if (!prompt || typeof prompt !== 'string') {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing or invalid `prompt`' }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Server not configured: ANTHROPIC_API_KEY env var is missing in Netlify settings.',
      }),
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        // On Claude Opus 5 thinking is on by default and max_tokens caps
        // thinking *plus* the reply, so the old 1500–4000 ceiling truncated the
        // JSON mid-object. Give the reply its budget and add headroom on top.
        max_tokens: Math.min(Math.max(parseInt(maxTokens, 10) || 1500, 100), 4000) + 4000,
        // Summarising notes is not an intelligence-sensitive task; low effort
        // keeps thinking short, which keeps latency and cost down.
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Upstream error: ${e.message}` }),
    };
  }
};