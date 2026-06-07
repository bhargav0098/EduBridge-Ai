import { NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

async function callGemini(message: string, userRole: string): Promise<string> {
  const apiKey = 'AIzaSyDMpL_HQlMJhe_St2NXa-KqKbQqkSSwYSo';

  const systemInstruction = userRole === 'teacher'
    ? `You are an AI Teacher Assistant. Respond to the teacher.
Help the teacher create lesson plans, draft test questions, format class materials, and outline pedagogical suggestions.
Use high-quality academic and instructional knowledge to provide structured, clear advice.`
    : `You are an NCERT tutor. Respond to the student.
Help the student learn academic subjects using NCERT textbook concepts. Keep answers clear, educational, and well-structured with markdown formatting.`;

  console.log(`[Gemini API] Request - Sending message to Gemini: "${message.slice(0, 50)}..."`);

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

  console.log(`[Gemini API] Response Status: ${response.status}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[Gemini API] Error details:', err);
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error('[Gemini API] Empty response from Gemini', data);
    throw new Error('Empty response from Gemini');
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, session_id, language } = body;

    console.log(`[Chat Route] Incoming message: "${message.slice(0, 100)}"`);

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
        console.log(`[Chat Route] Attempting to route through backend: ${backendUrl}`);
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
          const result = await response.json();
          console.log(`[Chat Route] Backend returned successfully.`);
          return NextResponse.json(result);
        } else {
          console.warn(`[Chat Route] Backend returned status: ${response.status}`);
        }
      } catch (err) {
        console.warn(`[Chat Route] Backend unreachable or timed out:`, err);
      }
    }

    // Try Gemini directly
    try {
      console.log(`[Chat Route] Calling Gemini directly`);
      const aiResponse = await callGemini(message, userRole);
      console.log(`[Chat Route] Successfully received response from Gemini.`);
      return NextResponse.json({
        response: aiResponse,
        message: aiResponse,
        sources: [],
        session_id: session_id || `session-${Date.now()}`,
        powered_by: 'gemini',
      });
    } catch (geminiError: any) {
      console.error('[Chat Route] Gemini error:', geminiError);
      return NextResponse.json({ 
        error: 'AI service is temporarily unavailable.',
        details: geminiError.message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Chat Route] Chat route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
