'use client';

import { Placement } from '@/lib/crossword';

interface ClueListProps {
    placements: Placement[];
    activeClue?: number | null;
    completedWords?: Set<string>;
    onClueClick?: (placement: Placement) => void;
}

export default function ClueList({ placements, activeClue, completedWords, onClueClick }: ClueListProps) {
    const across = placements.filter((p) => p.direction === 'across').sort((a, b) => a.number - b.number);
    const down = placements.filter((p) => p.direction === 'down').sort((a, b) => a.number - b.number);

    const renderClue = (p: Placement) => {
        const isActive = activeClue === p.number;
        const isCompleted = completedWords?.has(p.word);
        return (
            <div
                key={`${p.direction}-${p.number}`}
                className={`clue-item ${isActive ? 'active-clue' : ''} ${isCompleted ? 'completed-clue' : ''}`}
                onClick={() => onClueClick?.(p)}
            >
                <span className="clue-number">{p.number}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {p.clue}
                    {isCompleted && <span style={{ marginLeft: 6 }}>✓</span>}
                </span>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h3
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        color: 'var(--accent-light)',
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: '1px solid var(--border)',
                    }}
                >
                    ↔ Mendatar (Across)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {across.map(renderClue)}
                </div>
            </div>

            <div>
                <h3
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        color: 'var(--gold)',
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: '1px solid var(--border)',
                    }}
                >
                    ↕ Menurun (Down)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {down.map(renderClue)}
                </div>
            </div>
        </div>
    );
}
