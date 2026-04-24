const Groq = require('groq-sdk');

function getGroqClient() {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return null;
  }

  return new Groq({ apiKey });
}

module.exports = async function handler(req, res) {
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
    const { question, modelAnswer, studentAnswer, difficulty, examinerPersona } = req.body;

    if (!question || !modelAnswer || !studentAnswer) {
      return res.status(400).json({ error: 'Missing question, modelAnswer, or studentAnswer' });
    }

    const groq = getGroqClient();
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

    evaluation.score = Math.max(0, Math.min(10, Math.round(evaluation.score)));
    evaluation.topicsToFocus = Array.isArray(evaluation.topicsToFocus) ? evaluation.topicsToFocus : [];

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error('Error evaluating viva answer:', error);
    res.status(500).json({
      error: error.message || 'Failed to evaluate answer. Please try again.'
    });
  }
};
