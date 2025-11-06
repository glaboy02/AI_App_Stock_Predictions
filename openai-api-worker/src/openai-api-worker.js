/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import OpenAI from 'openai';

export default {
	async fetch(request, env, ctx) {
		// Add CORS headers to all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Log request details for debugging
		console.log('Request method:', request.method);
		console.log('Request URL:', request.url);

		// Check if API key exists
		if (!env.OPENAI_API_KEY) {
			return new Response(JSON.stringify({error: "OpenAI API key not configured"}), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders,
				}
			});
		}

		console.log('API key found, initializing OpenAI...');
		const openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
			// Use direct OpenAI API instead of gateway for now
			baseURL: "https://gateway.ai.cloudflare.com/v1/aec60c35b0c915ef223cb6e67a6cb26f/stock-predictions/openai"

		});

		try {
			let messages;

			// Handle POST requests with JSON body
			if (request.method === 'POST') {
				try {
					messages = await request.json();
					console.log('Received messages from POST:', messages);

					// Validate and clean up messages format
					if (Array.isArray(messages)) {
						messages = messages.map(msg => {
							if (!msg.role || !msg.content) {
								console.log('Invalid message format:', msg);
								return null;
							}
							return {
								role: String(msg.role),
								content: String(msg.content)
							};
						}).filter(msg => msg !== null);
					}

					// If still invalid, use default
					if (!Array.isArray(messages) || messages.length === 0) {
						console.log('Using default messages due to invalid format');
						messages = [
							{ role: 'system', content: 'You are a helpful assistant.' },
							{ role: 'user', content: 'make me laugh' },
						];
					}
				} catch (e) {
					console.log('No JSON body in POST request, using default');
					messages = [
						{ role: 'system', content: 'You are a helpful assistant.' },
						{ role: 'user', content: 'make me laugh' },
					];
				}
			} else {
				// Default messages for GET requests
				messages = [
					{ role: 'system', content: 'You are a helpful assistant.' },
					{ role: 'user', content: 'make me laugh' },
				];
			}

			console.log('Making OpenAI API call...');
			console.log('Messages being sent to OpenAI:', JSON.stringify(messages, null, 2));

			// Ensure messages is an array
			if (!Array.isArray(messages)) {
				console.log('Messages is not an array, converting...');
				messages = [
					{ role: 'system', content: 'You are a helpful assistant.' },
					{ role: 'user', content: String(messages) }
				];
			}

			const completion = await openai.chat.completions.create({
				model: 'gpt-4o-mini',
				messages,
				temperature: 1.1,
				presence_penalty: 0,
				frequency_penalty: 0
			});

			console.log('OpenAI response received');
			return new Response(JSON.stringify(completion.choices[0].message.content), {
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders,
				},
			});
		} catch (error) {
			console.error('OpenAI API error:', error);
			return new Response(JSON.stringify({error: error.message}), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders,
				}
			});
		}

	},
};
