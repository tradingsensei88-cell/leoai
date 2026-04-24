// OpenRouter AI endpoint for Ask AI feature
// Uses nvidia/nemotron-nano-12b-v2-vl:free model with vision capabilities

async function readJsonResponse(response) {
  const rawText = await response.text();
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { rawText };
  }
}

function getApiErrorMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (payload.error && typeof payload.error.message === 'string' && payload.error.message.trim()) {
    return payload.error.message;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  return fallbackMessage;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid messages' });
    }

    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured.' });
    }

    // Build messages for the API
    const apiMessages = messages.map(msg => {
      // If assistant message has reasoning_details, preserve them
      if (msg.role === 'assistant') {
        const assistantMsg = {
          role: 'assistant',
          content: msg.content
        };
        if (msg.reasoning_details) {
          assistantMsg.reasoning_details = msg.reasoning_details;
        }
        return assistantMsg;
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });

    // Add system message for better responses
    const systemMessage = {
      role: 'system',
      content: 'You are Leo AI, a highly knowledgeable and helpful AI assistant built into the Leo platform. You specialize in helping students with their academic work, especially lab manuals, diagrams, formulas, and exam preparation. You can analyze images and provide detailed explanations. Be concise but thorough. Use markdown formatting when helpful.'
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [systemMessage, ...apiMessages],
        reasoning: { enabled: true }
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      throw new Error(getApiErrorMessage(data, 'OpenRouter API error'));
    }

    const assistantMessage = data.choices?.[0]?.message;
    if (!assistantMessage) {
      throw new Error('No response from AI model');
    }

    res.json({
      success: true,
      content: assistantMessage.content || '',
      reasoning_details: assistantMessage.reasoning_details || null
    });

  } catch (error) {
    console.error('Ask AI error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get AI response. Please try again.'
    });
  }
};
