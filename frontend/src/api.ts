import { getIdToken } from './auth';

export type Note = {
  noteId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

const apiUrl = import.meta.env.VITE_NOTES_API_URL?.replace(/\/$/, '');
const storageKey = 'notenest-demo-notes';

const now = () => new Date().toISOString();
const readDemoNotes = (): Note[] => JSON.parse(localStorage.getItem(storageKey) ?? '[]');
const writeDemoNotes = (notes: Note[]) => localStorage.setItem(storageKey, JSON.stringify(notes));

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: token ?? '',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message ?? 'Request failed');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export async function listNotes(): Promise<Note[]> {
  if (!apiUrl) return readDemoNotes().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (await request<{ notes: Note[] }>('/notes')).notes;
}

export async function createNote(input: Pick<Note, 'title' | 'content' | 'tags'>): Promise<Note> {
  if (!apiUrl) {
    const note = { ...input, noteId: crypto.randomUUID(), createdAt: now(), updatedAt: now() };
    writeDemoNotes([note, ...readDemoNotes()]);
    return note;
  }
  return (await request<{ note: Note }>('/notes', { method: 'POST', body: JSON.stringify(input) })).note;
}

export async function updateNote(noteId: string, input: Pick<Note, 'title' | 'content' | 'tags'>): Promise<Note> {
  if (!apiUrl) {
    const notes = readDemoNotes();
    const index = notes.findIndex((note) => note.noteId === noteId);
    if (index < 0) throw new Error('Note not found');
    const updated = { ...notes[index], ...input, updatedAt: now() };
    notes[index] = updated;
    writeDemoNotes(notes);
    return updated;
  }
  return (await request<{ note: Note }>(`/notes/${noteId}`, { method: 'PUT', body: JSON.stringify(input) })).note;
}

export async function deleteNote(noteId: string) {
  if (!apiUrl) {
    writeDemoNotes(readDemoNotes().filter((note) => note.noteId !== noteId));
    return;
  }
  await request(`/notes/${noteId}`, { method: 'DELETE' });
}
