import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/store';
import fs from 'fs';
import path from 'path';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const response = await fetch(`${BACKEND}/api/quiz/concept-graph`, {
          headers: {
            Authorization: authHeader,
          },
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Mock/Local Fallback: read concept_graph.json directly
    try {
      const jsonPath = path.join(process.cwd(), 'backend', 'data', 'concept_graph.json');
      if (fs.existsSync(jsonPath)) {
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        const graphData = JSON.parse(fileContent);
        
        // Add default mastery to nodes for offline/mock mode
        for (const node of graphData.nodes || []) {
          node.mastery = 25.0; // default 25%
        }
        return NextResponse.json(graphData);
      }
    } catch (e) {
      console.error('Failed to read concept graph from local file:', e);
    }

    // Hardcoded minimal fallback graph if file is missing
    return NextResponse.json({
      nodes: [
        { id: 'kinematics', label: 'Kinematics', subject: 'Physics', mastery: 25.0 },
        { id: 'laws of motion', label: 'Laws of Motion', subject: 'Physics', mastery: 25.0 }
      ],
      links: [
        { source: 'kinematics', target: 'laws of motion' }
      ]
    });

  } catch (error) {
    console.error('Concept graph GET error:', error);
    return NextResponse.json({ error: 'Failed to load concept graph' }, { status: 500 });
  }
}
