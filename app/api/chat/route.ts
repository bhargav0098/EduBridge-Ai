import { NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

async function callGemini(message: string, userRole: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const systemInstruction = userRole === 'teacher'
    ? `You are an AI Teacher Assistant. Respond to the teacher.
Help the teacher create lesson plans, draft test questions, format class materials, and outline pedagogical suggestions.
Use high-quality academic and instructional knowledge to provide structured, clear advice.`
    : `You are an NCERT tutor. Respond to the student.
Help the student learn academic subjects using NCERT textbook concepts. Keep answers clear, educational, and well-structured with markdown formatting.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nUser request: ${message}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// Educational fallback when Gemini is unavailable
function fallbackResponse(message: string, userRole: string): string {
  const msg = message.toLowerCase().trim();
  
  if (userRole === 'teacher') {
    if (/^(hi|hello|hey)\b/.test(msg)) {
      return "Hello! 👋 I'm your AI Teacher Assistant. Ask me to generate quiz questions, draft lesson plans, syllabus structures, or pedagogical recommendations.";
    }
    if (/lesson plan|plan/.test(msg)) {
      return "**Lesson Plan Template** 📚\n\n**Topic:** [insert topic]\n**Duration:** 45 minutes\n\n- **0-10m:** Intro & recap starter questions\n- **10-30m:** Core concepts explanation & hands-on activity\n- **30-40m:** Group exercise or quiz verification\n- **40-45m:** Wrap-up & homework briefing";
    }
    return `**AI Teacher Assistant**: I received your query: "${message.slice(0, 80)}".\n\n🔧 **Note**: LLM API is offline. Try asking about lesson planning or test drafting templates.`;
  }

  // Student fallback
  if (/^(hi|hello|hey)\b/.test(msg)) {
    return "Hello! 👋 I'm EduBridge AI. Ask me anything about your studies — math, science, coding, history, and more!";
  }
  if (/newton|laws of motion|f\s*=\s*ma/.test(msg)) {
    return "**Newton's Laws of Motion** 🍎\n\n**1st Law (Inertia):** Objects stay at rest or in motion unless a force acts.\n**2nd Law:** F = ma (Force = mass × acceleration)\n**3rd Law:** Every action has an equal and opposite reaction.\n\nExample: 5kg box pushed with 20N → a = 20/5 = **4 m/s²**";
  }
  if (/quadratic/.test(msg)) {
    return "**Quadratic Formula** 📐\n\nx = (−b ± √(b²−4ac)) / 2a\n\nFor ax² + bx + c = 0\n\nExample: x² − 5x + 6 = 0 → x = 3 or x = 2";
  }
  if (/python|javascript|coding|programming/.test(msg)) {
    return "**Programming Help** 💻\n\nI can help with Python, JavaScript, Java, C++, algorithms, and debugging!\n\nWhat specific topic or problem would you like help with?";
  }
  return `**Your question:** "${message.slice(0, 80)}"\n\n🔧 **Note:** AI service is temporarily unavailable. Please set your GEMINI_API_KEY in environment variables for full AI functionality.\n\nMeanwhile, try asking about:\n- Math (algebra, calculus, geometry)\n- Science (physics, chemistry, biology)\n- Programming concepts\n- Study strategies`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, session_id, language } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization') || '';
    let userRole = 'student';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded && decoded.sub) {
        const user = store.users.get(decoded.sub);
        if (user) {
          userRole = user.role;
        }
      }
    }

    // Try Python backend first
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify({ message, session_id, language }),
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Try Gemini directly
    try {
      const aiResponse = await callGemini(message, userRole);
      return NextResponse.json({
        response: aiResponse,
        message: aiResponse,
        sources: [],
        session_id: session_id || `session-${Date.now()}`,
        powered_by: 'gemini',
      });
    } catch (geminiError) {
      console.warn('Gemini error:', geminiError);
      // Educational fallback
      const fallback = fallbackResponse(message, userRole);
      return NextResponse.json({
        response: fallback,
        message: fallback,
        sources: [],
        session_id: session_id || `session-${Date.now()}`,
        powered_by: 'fallback',
      });
    }
  } catch (error) {
    console.error('Chat route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
