'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!name || !username || !password) {
            setError('Semua field wajib diisi.');
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            setError('Password minimal 6 karakter.');
            setLoading(false);
            return;
        }

        // Call register API
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Registrasi gagal.');
            } else {
                setSuccess(true);
                setTimeout(() => router.push('/login'), 2000);
            }
        } catch {
            setError('Terjadi kesalahan. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Ambient glow */}
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', top: '5%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, var(--accent), #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px', boxShadow: '0 8px 30px var(--accent-glow)' }}>
                        ✦
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                        <span className="gradient-text">TTS Crossword</span>
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>TTS Crossword — Platform Teka-Teki Silang</p>
                </div>

                {/* Register card */}
                <div className="glass-card" style={{ padding: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Buat Akun Baru</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                        Daftar untuk mulai bermain TTS.
                    </p>

                    {success ? (
                        <div style={{ padding: 20, borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--green)', textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                            <div style={{ fontWeight: 700 }}>Registrasi Berhasil!</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Mengarahkan ke halaman login...</div>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Nama Lengkap
                                </label>
                                <input
                                    className="input-field"
                                    type="text"
                                    placeholder="Nama kamu"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Username
                                </label>
                                <input
                                    className="input-field"
                                    type="text"
                                    placeholder="Pilih username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Password
                                </label>
                                <input
                                    className="input-field"
                                    type="password"
                                    placeholder="Min. 6 karakter"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            {error && (
                                <div style={{ padding: '11px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, lineHeight: 1.4 }}>
                                    ⚠ {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary"
                                style={{ justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? '⏳ Mendaftar...' : '🚀 Daftar Sekarang'}
                            </button>

                            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                Sudah punya akun?{' '}
                                <Link href="/login" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600 }}>
                                    Masuk di sini
                                </Link>
                            </div>
                        </form>
                    )}
                </div>



                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
                        ← Kembali ke Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
            <RegisterForm />
        </Suspense>
    );
}
