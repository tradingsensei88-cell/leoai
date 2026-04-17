const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    const { text, questionCount } = req.body;

    if (!text || !questionCount) {
      return res.status(400).json({ error: 'Missing text or questionCount' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key not configured.' });
    }

    const maxChars = 6000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '\n\n[Text truncated due to length...]' : text;

    const prompt = `You are an expert viva examiner. Based on the following lab manual/document text, generate exactly ${questionCount} viva-style questions that a real examiner would ask a student.

For each question, also provide a detailed model answer that demonstrates strong understanding.

IMPORTANT RULES:
- Questions must be directly grounded in the provided text
- Mix question types: conceptual understanding, methodology, results interpretation, and critical analysis
- Start with easier questions and gradually increase difficulty
- Do NOT make up information not present in the text
- Each answer should be 2-4 sentences long

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
[
  {
    "id": 1,
    "question": "Your question here?",
    "answer": "The model answer here.",
    "difficulty": "easy"
  }
]

Use difficulty levels: "easy", "medium", "hard"

Here is the document text:
---
${truncatedText}
---

Generate exactly ${questionCount} questions now:`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_completion_tokens: 8000,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';

    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse questions from AI response');
      }
    }

    res.json({ success: true, questions });

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate questions. Please try again.'
    });
  }
};
