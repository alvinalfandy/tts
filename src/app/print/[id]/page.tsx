'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Placement } from '@/lib/crossword';

interface Puzzle {
    _id: string;
    title: string;
    grid: string[][];
    placements: Placement[];
    gridSize: number;
    createdAt: string;
}

export default function PrintPage() {
    const { id } = useParams();
    const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
    const [loading, setLoading] = useState(true);
    const [filledCells, setFilledCells] = useState<string[][]>([]);
    const [generating, setGenerating] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`/api/puzzles/${id}`)
            .then(r => r.json())
            .then(data => { if (!data.error) setPuzzle(data.puzzle); })
            .finally(() => {
                setLoading(false);
                const saved = localStorage.getItem(`print_cells_${id}`);
                if (saved) setFilledCells(JSON.parse(saved));
            });
    }, [id]);

    const handleDownload = async () => {
        if (!contentRef.current || !puzzle) return;
        setGenerating(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).jsPDF;

            const canvas = await html2canvas(contentRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const ratio = canvas.width / canvas.height;
            const pdfImgH = pageW / ratio;

            if (pdfImgH <= pageH) {
                pdf.addImage(imgData, 'PNG', 0, 0, pageW, pdfImgH);
            } else {
                // Multi-page: split if content is taller than A4
                let yOffset = 0;
                while (yOffset < canvas.height) {
                    const sliceH = Math.min(canvas.height - yOffset, (canvas.width * pageH) / pageW);
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = sliceH;
                    const ctx = sliceCanvas.getContext('2d')!;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                    ctx.drawImage(canvas, 0, -yOffset);
                    if (yOffset > 0) pdf.addPage();
                    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, pageH);
                    yOffset += sliceH;
                }
            }

            const safeName = puzzle.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            pdf.save(`tts_${safeName}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('Gagal generate PDF, coba lagi.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Georgia, serif', background: '#f0f0f0' }}>
            Memuat puzzle...
        </div>
    );

    if (!puzzle) return (
        <div style={{ textAlign: 'center', padding: 40, fontFamily: 'Georgia, serif', background: '#f0f0f0', minHeight: '100vh' }}>Puzzle tidak ditemukan.</div>
    );

    const CELL = 34;
    const across = puzzle.placements.filter(p => p.direction === 'across');
    const down = puzzle.placements.filter(p => p.direction === 'down');

    const cellNumbers = new Map<string, number>();
    puzzle.placements.forEach(p => {
        const key = `${p.row},${p.col}`;
        if (!cellNumbers.has(key)) cellNumbers.set(key, p.number);
    });

    return (
        <>
            <style>{`
                *, *::before, *::after { box-sizing: border-box; }
                body { margin: 0; padding: 0; background: #e8e8e8; font-family: Georgia, 'Times New Roman', serif; }
                a { color: inherit !important; text-decoration: none !important; }
            `}</style>

            {/* Toolbar */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                color: 'white', padding: '12px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>📄</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>Preview PDF — {puzzle.title}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>Klik Download untuk langsung download file PDF</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handleDownload}
                        disabled={generating}
                        style={{
                            background: generating ? '#4c1d95' : '#7c3aed',
                            color: 'white', border: 'none',
                            padding: '10px 22px', borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                            fontWeight: 800, fontSize: 14,
                            transition: 'background 0.2s',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        {generating ? (
                            <>⏳ Generating...</>
                        ) : (
                            <>📥 Download PDF</>
                        )}
                    </button>
                    <button
                        onClick={() => window.close()}
                        style={{
                            background: 'rgba(255,255,255,0.12)', color: 'white',
                            border: '1px solid rgba(255,255,255,0.25)',
                            padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 14,
                        }}
                    >
                        ✕ Tutup
                    </button>
                </div>
            </div>

            {/* Content (captured by html2canvas) */}
            <div style={{ paddingTop: 72, paddingBottom: 40 }}>
                <div
                    ref={contentRef}
                    style={{
                        width: 794, // ~A4 at 96dpi
                        margin: '0 auto',
                        background: 'white',
                        padding: '32px 36px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center', borderBottom: '2.5px solid #000', paddingBottom: 12, marginBottom: 20 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#777', marginBottom: 5, fontFamily: 'Arial, sans-serif' }}>
                            TTS Crossword — Platform Teka-Teki Silang
                        </div>
                        <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 4px', letterSpacing: 3, textTransform: 'uppercase', color: '#111' }}>
                            {puzzle.title}
                        </h1>
                        <div style={{ fontSize: 11, color: '#999', fontFamily: 'Arial, sans-serif' }}>
                            {puzzle.placements.length} kata &nbsp;·&nbsp; {new Date(puzzle.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                        </div>
                    </div>

                    {/* Grid + Clues using flex layout */}
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                        {/* Grid column */}
                        <div style={{ flexShrink: 0 }}>
                            <table style={{ borderCollapse: 'collapse', border: '2px solid #000' }}>
                                <tbody>
                                    {puzzle.grid.map((row, r) => (
                                        <tr key={r}>
                                            {row.map((cell, c) => {
                                                const isBlocked = cell === '';
                                                const num = cellNumbers.get(`${r},${c}`);
                                                const filled = filledCells[r]?.[c];
                                                return (
                                                    <td
                                                        key={c}
                                                        style={{
                                                            width: CELL,
                                                            height: CELL,
                                                            padding: 0,
                                                            border: isBlocked ? 'none' : '1px solid #555',
                                                            backgroundColor: isBlocked ? '#111' : '#fff',
                                                            position: 'relative',
                                                            verticalAlign: 'top',
                                                        }}
                                                    >
                                                        {!isBlocked && num && (
                                                            <span style={{
                                                                position: 'absolute', top: 1, left: 2,
                                                                fontSize: 7, fontWeight: 900, lineHeight: 1,
                                                                fontFamily: 'Arial, sans-serif', color: '#111',
                                                            }}>
                                                                {num}
                                                            </span>
                                                        )}
                                                        {!isBlocked && filled && (
                                                            <span style={{
                                                                position: 'absolute', inset: 0,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 15, fontWeight: 900,
                                                                fontFamily: 'Arial, sans-serif', color: '#111',
                                                                paddingTop: 3,
                                                            }}>
                                                                {filled}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Clues column */}
                        <div style={{ flex: 1, fontSize: 11, lineHeight: 1.5, fontFamily: 'Arial, sans-serif', color: '#222' }}>
                            {/* Mendatar */}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, borderBottom: '2px solid #000', paddingBottom: 4, marginBottom: 7 }}>
                                    → Mendatar
                                </div>
                                {across.map(p => (
                                    <div key={p.number} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                                        <span style={{ fontWeight: 900, minWidth: 18, flexShrink: 0, color: '#111' }}>{p.number}.</span>
                                        <span style={{ color: '#333' }}>{p.clue}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Menurun */}
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, borderBottom: '2px solid #000', paddingBottom: 4, marginBottom: 7 }}>
                                    ↓ Menurun
                                </div>
                                {down.map(p => (
                                    <div key={p.number} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
                                        <span style={{ fontWeight: 900, minWidth: 18, flexShrink: 0, color: '#111' }}>{p.number}.</span>
                                        <span style={{ color: '#333' }}>{p.clue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>{/* end clues col */}
                    </div>{/* end flex row */}

                    {/* Footer */}
                    <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #ddd', fontSize: 9, color: '#bbb', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
                        Dibuat dengan TTS Crossword Platform
                    </div>
                </div>{/* end white page */}
            </div>{/* end outer padding */}
        </>
    );
}
