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

function getGroqApiKey() {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return '';
  }
  return apiKey;
}

function createGroqClient() {
  const apiKey = getGroqApiKey();
  return apiKey ? new Groq({ apiKey }) : null;
}

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

// API endpoint to generate questions
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { text, questionCount, customPrompt, examinerPersona } = req.body;
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const normalizedQuestionCount = Number.parseInt(questionCount, 10);

    if (!normalizedText || !Number.isInteger(normalizedQuestionCount) || normalizedQuestionCount < 1 || normalizedQuestionCount > 50) {
      return res.status(400).json({ error: 'Provide document text and a valid questionCount between 1 and 50.' });
    }

    const groq = createGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Groq API key not configured. Please add your key to the .env file.' });
    }

    // Truncate text if too long (Groq free tier: 12K TPM limit)
    const maxChars = 6000;
    const truncatedText = normalizedText.length > maxChars ? normalizedText.substring(0, maxChars) + '\n\n[Text truncated due to length...]' : normalizedText;

    let promptInstruction = '';
    if (customPrompt && customPrompt.trim().length > 0) {
      promptInstruction = `
      
SPECIAL INSTRUCTIONS FROM USER:
"${customPrompt}"
You MUST prioritize these instructions when generating questions (e.g., if asked to focus on chapter 4, only generate questions related to chapter 4).`;
    }

    let personaInstruction = '';
    if (examinerPersona === 'strict') {
      personaInstruction = `\n\nEXAMINER PERSONA: STRICT
You are a strict, no-nonsense examiner. Your questions should:
- Demand precise, detailed answers with no room for vagueness
- Include tricky edge cases and technical depth
- Expect students to demonstrate thorough understanding
- Model answers should be comprehensive and rigorous
- Lean slightly harder in difficulty distribution`;
    } else if (examinerPersona === 'devils-advocate') {
      personaInstruction = `\n\nEXAMINER PERSONA: DEVIL'S ADVOCATE
You are a challenging devil's advocate examiner. Your questions should:
- Challenge assumptions and probe for deeper critical thinking
- Ask "what if" and "why not" style questions that test conceptual boundaries
- Include questions that present counter-arguments or alternative perspectives
- Force students to defend their understanding and reasoning
- Model answers should address multiple viewpoints and edge cases`;
    } else {
      personaInstruction = `\n\nEXAMINER PERSONA: FRIENDLY
You are a friendly, encouraging examiner. Your questions should:
- Be clear and well-structured to help students demonstrate knowledge
- Include helpful context or hints within the question phrasing
- Model answers should be educational and include explanations of WHY
- Use a supportive tone that builds confidence
- Mix difficulty fairly with slightly more easy/medium questions`;
    }

    const prompt = `You are an expert viva examiner. Based on the following lab manual/document text, generate exactly ${normalizedQuestionCount} viva-style questions that a real examiner would ask a student.${personaInstruction}${promptInstruction}

For each question, also provide a detailed model answer that demonstrates strong understanding.

IMPORTANT RULES:
- Questions must be directly grounded in the provided text
- Focus ONLY on theory, concepts, definitions, working principles, comparisons, and technical content
- Mix question types: conceptual understanding, methodology, results interpretation, and critical analysis
- Start with easier questions and gradually increase difficulty
- Do NOT make up information not present in the text
- Each answer should be 2-4 sentences long
- NEVER ask administrative or meta questions such as:
  * "What is the aim/objective of the experiment?"
  * "What are the program outcomes (POs) or course outcomes (COs)?"
  * "How do the course objectives align with program outcomes?"
  * "What apparatus/equipment is required?"
  * "What is the procedure/steps of the experiment?"
  * Any question about syllabus structure, lab rules, or institutional goals
- NEVER reference or mention any of the following in questions or answers:
  * Week numbers or experiment plan references (e.g. "as explored in Week 1", "Week 2 of the Experiment Plan")
  * Course outcome codes like CO1, CO2, CO3, CO4, CO5, CO6 etc.
  * Program outcome codes like PO1, PO2, PO3 etc.
  * "Course Objectives", "primary objective of the Course Objectives", "lab manual objectives"
  * Any structural/administrative labels from the document — treat them as invisible metadata
- Questions must read like pure theory/concept questions with NO reference to the lab manual structure
- ONLY ask questions that test the student's understanding of the actual subject matter and theory

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

Generate exactly ${normalizedQuestionCount} questions now:`;

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

    const groq = createGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Groq API key not configured. Please add your key to the .env file.' });
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

// OpenRouter AI endpoint for Ask AI (server.js replacement block)
app.post('/api/ask-ai', async (req, res) => {
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
});

// API endpoint to evaluate oral viva answers
app.post('/api/evaluate-viva', async (req, res) => {
  try {
    const { question, modelAnswer, studentAnswer, difficulty, examinerPersona } = req.body;

    if (!question || !modelAnswer || !studentAnswer) {
      return res.status(400).json({ error: 'Missing question, modelAnswer, or studentAnswer' });
    }

    const groq = createGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Groq API key not configured.' });
    }

    let personaEvalInstruction = '';
    if (examinerPersona === 'strict') {
      personaEvalInstruction = `\n\nEXAMINER PERSONA: STRICT
You are a strict examiner. Be rigorous in your evaluation:
- Reject vague or incomplete answers firmly
- Deduct points for lack of precision, missing key terms, or surface-level responses
- Only give high scores (8+) for truly comprehensive answers
- Your feedback should be direct and point out exactly what was lacking
- Do NOT give hints or suggestions about what the answer should have been`;
    } else if (examinerPersona === 'devils-advocate') {
      personaEvalInstruction = `\n\nEXAMINER PERSONA: DEVIL'S ADVOCATE
You are a devil's advocate examiner. Challenge the student's thinking:
- Question assumptions even in correct answers
- In feedback, present counter-arguments or alternative viewpoints
- Push students to think deeper about edge cases and implications
- Even for good answers, suggest areas where their reasoning could be challenged
- Be intellectually stimulating but fair in scoring`;
    } else {
      personaEvalInstruction = `\n\nEXAMINER PERSONA: FRIENDLY
You are a friendly, supportive examiner:
- Acknowledge what the student got right first
- Provide constructive hints about what they could improve
- In weaknesses, phrase feedback as learning opportunities rather than failures
- Include encouraging remarks and study tips
- Be fair in scoring but give credit for partial understanding`;
    }

    const prompt = `You are an expert viva examiner evaluating a student's oral answer. Compare their spoken answer against the model answer and provide detailed evaluation.${personaEvalInstruction}

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
