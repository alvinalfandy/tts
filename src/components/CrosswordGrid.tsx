'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Placement } from '@/lib/crossword';

interface CrosswordGridProps {
    grid: string[][];
    placements: Placement[];
    readOnly?: boolean;
    onComplete?: () => void;
    onProgress?: (pct: number) => void;
    onHintUsed?: () => void;
    onCellChange?: (key: string, value: string) => void;
    remoteCells?: Record<string, { value: string; color: string; playerName: string }>;
    getCellsRef?: React.MutableRefObject<(() => string[][]) | null>;
    setCellsRef?: React.MutableRefObject<((vals: Record<string, string>) => void) | null>;
}

interface CellState {
    value: string;
    correct?: boolean;
}

export default function CrosswordGrid({ grid, placements, readOnly = false, onComplete, onProgress, onHintUsed, onCellChange, remoteCells = {}, getCellsRef, setCellsRef }: CrosswordGridProps) {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    // Build a lookup: [row][col] -> letter (answer)
    const answers = useRef<string[][]>(
        Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => grid[r][c])
        )
    );

    // Cell user input state
    const [cells, setCells] = useState<CellState[][]>(
        Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({ value: '' }))
        )
    );

    const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
    const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
    const [activeWordCells, setActiveWordCells] = useState<Set<string>>(new Set());
    const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());
    const [hintedCells, setHintedCells] = useState<Set<string>>(new Set());
    const [completed, setCompleted] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[][]>(
        Array.from({ length: rows }, () => Array(cols).fill(null))
    );

    // Expose current cell values to parent via ref
    useEffect(() => {
        if (getCellsRef) {
            getCellsRef.current = () => cells.map(row => row.map(cell => cell.value));
        }
    }, [cells, getCellsRef]);

    // INTERVIEW-READY: Ini cara kita mensinkronkan data dari pemain lain ke grid lokal.
    useEffect(() => {
        if (setCellsRef) {
            setCellsRef.current = (updates: Record<string, string>) => {
                setCells(prev => {
                    const next = prev.map(row => row.map(cell => ({ ...cell })));
                    let changed = false;
                    Object.entries(updates).forEach(([key, val]) => {
                        const [r, c] = key.split(',').map(Number);
                        if (next[r] && next[r][c] && next[r][c].value !== val) {
                            next[r][c].value = val;
                            changed = true;
                        }
                    });
                    return changed ? next : prev;
                });
            };
        }
    }, [setCellsRef]);

    // Build cell-number lookup: [row][col] -> number
    const cellNumbers = useRef<Map<string, number>>(new Map());
    useEffect(() => {
        placements.forEach((p) => {
            const key = `${p.row},${p.col}`;
            if (!cellNumbers.current.has(key)) {
                cellNumbers.current.set(key, p.number);
            }
        });
    }, [placements]);

    // Find word cells for a given placement
    const getWordCells = useCallback((placement: Placement): string[] => {
        const result: string[] = [];
        for (let i = 0; i < placement.word.length; i++) {
            const r = placement.direction === 'across' ? placement.row : placement.row + i;
            const c = placement.direction === 'across' ? placement.col + i : placement.col;
            result.push(`${r},${c}`);
        }
        return result;
    }, []);

    // Find placement(s) at a given cell in the given direction
    const getPlacementsAtCell = useCallback(
        (r: number, c: number, dir: 'across' | 'down'): Placement | undefined => {
            return placements.find((p) => {
                if (p.direction !== dir) return false;
                if (p.direction === 'across') {
                    return p.row === r && c >= p.col && c < p.col + p.word.length;
                } else {
                    return p.col === c && r >= p.row && r < p.row + p.word.length;
                }
            });
        },
        [placements]
    );

    const updateActiveWord = useCallback(
        (r: number, c: number, dir: 'across' | 'down') => {
            const placement = getPlacementsAtCell(r, c, dir);
            if (placement) {
                setActiveWordCells(new Set(getWordCells(placement)));
            } else {
                // Try the other direction
                const other = dir === 'across' ? 'down' : 'across';
                const p2 = getPlacementsAtCell(r, c, other);
                if (p2) {
                    setActiveWordCells(new Set(getWordCells(p2)));
                    setActiveDirection(other);
                } else {
                    setActiveWordCells(new Set());
                }
            }
        },
        [getPlacementsAtCell, getWordCells]
    );

    const handleCellClick = (r: number, c: number) => {
        if (grid[r][c] === '') return; // blocked
        if (readOnly) return;

        if (activeCell?.r === r && activeCell?.c === c) {
            // Toggle direction
            const newDir = activeDirection === 'across' ? 'down' : 'across';
            setActiveDirection(newDir);
            updateActiveWord(r, c, newDir);
        } else {
            setActiveCell({ r, c });
            updateActiveWord(r, c, activeDirection);
        }

        inputRefs.current[r][c]?.focus();
    };

    const moveToNext = useCallback(
        (r: number, c: number, dir: 'across' | 'down', currentCells: CellState[][]) => {
            // Cari sel KOSONG berikutnya dalam arah kata — skip sel yang sudah terisi
            if (dir === 'across') {
                let nextC = c + 1;
                while (nextC < cols && grid[r][nextC] !== '') {
                    if (!currentCells[r][nextC].value) break; // found empty → stop
                    nextC++;
                }
                if (nextC < cols && grid[r][nextC] !== '') {
                    setActiveCell({ r, c: nextC });
                    updateActiveWord(r, nextC, dir);
                    inputRefs.current[r]?.[nextC]?.focus();
                }
            } else {
                let nextR = r + 1;
                while (nextR < rows && grid[nextR][c] !== '') {
                    if (!currentCells[nextR][c].value) break; // found empty → stop
                    nextR++;
                }
                if (nextR < rows && grid[nextR][c] !== '') {
                    setActiveCell({ r: nextR, c });
                    updateActiveWord(nextR, c, dir);
                    inputRefs.current[nextR]?.[c]?.focus();
                }
            }
        },
        [cols, rows, grid, updateActiveWord]
    );

    const moveToPrev = useCallback(
        (r: number, c: number, dir: 'across' | 'down') => {
            if (dir === 'across') {
                if (c - 1 >= 0 && grid[r][c - 1] !== '') {
                    setActiveCell({ r, c: c - 1 });
                    updateActiveWord(r, c - 1, dir);
                    inputRefs.current[r][c - 1]?.focus();
                }
            } else {
                if (r - 1 >= 0 && grid[r - 1][c] !== '') {
                    setActiveCell({ r: r - 1, c });
                    updateActiveWord(r - 1, c, dir);
                    inputRefs.current[r - 1][c]?.focus();
                }
            }
        },
        [rows, cols, grid, updateActiveWord]
    );

    // LOGIKA NAVIGASI: Fungsi ini mengatur pergerakan kursor di dalam grid.
    // Pemain bisa berpindah antar sel menggunakan tombol ARAH (Arrow Keys).
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, row: number, col: number) => {
            if (readOnly) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (activeDirection !== 'across') { setActiveDirection('across'); updateActiveWord(row, col, 'across'); }
                else if (col + 1 < cols && grid[row][col + 1] !== '') { setActiveCell({ r: row, c: col + 1 }); updateActiveWord(row, col + 1, 'across'); inputRefs.current[row][col + 1]?.focus(); }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (activeDirection !== 'across') { setActiveDirection('across'); updateActiveWord(row, col, 'across'); }
                else if (col - 1 >= 0 && grid[row][col - 1] !== '') { setActiveCell({ r: row, c: col - 1 }); updateActiveWord(row, col - 1, 'across'); inputRefs.current[row][col - 1]?.focus(); }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (activeDirection !== 'down') { setActiveDirection('down'); updateActiveWord(row, col, 'down'); }
                else if (row + 1 < rows && grid[row + 1][col] !== '') { setActiveCell({ r: row + 1, c: col }); updateActiveWord(row + 1, col, 'down'); inputRefs.current[row + 1][col]?.focus(); }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (activeDirection !== 'down') { setActiveDirection('down'); updateActiveWord(row, col, 'down'); }
                else if (row - 1 >= 0 && grid[row - 1][col] !== '') { setActiveCell({ r: row - 1, c: col }); updateActiveWord(row - 1, col, 'down'); inputRefs.current[row - 1][col]?.focus(); }
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                const current = cells[row][col].value;
                if (current) {
                    const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
                    newCells[row][col] = { value: '' };
                    setCells(newCells);
                    setCheckedCells((prev) => { const s = new Set(prev); s.delete(`${row},${col}`); return s; });
                } else {
                    moveToPrev(row, col, activeDirection);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const currentP = getPlacementsAtCell(row, col, activeDirection);
                if (currentP) {
                    const idx = placements.indexOf(currentP);
                    const nextIdx = e.shiftKey
                        ? (idx - 1 + placements.length) % placements.length
                        : (idx + 1) % placements.length;
                    const nextP = placements[nextIdx];
                    setActiveCell({ r: nextP.row, c: nextP.col });
                    setActiveDirection(nextP.direction);
                    updateActiveWord(nextP.row, nextP.col, nextP.direction);
                    inputRefs.current[nextP.row]?.[nextP.col]?.focus();
                }
            }
        },
        [activeDirection, updateActiveWord, cols, rows, grid, cells, moveToPrev, readOnly, placements, getPlacementsAtCell]
    );

    const checkProgress = useCallback(
        (currentCells: CellState[][]) => {
            let totalCells = 0;
            let filledCells = 0;
            let allCorrect = true;

            for (let rr = 0; rr < rows; rr++) {
                for (let cc = 0; cc < cols; cc++) {
                    if (answers.current[rr][cc] !== '') {
                        totalCells++;
                        const cellVal = currentCells[rr][cc].value;
                        if (cellVal) filledCells++;
                        if (cellVal !== answers.current[rr][cc]) allCorrect = false;
                    }
                }
            }

            if (totalCells > 0) onProgress?.(Math.round((filledCells / totalCells) * 100));
            if (filledCells === totalCells && allCorrect && !completed) {
                setCompleted(true);
                onComplete?.();
            }
        },
        [rows, cols, onProgress, onComplete, completed]
    );

    // UX POLISH: Mengatur fokus secara otomatis saat user mengetik huruf.
    // Jika sel sudah diisi, kursor akan otomatis pindah ke sel berikutnya.
    const handleInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, row: number, col: number) => {
            if (readOnly) return;
            const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
            const newCells = cells.map((r) => r.map((cell) => ({ ...cell })));
            newCells[row][col] = { value: val };
            setCells(newCells);
            setCheckedCells((prev) => { const s = new Set(prev); s.delete(`${row},${col}`); return s; });

            // Notify parent for collaborative sync
            onCellChange?.(`${row},${col}`, val);

            // Kirim newCells agar moveToNext tahu sel mana yang sudah terisi
            if (val) moveToNext(row, col, activeDirection, newCells);

            checkProgress(newCells);
        },
        [readOnly, cells, moveToNext, activeDirection, checkProgress, onCellChange]
    );

    const checkAnswers = () => {
        const newChecked = new Set<string>();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (cells[r][c].value) newChecked.add(`${r},${c}`);
            }
        }
        setCheckedCells(newChecked);
    };

    const revealHint = () => {
        if (!activeCell) return;
        const { r, c } = activeCell;
        if (cells[r][c].value === answers.current[r][c]) return; // Already correct

        const answer = answers.current[r][c];
        if (!answer) return;

        const newCells = cells.map((row) => row.map((cell) => ({ ...cell })));
        newCells[r][c] = { value: answer };
        setCells(newCells);
        setHintedCells((prev) => new Set(prev).add(`${r},${c}`));

        onHintUsed?.();
        checkProgress(newCells);
    };

    const getCellClass = (r: number, c: number): string => {
        const key = `${r},${c}`;
        const isBlocked = grid[r][c] === '';
        if (isBlocked) return 'cell blocked';

        const isActive = activeCell?.r === r && activeCell?.c === c;
        const isWordHighlight = activeWordCells.has(key);
        const isChecked = checkedCells.has(key);
        const isHinted = hintedCells.has(key);

        let classes = 'cell filled';
        if (isChecked && cells[r][c].value) {
            const isCorrect = cells[r][c].value === answers.current[r][c];
            classes += isCorrect ? ' correct' : ' incorrect';
        }

        if (isActive) classes += ' active';
        else if (isWordHighlight) classes += ' word-highlight';

        if (isHinted) classes += ' hinted';

        return classes;
    };

    return (
        <div>
            {/* Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, auto)`,
                    gap: '1px',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '1px',
                    borderRadius: '8px',
                    width: 'fit-content',
                }}
            >
                {grid.map((row, r) =>
                    row.map((letter, c) => {
                        const key = `${r},${c}`;
                        const num = cellNumbers.current.get(key);
                        const cellClass = getCellClass(r, c);
                        const remoteCell = (letter !== '' && !cells[r]?.[c]?.value && remoteCells[key]?.value)
                            ? remoteCells[key]
                            : null;

                        return (
                            <div
                                key={`${r}-${c}`}
                                className={cellClass}
                                style={remoteCell ? { background: remoteCell.color + '30', borderColor: remoteCell.color } : undefined}
                                onClick={() => handleCellClick(r, c)}
                                title={remoteCell ? `${remoteCell.playerName} sedang mengisi` : undefined}
                            >
                                {num && <span className="cell-number">{num}</span>}
                                {/* Remote player value */}
                                {remoteCell && (
                                    <span style={{ fontSize: 14, fontWeight: 800, color: remoteCell.color, opacity: 0.85 }}>
                                        {remoteCell.value}
                                    </span>
                                )}
                                {letter !== '' && !readOnly && !remoteCell && (
                                    <input
                                        ref={(el) => { inputRefs.current[r] = inputRefs.current[r] || []; inputRefs.current[r][c] = el; }}
                                        type="text"
                                        value={cells[r][c].value}
                                        onChange={(e) => handleInput(e, r, c)}
                                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                                        onFocus={() => {
                                            setActiveCell({ r, c });
                                            updateActiveWord(r, c, activeDirection);
                                        }}
                                        maxLength={1}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        id={`cell-${r}-${c}`}
                                    />
                                )}
                                {letter !== '' && !readOnly && remoteCell && (
                                    <input
                                        ref={(el) => { inputRefs.current[r] = inputRefs.current[r] || []; inputRefs.current[r][c] = el; }}
                                        type="text"
                                        value={cells[r][c].value}
                                        onChange={(e) => handleInput(e, r, c)}
                                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                                        onFocus={() => {
                                            setActiveCell({ r, c });
                                            updateActiveWord(r, c, activeDirection);
                                        }}
                                        maxLength={1}
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        id={`cell-${r}-${c}`}
                                        style={{ opacity: 0, position: 'absolute' }}
                                    />
                                )}
                                {readOnly && letter !== '' && (
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {letter}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Controls */}
            {!readOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ fontSize: 13 }} onClick={checkAnswers}>
                        🔍 Cek Jawaban
                    </button>
                    <button className="btn-secondary" style={{ fontSize: 13 }} onClick={revealHint}>
                        💡 Hint Sel Aktif
                    </button>
                </div>
            )}
        </div>
    );
}
