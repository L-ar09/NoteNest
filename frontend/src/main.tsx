import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { cloudAuthEnabled, authenticate, confirmRegistration, endSession, register } from './auth';
import { createNote, deleteNote, listNotes, Note, updateNote } from './api';
import './styles.css';

type AuthMode = 'sign-in' | 'sign-up' | 'confirm';

const blankNote = (): Note => ({ noteId: '', title: '', content: '', tags: [], createdAt: '', updatedAt: '' });
const tagPalette = ['ideas', 'work', 'personal', 'reading'];
const themes = ['moss', 'fern', 'clay'] as const;

function AuthScreen({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (mode === 'confirm') { await confirmRegistration(email, code); setMode('sign-in'); return; }
      if (mode === 'sign-up') {
        const nextStep = await register(email, password);
        if (nextStep === 'CONFIRM') setMode('confirm'); else onAuthenticated(email);
        return;
      }
      await authenticate(email, password); onAuthenticated(email);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const title = mode === 'sign-up' ? 'Create your private space.' : mode === 'confirm' ? 'Check your inbox.' : 'Welcome back.';
  return <main className="auth-shell">
    <section className="auth-panel">
      <div className="brand"><span>✦</span> NoteNest</div><p className="eyebrow">A calm home for your thinking</p><h1>{title}</h1>
      <p className="auth-copy">{cloudAuthEnabled ? 'Your account is protected by Amazon Cognito.' : 'Demo mode is active. Add cloud settings when you are ready to connect your account.'}</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        {mode !== 'confirm' && <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label>}
        {mode === 'confirm' && <label>Verification code<input value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" /></label>}
        {error && <p className="form-error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : mode === 'confirm' ? 'Verify account' : 'Sign in'}</button>
      </form>
      {mode !== 'confirm' && <button className="text-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>{mode === 'sign-in' ? 'New to NoteNest? Create an account' : 'Already have an account? Sign in'}</button>}
    </section>
    <aside className="auth-aside"><p className="eyebrow">PRIVATE BY DESIGN</p><h2>Capture the thought before it disappears.</h2><p>Notes belong to you. Your workspace stays uncluttered, focused, and ready whenever an idea arrives.</p></aside>
  </main>;
}

function Workspace({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]); const [selected, setSelected] = useState<Note>(blankNote());
  const [search, setSearch] = useState(''); const [tagText, setTagText] = useState(''); const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [focusMode, setFocusMode] = useState(false); const [theme, setTheme] = useState<typeof themes[number]>('moss');
  useEffect(() => { listNotes().then((items) => { setNotes(items); if (items[0]) setSelected(items[0]); }).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false)); }, []);
  const visibleNotes = useMemo(() => notes.filter((note) => `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [notes, search]);
  const selectNote = (note: Note) => { setSelected(note); setTagText(note.tags.join(', ')); setAttachment(null); setMessage(''); };
  const startNew = () => { setSelected(blankNote()); setTagText(''); setAttachment(null); setMessage(''); };
  const toggleTag = (tag: string) => {
    const current = tagText.split(',').map((item) => item.trim()).filter(Boolean);
    setTagText(current.includes(tag) ? current.filter((item) => item !== tag).join(', ') : [...current, tag].join(', '));
  };
  const save = async () => {
    const input = { title: selected.title.trim() || 'Untitled note', content: selected.content, tags: tagText.split(',').map((tag) => tag.trim()).filter(Boolean) };
    try { const note = selected.noteId ? await updateNote(selected.noteId, input) : await createNote(input); setNotes((current) => [note, ...current.filter((item) => item.noteId !== note.noteId)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); setSelected(note); setTagText(note.tags.join(', ')); setMessage(attachment ? `Saved. “${attachment.name}” is ready for upload when file storage is enabled.` : 'Saved just now.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save note.'); }
  };
  const remove = async () => { if (!selected.noteId || !window.confirm('Delete this note?')) return; try { await deleteNote(selected.noteId); setNotes((current) => current.filter((note) => note.noteId !== selected.noteId)); startNew(); setMessage('Note deleted.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete note.'); } };
  return <main className={`workspace ${focusMode ? 'focus-mode' : ''}`} data-theme={theme}>
    <nav className="sidebar"><div className="brand"><span>✦</span> NoteNest</div><button className="new-note" onClick={startNew}><span>＋</span><b>New note</b><small>Start with a fresh card</small></button><div className="sidebar-label">YOUR NOTES</div><div className="note-list">{loading ? <p className="muted">Loading notes…</p> : visibleNotes.length ? visibleNotes.map((note) => <button className={`note-item ${selected.noteId === note.noteId ? 'active' : ''}`} onClick={() => selectNote(note)} key={note.noteId}><strong>{note.title || 'Untitled note'}</strong><span>{note.content || 'No additional text'}</span><div className="note-tags">{note.tags.slice(0, 3).map((tag) => <i className={`tag-dot tag-${tag}`} key={tag}>{tag}</i>)}</div></button>) : <p className="empty-state">What’s worth remembering today?</p>}</div><div className="profile"><span className="avatar">{email.slice(0, 1).toUpperCase()}</span><span>{email}</span><button aria-label="Sign out" onClick={onSignOut}>↗</button></div></nav>
    <section className="editor"><header className="editor-header"><input className="search" placeholder="Search your notes" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="editor-tools"><div className="theme-picker" aria-label="Choose theme">{themes.map((option) => <button className={`theme ${option} ${theme === option ? 'selected' : ''}`} aria-label={`${option} theme`} key={option} onClick={() => setTheme(option)} />)}</div><button className="focus-button" onClick={() => setFocusMode((active) => !active)}>{focusMode ? 'Exit focus' : 'Focus mode'}</button><span className="mode-pill">{cloudAuthEnabled ? 'Secure cloud mode' : 'Local demo mode'}</span></div></header><div className="editor-body"><input className="title-input" placeholder="Untitled note" value={selected.title} onChange={(event) => setSelected({ ...selected, title: event.target.value })} /><div className="metadata"><span>{selected.updatedAt ? `Last edited ${new Date(selected.updatedAt).toLocaleString()}` : 'A fresh thought, ready when you are.'}</span></div><textarea placeholder="Write freely. This is your space." value={selected.content} onChange={(event) => setSelected({ ...selected, content: event.target.value })} /><div className="tag-section"><span>Tags</span><div className="tag-palette">{tagPalette.map((tag) => <button className={`tag-chip tag-${tag} ${tagText.split(',').map((item) => item.trim()).includes(tag) ? 'chosen' : ''}`} key={tag} onClick={() => toggleTag(tag)}><i />{tag}</button>)}</div><input className="custom-tags" placeholder="Add your own tags, comma separated" value={tagText} onChange={(event) => setTagText(event.target.value)} /></div><div className="attachment-row"><label className="attachment"><input type="file" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /><span>⌁ Attach a file</span></label>{attachment && <span className="file-chip">⌁ {attachment.name}<button aria-label="Remove attachment" onClick={() => setAttachment(null)}>×</button></span>}</div>{message && <p className="status-message">{message}</p>}</div><footer className="editor-footer"><button className="danger" onClick={remove} disabled={!selected.noteId}>Delete</button><button className="primary" onClick={save}>Save note</button></footer></section>
  </main>;
}

function App() { const [email, setEmail] = useState(''); return email ? <Workspace email={email} onSignOut={() => { endSession().finally(() => setEmail('')); }} /> : <AuthScreen onAuthenticated={setEmail} />; }

createRoot(document.getElementById('root')!).render(<App />);
