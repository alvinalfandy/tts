'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import CrosswordGrid from '@/components/CrosswordGrid';
import ClueList from '@/components/ClueList';
import { CrosswordResult } from '@/lib/crossword';

interface WordEntry {
    word: string;
    clue: string;
}

interface HistoryItem {
    _id: string;
    title: string;
    createdAt: string;
    placements: { direction: string }[];
}

export default function AdminPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
    const [title, setTitle] = useState('');
    const [entries, setEntries] = useState<WordEntry[]>([
        { word: '', clue: '' },
        { word: '', clue: '' },
        { word: '', clue: '' },
        { word: '', clue: '' },
        { word: '', clue: '' },
    ]);
    const [preview, setPreview] = useState<CrosswordResult | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const addRow = () => {
        if (entries.length >= 15) return;
        setEntries([...entries, { word: '', clue: '' }]);
    };

    const removeRow = (idx: number) => {
        if (entries.length <= 3) return;
        setEntries(entries.filter((_, i) => i !== idx));
    };

    const updateEntry = (idx: number, field: 'word' | 'clue', value: string) => {
        const updated = [...entries];
        updated[idx] = { ...updated[idx], [field]: value };
        setEntries(updated);
        setErrors([]);
    };

    const loadHistory = async () => {
        const res = await fetch('/api/puzzles');
        const data = await res.json();
        setHistory(data.puzzles || []);
        setHistoryLoaded(true);
    };

    // Load history on mount
    useEffect(() => {
        loadHistory();
    }, []);

    const validate = (): boolean => {
        const errs: string[] = [];
        const filled = entries.filter((e) => e.word.trim());

        if (filled.length < 5) errs.push('Minimal 5 kata harus diisi (syarat wajib).');
        filled.forEach((e, i) => {
            if (!e.clue.trim()) errs.push(`Kata #${i + 1} belum punya clue/petunjuk.`);
            if (e.word.trim().includes(' ')) errs.push(`Kata "${e.word}" tidak boleh mengandung spasi.`);
        });

        setErrors(errs);
        return errs.length === 0;
    };

    const handleGenerate = async () => {
        if (!validate()) return;

        const validEntries = entries.filter((e) => e.word.trim() && e.clue.trim());
        setGenerating(true);
        setPreview(null);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: validEntries }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPreview(data);
            if (data.unplaced?.length > 0) {
                showToast(`⚠ ${data.unplaced.length} kata tidak bisa ditempatkan: ${data.unplaced.join(', ')}`, 'error');
            } else {
                showToast('✅ Generate berhasil! Lihat preview di bawah.');
            }
        } catch (e: unknown) {
            showToast((e as Error).message || 'Generate gagal', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!preview) return;
        if (!validate()) return;

        const validEntries = entries.filter((e) => e.word.trim() && e.clue.trim());
        setPublishing(true);

        try {
            const res = await fetch('/api/puzzles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title || 'Puzzle Baru', entries: validEntries }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            showToast('🎉 Puzzle berhasil dipublish!');
            // Reset form
            setEntries([{ word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }, { word: '', clue: '' }]);
            setTitle('');
            setPreview(null);

            // Refresh history
            if (historyLoaded) loadHistory();
        } catch (e: unknown) {
            showToast((e as Error).message || 'Publish gagal', 'error');
        } finally {
            setPublishing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus puzzle ini? Tidak bisa dibatalkan.')) return;
        try {
            const res = await fetch(`/api/puzzles/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHistory(history.filter((p) => p._id !== id));
                showToast('🗑 Puzzle dihapus.');
            } else {
                showToast('Gagal menghapus puzzle.', 'error');
            }
        } catch {
            showToast('Gagal menghapus puzzle.', 'error');
        }
    };


    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Toast */}
            {toast && (
                <div
                    style={{
                        position: 'fixed', top: 20, right: 20, zIndex: 999,
                        padding: '14px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14,
                        background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        border: `1px solid ${toast.type === 'success' ? 'var(--green)' : 'var(--red)'}`,
                        color: toast.type === 'success' ? '#34d399' : '#f87171',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                        animation: 'slideUp 0.3s ease',
                        maxWidth: 360,
                    }}
                >
                    {toast.msg}
                </div>
            )}

            {/* Navbar */}
            <nav className="navbar" style={{ padding: '0 24px' }}>
                <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <button className="btn-secondary" style={{ fontSize: 13 }}>← Kembali</button>
                        </Link>
                        <div style={{ height: 24, width: 1, background: 'var(--border)' }} />
                        <h1 style={{ fontSize: 16, fontWeight: 700 }}>✏️ TTS Creator Panel</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                display: 'flex',
                                background: 'var(--bg-secondary)',
                                padding: 4,
                                borderRadius: 12,
                                border: '1px solid var(--border)'
                            }}
                        >
                            <button
                                onClick={() => setActiveTab('create')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: activeTab === 'create' ? 'var(--accent)' : 'transparent',
                                    color: activeTab === 'create' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                ✨ Buat Baru
                            </button>
                            <button
                                onClick={() => { setActiveTab('history'); loadHistory(); }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: activeTab === 'history' ? 'var(--accent)' : 'transparent',
                                    color: activeTab === 'history' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                📋 Riwayat
                            </button>
                        </div>
                        <div style={{ height: 24, width: 1, background: 'var(--border)', margin: '0 5px' }} />
                        <button
                            className="btn-secondary"
                            style={{ fontSize: 13, color: '#f43f5e', borderColor: 'rgba(244,63,94,0.2)' }}
                            onClick={() => signOut({ callbackUrl: '/' })}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {activeTab === 'create' ? (
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: preview ? '420px 1fr' : '1fr', gap: 24 }}>
                    {/* LEFT: Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Summary Header for Admin */}
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)' }}>
                            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>✨</div>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Halo, {session?.user?.name}!</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ayo buat tantangan TTS baru yang seru hari ini.</p>
                            </div>
                        </div>

                        {/* How it works info */}
                        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            <div style={{ fontWeight: 700, color: 'var(--accent-light)', marginBottom: 8, fontSize: 13 }}>
                                💡 Cara Kerja Generate TTS
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div>✦ Masukkan minimal 5 kata + petunjuknya</div>
                                <div>✦ Arah <b>mendatar/menurun otomatis</b> ditentukan sistem</div>
                                <div>✦ Kata disusun berpotongan di huruf yang sama</div>
                                <div>✦ Makin banyak huruf yang sama → makin rapi gridnya</div>
                            </div>
                        </div>

                        {/* Title */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                                Judul Puzzle
                            </label>
                            <input
                                className="input-field"
                                type="text"
                                placeholder="Contoh: TTS Hewan Nusantara"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Word entries */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div>
                                    <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Daftar Kata</h2>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entries.length}/15 kata · min 5 kata</p>
                                </div>
                                <button
                                    onClick={addRow}
                                    disabled={entries.length >= 15}
                                    className="btn-secondary"
                                    style={{ fontSize: 12, padding: '6px 14px' }}
                                >
                                    + Tambah
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {entries.map((entry, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, alignItems: 'center' }}>
                                        <input
                                            className="input-field"
                                            placeholder={`Kata ${idx + 1}`}
                                            value={entry.word}
                                            onChange={(e) => updateEntry(idx, 'word', e.target.value.toUpperCase())}
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                        <input
                                            className="input-field"
                                            placeholder="Petunjuk..."
                                            value={entry.clue}
                                            onChange={(e) => updateEntry(idx, 'clue', e.target.value)}
                                        />
                                        <button
                                            onClick={() => removeRow(idx)}
                                            disabled={entries.length <= 3}
                                            style={{
                                                width: 32, height: 32, borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                                                color: '#f43f5e', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                opacity: entries.length <= 3 ? 0.3 : 1,
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div style={{ padding: 16, borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
                                {errors.map((e, i) => (
                                    <div key={i} style={{ fontSize: 13, color: '#f43f5e', marginBottom: i < errors.length - 1 ? 4 : 0 }}>⚠ {e}</div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                {generating ? '⏳ Generating...' : '⚡ Generate TTS'}
                            </button>
                            {preview && (
                                <button onClick={handlePublish} disabled={publishing} className="btn-gold" style={{ flex: 1, justifyContent: 'center' }}>
                                    {publishing ? '⏳ Menyimpan...' : '🚀 Publish'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Preview */}
                    {preview && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Preview stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {[
                                    { label: 'Kata Terpasang', value: preview.placements.length, color: 'var(--green)' },
                                    { label: 'Tidak Terpasang', value: preview.unplaced.length, color: preview.unplaced.length > 0 ? 'var(--gold)' : 'var(--text-muted)' },
                                    { label: 'Ukuran Grid', value: `${preview.gridSize}×${preview.gridSize}`, color: 'var(--accent-light)' },
                                ].map((s) => (
                                    <div key={s.label} className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Grid preview + clues */}
                            <div className="glass-card" style={{ padding: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <div>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--accent-light)' }}>Preview Grid</h3>
                                    <CrosswordGrid grid={preview.grid} placements={preview.placements} readOnly />
                                </div>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--accent-light)' }}>Daftar Petunjuk</h3>
                                    <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                                        <ClueList placements={preview.placements} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* HISTORY TAB */
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
                    <div className="glass-card" style={{ padding: '32px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>📋 Riwayat Puzzle</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Kelola semua puzzle yang pernah kamu buat.</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>{history.length}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Puzzle</div>
                        </div>
                    </div>

                    {!historyLoaded ? (
                        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>⏳ Memuat riwayat...</div>
                    ) : history.length === 0 ? (
                        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                            <div style={{ fontSize: 50, marginBottom: 20 }}>📋</div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Belum ada riwayat</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Ayo buat puzzle pertamamu sekarang!</p>
                            <button onClick={() => setActiveTab('create')} className="btn-primary">✨ Buat TTS Baru</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                            {history.map((p) => (
                                <div key={p._id} className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', background: 'var(--accent)' }} />
                                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, color: 'var(--text-primary)' }}>{p.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 10 }}>
                                        <span>🧩 {p.placements.length} kata</span>
                                        <span>•</span>
                                        <span>📅 {new Date(p.createdAt).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <Link href={`/play/${p._id}`} style={{ flex: 1 }}>
                                            <button className="btn-primary" style={{ width: '100%', fontSize: 13, padding: '10px' }}>🎮 Main & Share</button>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(p._id)}
                                            style={{
                                                width: 42,
                                                borderRadius: 12,
                                                background: 'rgba(244,63,94,0.1)',
                                                border: '1px solid rgba(244,63,94,0.2)',
                                                color: '#f43f5e',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                            title="Hapus Puzzle"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
