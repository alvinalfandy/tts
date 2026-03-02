'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

interface PuzzleSummary {
  _id: string;
  title: string;
  createdAt: string;
  placements: { direction: string }[];
  unplaced: string[];
}

export default function HomePage() {
  const { data: session } = useSession();
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const role = (session?.user as { role?: string })?.role;

  const fetchPuzzles = async () => {
    setLoading(true);
    const res = await fetch('/api/puzzles');
    const data = await res.json();
    setPuzzles(data.puzzles || []);
    setLoading(false);
  };

  const seedDb = async () => {
    setSeeding(true);
    await fetch('/api/seed', { method: 'POST' });
    await fetchPuzzles();
    setSeeding(false);
  };

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ padding: '0 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              ✦
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>TTS Crossword</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TTS Crossword Platform</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {session ? (
              <>
                {/* User badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: role === 'admin' ? 'linear-gradient(135deg, var(--accent), #5b21b6)' : 'linear-gradient(135deg, var(--gold), #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                    {role === 'admin' ? '🛡️' : '🎮'}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{session.user?.name}</div>
                    <div style={{ fontSize: 10, color: role === 'admin' ? 'var(--accent-light)' : 'var(--gold)', lineHeight: 1, textTransform: 'capitalize' }}>{role}</div>
                  </div>
                </div>
                {role === 'admin' && (
                  <Link href="/admin">
                    <button className="btn-primary">✏️ Buat TTS</button>
                  </Link>
                )}
                <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => signOut({ callbackUrl: '/' })}>
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login">
                <button className="btn-primary" style={{ fontSize: 14 }}>🔐 Login</button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="badge badge-purple" style={{ marginBottom: 16 }}>Platform Teka-Teki Silang</div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
            {role === 'player' ? 'Mainkan ' : 'Buat & Mainkan '}
            <span className="gradient-text" style={{ filter: 'drop-shadow(0 0 20px var(--accent-glow))' }}>TTS Interaktif</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.6 }}>
            {role === 'player'
              ? 'Pilih puzzle favoritmu dan buktikan kemampuanmu mengisi TTS!'
              : 'Susun puzzle teka-teki silang dengan mudah, bagikan ke siapa saja, dan mainkan kapan saja.'}
          </p>
          {/* Hanya tampil untuk admin atau belum login */}
          {role === 'admin' && (
            <Link href="/admin">
              <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
                ✨ Buat Puzzle Baru
              </button>
            </Link>
          )}
          {role === 'player' && (
            <button
              className="btn-primary"
              style={{ padding: '14px 32px', fontSize: 16 }}
              onClick={() => document.getElementById('puzzle-list')?.scrollIntoView({ behavior: 'smooth' })}
            >
              🎮 Lihat Puzzle
            </button>
          )}
        </div>

        {/* Dashboard Header for Admin */}
        {role === 'admin' && (
          <div className="glass-card" style={{ padding: '32px', marginBottom: 48, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🛡️</div>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: 'white' }}>Admin Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Kelola puzzle, pantau statistik, dan buat tantangan baru untuk pemain.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/admin">
                <button className="btn-primary" style={{ padding: '12px 24px' }}>✨ Creator Panel</button>
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48, maxWidth: role === 'admin' ? '100%' : 480, margin: '0 auto 48px' }}>
          {[
            { icon: '🧩', label: 'Total Puzzle Published', value: puzzles.length, detail: 'Puzzle yang bisa dimainkan' },
            { icon: '📝', label: 'Database Kosakata', value: puzzles.reduce((a, p) => a + p.placements.length, 0), detail: 'Total kata dari semua puzzle' },
            { icon: '🚀', label: 'Status Server', value: 'Online', detail: 'Sistem berjalan normal' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card" style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-light)', lineHeight: 1.2 }}>{stat.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{stat.detail}</div>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div id="puzzle-list" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Puzzle Tersedia</h2>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{puzzles.length} puzzle</span>
        </div>

        {/* Puzzle Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p>Memuat puzzle...</p>
          </div>
        ) : puzzles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }} className="glass-card">
            <div style={{ fontSize: 60, marginBottom: 16 }}>🧩</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Belum ada puzzle</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              {role === 'player' ? 'Belum ada puzzle tersedia.' : 'Buat puzzle pertamamu atau load sample data.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={seedDb} className="btn-secondary">🌱 Load Sample</button>
              {role !== 'player' && <Link href="/admin"><button className="btn-primary">✏️ Buat Sekarang</button></Link>}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {puzzles.map((puzzle) => {
              const across = puzzle.placements.filter((p) => p.direction === 'across').length;
              const down = puzzle.placements.filter((p) => p.direction === 'down').length;
              return (
                <div key={puzzle._id} className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      🎯
                    </div>
                    <span className="badge badge-green">Published</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{puzzle.title}</h3>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>↔ {across} mendatar</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>↕ {down} menurun</span>
                  </div>
                  {puzzle.unplaced.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 12 }}>
                      ⚠ {puzzle.unplaced.length} kata tidak terpasang
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    📅 {formatDate(puzzle.createdAt)}
                  </div>
                  <Link href={`/play/${puzzle._id}`} style={{ display: 'block' }}>
                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      🎮 Mainkan
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)', marginTop: 60 }}>
        ✦ Built by Alvin Alfandy — 2026 ✦
      </footer>
    </div>
  );
}
