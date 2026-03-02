'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import CrosswordGrid from '@/components/CrosswordGrid';
import ClueList from '@/components/ClueList';
import { Placement } from '@/lib/crossword';

const PLAYER_COLORS = ['#818cf8', '#34d399', '#f472b6', '#fb923c', '#a78bfa', '#22d3ee'];

function getOrCreatePlayerId() {
    if (typeof window === 'undefined') return 'anon';
    let id = sessionStorage.getItem('tts_player_id');
    if (!id) {
        id = Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('tts_player_id', id);
    }
    return id;
}

interface Puzzle {
    _id: string;
    title: string;
    grid: string[][];
    placements: Placement[];
    unplaced: string[];
    gridSize: number;
    createdAt: string;
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function PlayPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const isPlayersOnly = searchParams.get('mode') === 'players-only';

    // Gate: redirect if players-only and not logged in
    useEffect(() => {
        if (isPlayersOnly && session === null) {
            // null means unauthenticated (not undefined = loading)
            router.push('/register?reason=players-only');
        }
    }, [isPlayersOnly, session, router]);

    const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [playerName, setPlayerName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scoreSubmitted, setScoreSubmitted] = useState(false);
    const [finalScore, setFinalScore] = useState<number | null>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [copied, setCopied] = useState('');
    // Multiplayer
    const playerId = useRef(getOrCreatePlayerId());
    const playerColor = useMemo(() => {
        const idx = parseInt(playerId.current, 36) % PLAYER_COLORS.length;
        return PLAYER_COLORS[idx];
    }, []);
    const [remoteCells, setRemoteCells] = useState<Record<string, { value: string; color: string; playerName: string }>>({});
    const [onlinePlayers, setOnlinePlayers] = useState<{ id: string; name: string; color: string }[]>([]);
    const pendingCells = useRef<Record<string, string>>({});
    const getCellsRef = useRef<(() => string[][]) | null>(null);

    const loadLeaderboard = useCallback(() => {
        fetch(`/api/scores?puzzleId=${id}`)
            .then(r => r.json())
            .then(data => setLeaderboard(data.scores || []))
            .catch(() => { });
    }, [id]);

    useEffect(() => {
        fetch(`/api/puzzles/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { setNotFound(true); }
                else { setPuzzle(data.puzzle); setTimerRunning(true); loadLeaderboard(); }
            })
            .finally(() => setLoading(false));
    }, [id, loadLeaderboard]);

    // Auto-fill name from session for registered users
    useEffect(() => {
        if (session?.user?.name) {
            setPlayerName(session.user.name);
        }
    }, [session]);

    useEffect(() => {
        if (timerRunning && !completed) {
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [timerRunning, completed]);

    const handleScoreSubmit = useCallback(async (overrideName?: string) => {
        const nameToSubmit = overrideName || playerName;
        if (!nameToSubmit.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    puzzleId: id,
                    playerName: nameToSubmit,
                    timeSeconds: seconds,
                    hintsUsed
                })
            });
            const data = await res.json();
            if (data.score?.totalScore) {
                setFinalScore(data.score.totalScore);
            }
            setScoreSubmitted(true);
            loadLeaderboard();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    }, [id, playerName, seconds, hintsUsed, loadLeaderboard]);

    const handleComplete = useCallback(() => {
        setCompleted(true);
        setShowOverlay(true);
        setTimerRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);

        // Auto-submit score
        const finalName = playerName.trim() || (session?.user?.name) || `Pemain #${getOrCreatePlayerId()}`;
        if (!playerName) setPlayerName(finalName);
        handleScoreSubmit(finalName);
    }, [playerName, session, handleScoreSubmit]);

    // Multiplayer: handle local cell change - queue it
    const handleCellChange = useCallback((key: string, value: string) => {
        pendingCells.current[key] = value;
    }, []);

    // Multiplayer: presence-only ping (no letter sharing = pure competition)
    useEffect(() => {
        if (!puzzle) return;
        const syncInterval = setInterval(async () => {
            try {
                // Ping to maintain presence (no cell data)
                await fetch('/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        puzzleId: puzzle._id,
                        playerId: playerId.current,
                        playerName: playerName || (session?.user?.name) || 'Pemain',
                        playerColor,
                        cells: {}, // never share letters — pure competition
                    }),
                });

                // Fetch presence only (to show online count)
                const res = await fetch(`/api/session?puzzleId=${puzzle._id}`);
                const data = await res.json();
                const others = (data.players || []).filter((p: any) => p.id !== playerId.current);
                setOnlinePlayers(others);
            } catch { /* silent fail */ }
        }, 3000);

