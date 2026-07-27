import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	let body: { prompt?: string; buckets?: string[] };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const { prompt } = body;
	if (!prompt?.trim()) throw error(400, 'Prompt is required');

	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) throw error(503, 'XAI_API_KEY is not configured');

	const res = await fetch('https://api.x.ai/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'grok-3-mini',
			messages: [
				{
					role: 'system',
					content: `You are a regex expert for video transcript search. 
Return ONLY a valid JavaScript regex pattern (no flags, no slashes) that matches the described speech moments.
The regex is tested against individual words or short phrases in a word-level transcript.
Prefer word-boundary patterns. Use alternation for synonyms. Keep it tight.
Respond with ONLY the regex string, nothing else.`
				},
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0.3,
			max_tokens: 200
		})
	});

	if (!res.ok) {
		const text = await res.text();
		throw error(502, `xAI API error: ${text.slice(0, 200)}`);
	}

	const data = await res.json();
	const regex = data.choices?.[0]?.message?.content?.trim() ?? '';
	if (!regex) throw error(500, 'No regex returned from AI');

	// Validate it compiles
	try {
		new RegExp(regex, 'i');
	} catch {
		throw error(500, `AI returned invalid regex: ${regex}`);
	}

	return json({ regex });
};
