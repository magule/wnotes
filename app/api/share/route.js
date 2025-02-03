import { nanoid } from 'nanoid';

// In a real app, this would be a database
const sharedNotes = new Map();

export async function POST(request) {
  try {
    const { title, content } = await request.json();
    
    // Generate a short unique ID
    const shareId = nanoid(10);
    
    // Store the note (in a real app, this would go to a database)
    sharedNotes.set(shareId, { title, content, createdAt: new Date() });
    
    // Return the share URL
    return Response.json({ 
      shareUrl: `/share/${shareId}`,
      shareId 
    });
  } catch (error) {
    return Response.json({ error: 'Failed to share note' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return Response.json({ error: 'No share ID provided' }, { status: 400 });
    }
    
    const note = sharedNotes.get(id);
    if (!note) {
      return Response.json({ error: 'Note not found' }, { status: 404 });
    }
    
    return Response.json(note);
  } catch (error) {
    return Response.json({ error: 'Failed to get note' }, { status: 500 });
  }
} 