        return () => clearInterval(syncInterval);
    }, [puzzle, playerColor, playerName, session]);

    const across = puzzle?.placements.filter((p) => p.direction === 'across') || [];
    const down = puzzle?.placements.filter((p) => p.direction === 'down') || [];

    // Progress % (simple: assume user fills roughly when they click check - not exact but visual)
    const [progress, setProgress] = useState(0);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse-border 1s infinite' }}>⏳</div>
                    <p style={{ color: 'var(--text-muted)' }}>Memuat puzzle...</p>
                </div>
            </div>
        );
    }

    if (notFound || !puzzle) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div style={{ textAlign: 'center' }} className="glass-card">
                    <div style={{ padding: 48 }}>
                        <div style={{ fontSize: 60, marginBottom: 16 }}>😕</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Puzzle tidak ditemukan</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>ID puzzle tidak valid atau sudah dihapus.</p>
                        <Link href="/"><button className="btn-primary">← Kembali ke Home</button></Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Completion overlay */}
            {completed && showOverlay && (
                <div className="success-overlay">
                    <div className="success-card" style={{ position: 'relative' }}>
                        {/* Close (back) button */}
                        <button
                            onClick={() => setShowOverlay(false)}
                            style={{
                                position: 'absolute', top: 12, right: 12,
                                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                color: 'var(--text-muted)', borderRadius: 8, width: 32, height: 32,
                                cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            title="Kembali ke puzzle"
                        >
                            ←
                        </button>

                        <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
                        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                            <span className="gradient-text">Selesai!</span>
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 24 }}>
                            Kamu berhasil menyelesaikan puzzle ini!
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 12 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>WAKTU</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-light)' }}>{formatTime(seconds)}</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 12 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>HINT</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>{hintsUsed}</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 12, border: '1px solid rgba(34,211,238,0.2)' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>SKOR</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
                                    {finalScore !== null ? finalScore : Math.max(100, 10000 - (seconds * 2) - (hintsUsed * 200))}
                                </div>
                            </div>
                        </div>

                        {!scoreSubmitted ? (
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    Menyimpan skor...
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                                <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, color: 'var(--green)', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'center' }}>
                                    ✅ Skor Berhasil Disimpan sebagai <strong>{playerName}</strong>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <Link href="/"><button className="btn-secondary">🏠 Home</button></Link>
                            <button className="btn-primary" onClick={() => { setCompleted(false); setShowOverlay(false); setSeconds(0); setScoreSubmitted(false); setTimerRunning(true); }}>
                                🔄 Main Lagi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="navbar" style={{ padding: '0 24px' }}>
                <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <button className="btn-secondary" style={{ fontSize: 13 }}>← Home</button>
                        </Link>
                        <div style={{ height: 24, width: 1, background: 'var(--border)' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{puzzle.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {across.length} mendatar · {down.length} menurun
                            </div>
                        </div>
                    </div>
                    {/* Timer + hints */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Online players indicator */}
                        {onlinePlayers.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse-border 1.2s infinite' }} />
                                <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>{onlinePlayers.length} Online</span>
                                {onlinePlayers.map((p) => (
                                    <div key={p.id} title={p.name || 'Teman'} style={{ width: 20, height: 20, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white' }}>
                                        {(p.name || '?')[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ height: 30, width: 1, background: 'var(--border)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-light)', fontVariantNumeric: 'tabular-nums' }}>
                                ⏱ {formatTime(seconds)}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>WAKTU</div>
                        </div>
                        <div style={{ height: 30, width: 1, background: 'var(--border)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)' }}>💡 {hintsUsed}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>HINT</div>
                        </div>
                        <div style={{ height: 30, width: 1, background: 'var(--border)' }} />
                        {/* Progress */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{progress}%</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>PROGRESS</div>
                        </div>
                        <div style={{ height: 30, width: 1, background: 'var(--border)' }} />
                        <button
                            className="btn-gold"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => {
                                const cells = getCellsRef.current?.() || [];
                                localStorage.setItem(`print_cells_${puzzle._id}`, JSON.stringify(cells));
                                window.open(`/print/${puzzle._id}`, '_blank');
                            }}
                        >
                            🖨️ Cetak PDF
                        </button>
                        <button
                            className="btn-secondary"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => setShowShareModal(true)}
                        >
                            🔗 Share Link
                        </button>
                    </div>
                </div>
                {/* Progress bar strip */}
                <div style={{ height: 3, background: 'var(--bg-secondary)' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--accent), var(--green))', transition: 'width 0.5s ease' }} />
                </div>
            </nav>

            {/* Share Modal */}
            {showShareModal && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        className="glass-card"
                        style={{ width: '100%', maxWidth: 480, padding: 28 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🔗 Bagikan Puzzle</h2>
                            <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
                        </div>

                        {/* Public Link */}
                        <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 18 }}>🌐</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#34d399' }}>Link Publik</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Siapa saja bisa main, tanpa perlu daftar</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    readOnly
                                    value={typeof window !== 'undefined' ? window.location.href : ''}
                                    style={{ flex: 1, fontSize: 11, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                />
                                <button
                                    className="btn-secondary"
                                    style={{ fontSize: 12, padding: '8px 14px', whiteSpace: 'nowrap' }}
                                    onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied('public'); setTimeout(() => setCopied(''), 2000); }}
                                >
                                    {copied === 'public' ? '✅ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Players Only Link */}
                        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 18 }}>🔒</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-light)' }}>Link Player Only</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hanya member terdaftar yang bisa bergabung</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    readOnly
                                    value={typeof window !== 'undefined' ? `${window.location.href}?mode=players-only` : ''}
                                    style={{ flex: 1, fontSize: 11, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                />
                                <button
                                    className="btn-primary"
                                    style={{ fontSize: 12, padding: '8px 14px', whiteSpace: 'nowrap' }}
                                    onClick={() => { navigator.clipboard.writeText(`${window.location.href}?mode=players-only`); setCopied('players'); setTimeout(() => setCopied(''), 2000); }}
                                >
                                    {copied === 'players' ? '✅ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                            Bagikan ke teman, lalu kalian bisa main bareng dan adu skor di leaderboard! 🏆
                        </div>
                    </div>
                </div>
            )}

            {/* Layout: Grid + Clues */}
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
                <div className="glass-card sidebar-container" style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Leaderboard */}
                    <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            🏆 Leaderboard
                        </h2>
                        {leaderboard.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 8 }}>Belum ada skor...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {leaderboard.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: i === 0 ? 'rgba(217,119,6,0.1)' : 'var(--bg-secondary)', borderRadius: 8, border: i === 0 ? '1px solid rgba(217,119,6,0.3)' : '1px solid transparent' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: i < 3 ? 'var(--gold)' : 'var(--text-muted)', width: 14 }}>{i + 1}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.playerName}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-light)' }}>{s.totalScore}</div>
                                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{formatTime(s.timeSeconds)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ height: 1, background: 'var(--border)' }} />

                    <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 Petunjuk</h2>
                        <ClueList placements={puzzle.placements} />
                    </div>

                    {/* Info */}
                    <div className="hide-print" style={{ marginTop: 'auto', padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-secondary)' }}>Tips:</strong><br />
                        • Klik sel → ketik huruf<br />
                        • Klik 2× untuk ganti arah<br />
                        • Tombol navigasi ← → ↑ ↓<br />
                        • Skor dihitung dari waktu & hint!
                    </div>
                </div>

                {/* Grid */}
                <div>
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
                            <CrosswordGrid
                                grid={puzzle.grid}
                                placements={puzzle.placements}
                                onComplete={handleComplete}
                                onProgress={setProgress}
                                onHintUsed={() => setHintsUsed((h) => h + 1)}
                                getCellsRef={getCellsRef}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
