import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

interface MockNote {
  id: number;
  title: string;
  content: string;
  file_path: string | null;
  owner_id: string;
  created_at: string;
  tags: string[];
  upvotes_count: number;
  upvoted_by: string[];
  subject: string;
}

function getMockNotes(): MockNote[] {
  if (!(store as any).notes) {
    (store as any).notes = [
      {
        id: 1,
        title: 'Quantum Physics Fundamentals',
        content: 'Core concepts of quantum mechanics, wave-particle duality, and Schrodinger equation derivation with detailed notes and solved examples.',
        file_path: null,
        owner_id: 's1',
        created_at: new Date().toISOString(),
        tags: ['Quantum', 'Mechanics', 'Lecture'],
        upvotes_count: 5,
        upvoted_by: [],
        subject: 'Physics'
      },
      {
        id: 2,
        title: 'Data Structures Cheat Sheet',
        content: 'Quick reference for Big O complexities, array operations, binary search trees, graph traversals, and common dynamic programming patterns.',
        file_path: null,
        owner_id: 's2',
        created_at: new Date().toISOString(),
        tags: ['Trees', 'Graphs', 'Algos'],
        upvotes_count: 8,
        upvoted_by: [],
        subject: 'Computer Science'
      },
      {
        id: 3,
        title: 'Linear Algebra Final Prep',
        content: 'Review of vector spaces, subspaces, linear transformations, eigen values, eigen vectors, and orthogonal projection techniques.',
        file_path: null,
        owner_id: 's3',
        created_at: new Date().toISOString(),
        tags: ['Matrices', 'Vectors', 'Linear'],
        upvotes_count: 3,
        upvoted_by: [],
        subject: 'Mathematics'
      },
      {
        id: 4,
        title: 'Shakespearean Tragedy Themes',
        content: 'Analysis of power, betrayal, and madness themes across Hamlet, Macbeth, and King Lear with critical text quotes.',
        file_path: null,
        owner_id: 's4',
        created_at: new Date().toISOString(),
        tags: ['English', 'Literature', 'Drama'],
        upvotes_count: 12,
        upvoted_by: [],
        subject: 'English'
      }
    ];
  }
  return (store as any).notes;
}

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { path } = await params;
    const urlPath = path ? path.join('/') : '';
    const searchParams = new URL(request.url).searchParams;
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    // Try FastAPI Backend
    if (process.env.BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND}/api/notes/${urlPath}${new URL(request.url).search}`, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
          },
        });
        if (res.ok) return NextResponse.json(await res.json());
      } catch (err) {
        console.warn('FastAPI notes proxy failed, falling back to mock:', err);
      }
    }

    // Mock Fallback
    const notes = getMockNotes();

    if (urlPath === 'wiki/search') {
      const search = searchParams.get('search')?.toLowerCase() || '';
      let filtered = notes;
      if (search) {
        filtered = notes.filter(n =>
          n.title.toLowerCase().includes(search) ||
          n.content.toLowerCase().includes(search) ||
          n.tags.some(t => t.toLowerCase().includes(search))
        );
      }
      // Sort by upvotes count descending
      const sorted = [...filtered].sort((a, b) => b.upvotes_count - a.upvotes_count);
      return NextResponse.json(sorted);
    }

    if (urlPath === 'my') {
      const myNotes = notes.filter(n => n.owner_id === decoded.uid);
      return NextResponse.json(myNotes);
    }

    if (urlPath === 'feed') {
      // For mock: feed notes includes all public notes
      return NextResponse.json(notes);
    }

    // General list of notes
    const search = searchParams.get('search')?.toLowerCase() || '';
    let filtered = notes;
    if (search) {
      filtered = notes.filter(n =>
        n.title.toLowerCase().includes(search) ||
        n.content.toLowerCase().includes(search) ||
        n.tags.some(t => t.toLowerCase().includes(search))
      );
    }
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Notes GET proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { path } = await params;
    const urlPath = path ? path.join('/') : '';
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const contentType = request.headers.get('Content-Type') || '';
    let bodyText = '';
    if (contentType.includes('application/json')) {
      bodyText = await request.text();
    }

    // Try FastAPI Backend
    if (process.env.BACKEND_URL) {
      try {
        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
        };
        if (contentType.includes('application/json')) {
          fetchOptions.body = bodyText;
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': 'application/json',
          };
        } else {
          // For multipart form-data, we can forward the original request body as form-data
          const formData = await request.formData();
          const backendFormData = new FormData();
          formData.forEach((value, key) => {
            backendFormData.append(key, value);
          });
          fetchOptions.body = backendFormData as any;
        }

        const res = await fetch(`${BACKEND}/api/notes/${urlPath}`, fetchOptions);
        if (res.ok) return NextResponse.json(await res.json());
      } catch (err) {
        console.warn('FastAPI notes POST proxy failed, falling back to mock:', err);
      }
    }

    // Mock Fallback
    const notes = getMockNotes();

    // Check if toggling upvote: `POST /api/notes/[id]/upvote`
    const upvoteMatch = urlPath.match(/^(\d+)\/upvote$/);
    if (upvoteMatch) {
      const noteId = parseInt(upvoteMatch[1]);
      const note = notes.find(n => n.id === noteId);
      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }

      if (!note.upvoted_by) note.upvoted_by = [];
      const userIndex = note.upvoted_by.indexOf(decoded.uid);
      if (userIndex !== -1) {
        // Remove upvote
        note.upvoted_by.splice(userIndex, 1);
        note.upvotes_count = Math.max(note.upvotes_count - 1, 0);
        return NextResponse.json({ upvoted: false, change: -1 });
      } else {
        // Add upvote
        note.upvoted_by.push(decoded.uid);
        note.upvotes_count += 1;
        return NextResponse.json({ upvoted: true, change: 1 });
      }
    }

    // Check if sharing note: `POST /api/notes/[id]/share`
    const shareMatch = urlPath.match(/^(\d+)\/share$/);
    if (shareMatch) {
      return NextResponse.json({ success: true, message: 'Note shared successfully' });
    }

    // Create Note: `POST /api/notes/upload` (or general upload)
    if (urlPath === 'upload' || urlPath === '') {
      let title = 'Untitled Note';
      let content = '';
      let tags: string[] = [];
      let subject = 'General';

      if (contentType.includes('application/json') && bodyText) {
        const jsonBody = JSON.parse(bodyText);
        title = jsonBody.title || title;
        content = jsonBody.content || content;
        tags = jsonBody.tags || tags;
        subject = jsonBody.subject || subject;
      } else {
        const formData = await request.formData();
        title = (formData.get('title') as string) || title;
        content = (formData.get('content') as string) || content;
        const tagsStr = (formData.get('tags') as string) || '';
        tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
        subject = (formData.get('subject') as string) || subject;
      }

      const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
      const newNote: MockNote = {
        id: newId,
        title,
        content,
        file_path: null,
        owner_id: decoded.uid,
        created_at: new Date().toISOString(),
        tags: tags.length > 0 ? tags : ['Notes'],
        upvotes_count: 0,
        upvoted_by: [],
        subject
      };

      notes.push(newNote);
      return NextResponse.json({
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        file_path: newNote.file_path,
        owner_id: newNote.owner_id,
        created_at: newNote.created_at,
        tags: newNote.tags,
        upvotes_count: newNote.upvotes_count
      });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    console.error('Notes POST proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { path } = await params;
    const urlPath = path ? path.join('/') : '';
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    // Try FastAPI Backend
    if (process.env.BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND}/api/notes/${urlPath}`, {
          method: 'DELETE',
          headers: {
            Authorization: authHeader,
          },
        });
        if (res.ok) return NextResponse.json(await res.json());
      } catch (err) {
        console.warn('FastAPI notes DELETE proxy failed, falling back to mock:', err);
      }
    }

    // Mock Fallback
    const notes = getMockNotes();
    const noteId = parseInt(urlPath);
    const index = notes.findIndex(n => n.id === noteId);

    if (index === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (notes[index].owner_id !== decoded.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    notes.splice(index, 1);
    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Notes DELETE proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
