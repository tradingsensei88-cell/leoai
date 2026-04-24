const Groq = require('groq-sdk');

function getGroqClient() {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return null;
  }

  return new Groq({ apiKey });
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
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing question or answer' });
    }

    const groq = getGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Groq API key not configured.' });
    }

    const prompt = `A student is struggling to understand this viva answer. Simplify it using everyday language, short sentences, and real-world analogies where helpful. Keep it accurate but make it easy to understand for someone new to the topic.

Question: ${question}

Original Answer: ${answer}

Provide ONLY the simplified answer text (no labels, no quotes, no markdown). Keep it under 4 sentences.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_completion_tokens: 500,
    });

    const simplified = chatCompletion.choices[0]?.message?.content?.trim() || '';
    res.json({ success: true, simplified });

  } catch (error) {
    console.error('Error simplifying answer:', error);
    res.status(500).json({
      error: error.message || 'Failed to simplify. Please try again.'
    });
  }
};
