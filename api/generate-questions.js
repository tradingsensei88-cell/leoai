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
    const { text, questionCount, customPrompt, examinerPersona } = req.body;
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const normalizedQuestionCount = Number.parseInt(questionCount, 10);

    if (!normalizedText || !Number.isInteger(normalizedQuestionCount) || normalizedQuestionCount < 1 || normalizedQuestionCount > 50) {
      return res.status(400).json({ error: 'Provide document text and a valid questionCount between 1 and 50.' });
    }

    const groq = getGroqClient();
    if (!groq) {
      return res.status(500).json({ error: 'Groq API key not configured.' });
    }

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
  * Any structural/administrative labels from the document - treat them as invisible metadata
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
