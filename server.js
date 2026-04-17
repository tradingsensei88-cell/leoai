require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Clean URL redirects (e.g. /upload -> /upload.html)
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'upload.html')));
app.get('/ask-ai', (req, res) => res.sendFile(path.join(__dirname, 'ask-ai.html')));
app.get('/oral-viva', (req, res) => res.sendFile(path.join(__dirname, 'oral-viva.html')));
app.get('/about-us', (req, res) => res.sendFile(path.join(__dirname, 'about-us.html')));
app.get('/how-it-works', (req, res) => res.sendFile(path.join(__dirname, 'how-it-works.html')));
app.get('/contact-us', (req, res) => res.sendFile(path.join(__dirname, 'contact-us.html')));
app.get('/news', (req, res) => res.sendFile(path.join(__dirname, 'news.html')));

app.use(express.static(path.join(__dirname)));

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// API endpoint to generate questions
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { text, questionCount, customPrompt } = req.body;

    if (!text || !questionCount) {
      return res.status(400).json({ error: 'Missing text or questionCount' });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      return res.status(500).json({ error: 'Groq API key not configured. Please add your key to the .env file.' });
    }

    // Truncate text if too long (Groq free tier: 12K TPM limit)
    const maxChars = 6000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '\n\n[Text truncated due to length...]' : text;

    let promptInstruction = '';
    if (customPrompt && customPrompt.trim().length > 0) {
      promptInstruction = `
      
SPECIAL INSTRUCTIONS FROM USER:
"${customPrompt}"
You MUST prioritize these instructions when generating questions (e.g., if asked to focus on chapter 4, only generate questions related to chapter 4).`;
    }

    const prompt = `You are an expert viva examiner. Based on the following lab manual/document text, generate exactly ${questionCount} viva-style questions that a real examiner would ask a student.${promptInstruction}

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

    // Try to parse JSON from response
    let questions;
    try {
      // Try direct parse first
      questions = JSON.parse(responseText);
    } catch {
      // Try to extract JSON array from response
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
});

// API endpoint to simplify an answer
app.post('/api/simplify-answer', async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing question or answer' });
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
});

// API endpoint for Ask AI (OpenRouter)
app.post('/api/ask-ai', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid messages' });
    }

    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
    console.log(`[DEBUG] OPENROUTER_API_KEY length=${apiKey.length}, starts="${apiKey.substring(0,8)}", ends="${apiKey.substring(apiKey.length-4)}"`);
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured.' });
    }

    // Build messages for the API
    const apiMessages = messages.map(msg => {
      if (msg.role === 'assistant') {
        const assistantMsg = { role: 'assistant', content: msg.content };
        if (msg.reasoning_details) {
          assistantMsg.reasoning_details = msg.reasoning_details;
        }
        return assistantMsg;
      }
      return { role: msg.role, content: msg.content };
    });

    // System message
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

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      throw new Error(data.error?.message || 'OpenRouter API error');
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
});

// API endpoint to evaluate oral viva answers
app.post('/api/evaluate-viva', async (req, res) => {
  try {
    const { question, modelAnswer, studentAnswer, difficulty } = req.body;

    if (!question || !modelAnswer || !studentAnswer) {
      return res.status(400).json({ error: 'Missing question, modelAnswer, or studentAnswer' });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      return res.status(500).json({ error: 'Groq API key not configured.' });
    }

    const prompt = `You are an expert viva examiner evaluating a student's oral answer. Compare their spoken answer against the model answer and provide detailed evaluation.

Question: ${question}
Difficulty: ${difficulty || 'medium'}

Model Answer: ${modelAnswer}

Student's Spoken Answer: ${studentAnswer}

Evaluate the student's answer and respond ONLY with valid JSON (no markdown, no code blocks, just raw JSON) in this exact format:
{
  "score": <number from 0 to 10>,
  "feedback": "<2-3 sentences of overall feedback on their answer>",
  "strengths": "<what the student got right, 1-2 sentences>",
  "weaknesses": "<what was missing or incorrect, 1-2 sentences>",
  "topicsToFocus": ["<topic 1 they should study more>", "<topic 2>"]
}

SCORING GUIDELINES:
- 9-10: Nearly perfect, covers all key points with good understanding
- 7-8: Good answer, covers most points but may miss some details
- 5-6: Average, shows basic understanding but lacks depth
- 3-4: Below average, misses major points or has misconceptions
- 1-2: Poor, shows little understanding of the topic
- 0: No relevant content or completely wrong

Be fair but rigorous. Consider that this is a spoken answer so minor grammar issues are acceptable. Focus on conceptual accuracy and completeness.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_completion_tokens: 1000,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';

    let evaluation;
    try {
      evaluation = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse evaluation from AI response');
      }
    }

    // Ensure score is valid
    evaluation.score = Math.max(0, Math.min(10, Math.round(evaluation.score)));
    evaluation.topicsToFocus = evaluation.topicsToFocus || [];

    res.json({ success: true, evaluation });

  } catch (error) {
    console.error('Error evaluating viva answer:', error);
    res.status(500).json({
      error: error.message || 'Failed to evaluate answer. Please try again.'
    });
  }
});

// Export the Express API for Vercel
module.exports = app;

// Start server locally (ignored by Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  Leo server running at http://localhost:${PORT}`);
    console.log(`  Upload page: http://localhost:${PORT}/upload`);
    console.log(`  Ask AI page: http://localhost:${PORT}/ask-ai`);
    console.log(`  Oral Viva:   http://localhost:${PORT}/oral-viva`);
    console.log(`  API endpoints: /api/generate-questions, /api/ask-ai, /api/evaluate-viva\n`);
  });
}
