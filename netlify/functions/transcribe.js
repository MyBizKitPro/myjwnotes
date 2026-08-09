// Netlify Function: transcribes a short audio segment with the OpenAI Whisper
// API so OPENAI_API_KEY never reaches the browser. Frontend posts base64 audio
// to /api/transcribe; netlify.toml rewrites that to this function.
//
// This is the fallback path for browsers where the Web Speech API does not work
// (iOS home-screen PWAs, Brave, Firefox, and any browser whose speech service
// returns `service-not-allowed`). The client records ~45s segments and sends
// them here one at a time, which also keeps every upload far under Whisper's
// 25MB per-file limit.

const MAX_BYTES = 20 * 1024 * 1024; // stay under the 25MB per-file limit with headroom

// gpt-4o-transcribe supersedes whisper-1 and is markedly better on the
// languages Whisper handled worst — Tagalog among them. Same endpoint, same
// request shape, so this is a drop-in swap. Set TRANSCRIBE_MODEL in Netlify to
// override (e.g. gpt-4o-mini-transcribe for a cheaper, slightly weaker run).
const MODEL = process.env.TRANSCRIBE_MODEL || 'gpt-4o-transcribe';

// Whisper wants a filename whose extension matches the container it was given.
const EXT_BY_MIME = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-m4a': 'm4a',
};

export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const json = (statusCode, payload) => ({
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { audio, mimeType = 'audio/webm', language } = body;
  if (!audio || typeof audio !== 'string') {
    return json(400, { error: 'Missing or invalid `audio` (expected base64 string)' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: 'Server not configured: OPENAI_API_KEY env var is missing in Netlify settings.',
    });
  }

  let bytes;
  try {
    bytes = Buffer.from(audio, 'base64');
  } catch (e) {
    return json(400, { error: 'Could not decode base64 audio' });
  }
  if (bytes.length === 0) return json(400, { error: 'Empty audio' });
  if (bytes.length > MAX_BYTES) return json(413, { error: 'Audio segment too large' });

  // `mimeType` arrives as e.g. "audio/webm;codecs=opus" — strip parameters.
  const baseMime = String(mimeType).split(';')[0].trim().toLowerCase();
  const ext = EXT_BY_MIME[baseMime] || 'webm';

  try {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: baseMime }), `segment.${ext}`);
    form.append('model', MODEL);
    form.append('response_format', 'json');
    // Only pin the language when the client is confident about it. Real study
    // notes are usually Taglish — English scripture terms inside Tagalog
    // sentences — and forcing `tl` there makes the model fight the English
    // words instead of just transcribing them. Auto-detect handles the mix
    // better, so the client sends no language for Tagalog by default.
    if (language) form.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    const data = await response.json();
    if (!response.ok) {
      return json(response.status, {
        error: data?.error?.message || 'Transcription failed',
      });
    }
    return json(200, { text: typeof data.text === 'string' ? data.text : '' });
  } catch (e) {
    return json(502, { error: `Upstream error: ${e.message}` });
  }
};
