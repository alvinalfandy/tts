'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const errorParam = searchParams.get('error');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (errorParam === 'forbidden') setError('Akses ditolak. Akun ini tidak memiliki izin admin.');
        else if (errorParam === 'unauthenticated') setError('Silakan login terlebih dahulu untuk melanjutkan.');
    }, [errorParam]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            username,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError('Username atau password salah. Coba lagi.');
            setLoading(false);
        } else {
            router.push(callbackUrl === '/login' ? '/' : callbackUrl);
            router.refresh();
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

            <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

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

                {/* Login card */}
                <div className="glass-card" style={{ padding: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Masuk ke Akun</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                        Gunakan kredensial yang diberikan untuk login.
                    </p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Username
                            </label>
                            <input
                                className="input-field"
                                type="text"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Password
                            </label>
                            <input
                                className="input-field"
                                type="password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
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
                            {loading ? '⏳ Sedang masuk...' : '🔐 Masuk'}
                        </button>
                    </form>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Belum punya akun?{' '}
                    <Link href="/register" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600 }}>
                        Daftar di sini
                    </Link>
                </span>
            </div>



            <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
                    ← Kembali ke Home
                </Link>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
            <LoginForm />
        </Suspense>
    );
}
