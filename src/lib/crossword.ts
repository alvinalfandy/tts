// ============================================================
// ALGORITMA GENERATOR TEKA-TEKI SILANG (TTS)
// ============================================================
// Dikembangkan oleh: Alvin Alfandy
//
// PENDEKATAN TEKNIS:
// 1. Sort Awal: Kata dari input diurutkan (Sort) dari terpanjang ke terpendek.
//    Kata panjang bertindak sebagai 'jangkar' yang lebih mudah dihubungkan.
//
// 2. Base Placement: Kata pertama diletakkan secara horizontal di pusat grid
//    untuk memaksimalkan ruang ekspansi ke segala arah.
//
// 3. Heuristic Search: Untuk setiap kata berikutnya:
//    - Pencarian posisi (Brute-force candidate search) di seluruh grid.
//    - Validasi penempatan (canPlace): Memastikan huruf yang bersinggungan (intersect)
//      sama, tidak ada tabrakan (collision), dan tidak membentuk kata baru yang 
//      tidak valid (adjacent cell validation).
//
// 4. Scoring System: Setiap kandidat posisi dinilai (Scoring):
//    - (+) Bonus besar untuk jumlah Intersection (Koneksi terbanyak).
//    - (+) Bonus kedekatan ke pusat (Proximity to center) agar grid tetap padat (Compact).
//    - Penempatan dengan skor tertinggi dipilih.
//
// 5. Multi-Try Optimization: Algoritma melakukan 30-50 percobaan (Random Shuffles)
//    untuk menemukan konfigurasi grid dengan jumlah kata terpasang paling maksimal.
// ============================================================

export type Direction = 'across' | 'down';

export interface WordEntry {
    word: string;
    clue: string;
}

export interface Placement {
    word: string;
    clue: string;
    row: number;
    col: number;
    direction: Direction;
    number: number;
}

export interface CrosswordResult {
    grid: string[][];
    placements: Placement[];
    unplaced: string[];
    gridSize: number;
}

const GRID_SIZE = 21; // Fixed grid size, 21x21 seperti NYT Crossword

function createEmptyGrid(size: number): string[][] {
    return Array.from({ length: size }, () => Array(size).fill(''));
}

function canPlace(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
    size: number
): boolean {
    const len = word.length;

    // Cek batas grid
    if (direction === 'across') {
        if (col < 0 || col + len > size) return false;
        if (row < 0 || row >= size) return false;
    } else {
        if (row < 0 || row + len > size) return false;
        if (col < 0 || col >= size) return false;
    }

    let intersections = 0;

    for (let i = 0; i < len; i++) {
        const r = direction === 'across' ? row : row + i;
        const c = direction === 'across' ? col + i : col;
        const cell = grid[r][c];
        const letter = word[i];

        if (cell === '') {
            // Sel kosong - cek tidak ada kata sejajar yang akan bentrok
            if (direction === 'across') {
                // Pastikan tidak ada huruf di atas/bawah yang menyebabkan kata baru yang tidak valid
                const hasTop = r > 0 && grid[r - 1][c] !== '';
                const hasBottom = r < size - 1 && grid[r + 1][c] !== '';
                if (hasTop || hasBottom) return false;
            } else {
                const hasLeft = c > 0 && grid[r][c - 1] !== '';
                const hasRight = c < size - 1 && grid[r][c + 1] !== '';
                if (hasLeft || hasRight) return false;
            }
        } else if (cell === letter) {
            // Ada huruf yang sama - ini intersection yang valid
            intersections++;
        } else {
            // Ada huruf berbeda - tidak bisa ditempatkan
            return false;
        }
    }

    // Harus ada minimal 1 intersection (kecuali kata pertama)
    const isFirstWord = grid.flat().every((c) => c === '');
    if (!isFirstWord && intersections === 0) return false;

    // Cek ujung kata tidak menempel ke kata lain
    if (direction === 'across') {
        if (col > 0 && grid[row][col - 1] !== '') return false;
        if (col + len < size && grid[row][col + len] !== '') return false;
    } else {
        if (row > 0 && grid[row - 1][col] !== '') return false;
        if (row + len < size && grid[row + len][col] !== '') return false;
    }

    return true;
}

function placeWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction
): void {
    for (let i = 0; i < word.length; i++) {
        const r = direction === 'across' ? row : row + i;
        const c = direction === 'across' ? col + i : col;
        grid[r][c] = word[i];
    }
}

function countIntersections(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction
): number {
    let count = 0;
    for (let i = 0; i < word.length; i++) {
        const r = direction === 'across' ? row : row + i;
        const c = direction === 'across' ? col + i : col;
        if (grid[r][c] === word[i]) count++;
    }
    return count;
}

interface CandidatePosition {
    row: number;
    col: number;
    direction: Direction;
    intersections: number;
    distanceFromCenter: number;
}

function findBestPosition(
    grid: string[][],
    word: string,
    size: number
): CandidatePosition | null {
    const center = Math.floor(size / 2);
    const candidates: CandidatePosition[] = [];

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            for (const direction of ['across', 'down'] as Direction[]) {
                if (canPlace(grid, word, r, c, direction, size)) {
                    const intersections = countIntersections(grid, word, r, c, direction);
                    const distanceFromCenter = Math.abs(r - center) + Math.abs(c - center);
                    candidates.push({ row: r, col: c, direction, intersections, distanceFromCenter });
                }
            }
        }
    }

    if (candidates.length === 0) return null;

    // Pilih candidate dengan intersection terbanyak, jika sama pilih yang paling dekat ke tengah
    candidates.sort((a, b) => {
        if (b.intersections !== a.intersections) return b.intersections - a.intersections;
        return a.distanceFromCenter - b.distanceFromCenter;
    });

    return candidates[0];
}

// Generate satu percobaan susunan grid
function generateSingleLayout(entries: WordEntry[]): CrosswordResult {
    const grid = createEmptyGrid(GRID_SIZE);
    const center = Math.floor(GRID_SIZE / 2);
    const placements: Placement[] = [];
    const unplaced: string[] = [];

    // Konversi kata ke uppercase dan bersihkan spasi
    const normalizedEntries = entries.map((e) => ({
        ...e,
        word: e.word.toUpperCase().replace(/\s+/g, ''),
    }));

    let clueNumber = 1;

    for (let idx = 0; idx < normalizedEntries.length; idx++) {
        const { word, clue } = normalizedEntries[idx];

        if (idx === 0) {
            // Kata pertama: acak arah (Across/Down) dan sedikit offset dari tengah
            const direction: Direction = Math.random() > 0.5 ? 'across' : 'down';
            const offset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            const r = center + offset;
            const c = center + offset;

            if (direction === 'across') {
                const startCol = c - Math.floor(word.length / 2);
                if (canPlace(grid, word, r, startCol, 'across', GRID_SIZE)) {
                    placeWord(grid, word, r, startCol, 'across');
                    placements.push({ word, clue, row: r, col: startCol, direction: 'across', number: clueNumber++ });
                } else {
                    unplaced.push(word);
                }
            } else {
                const startRow = r - Math.floor(word.length / 2);
                if (canPlace(grid, word, startRow, c, 'down', GRID_SIZE)) {
                    placeWord(grid, word, startRow, c, 'down');
                    placements.push({ word, clue, row: startRow, col: c, direction: 'down', number: clueNumber++ });
                } else {
                    unplaced.push(word);
                }
            }
        } else {
            const best = findBestPosition(grid, word, GRID_SIZE);
            if (best) {
                placeWord(grid, word, best.row, best.col, best.direction);
                placements.push({
                    word,
                    clue,
                    row: best.row,
                    col: best.col,
                    direction: best.direction,
                    number: clueNumber++,
                });
            } else {
                unplaced.push(word);
            }
        }
    }

    // Re-number dan trim logic (sama seperti sebelumnya)
    placements.sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
    });
    placements.forEach((p, i) => {
        p.number = i + 1;
    });

    let minRow = GRID_SIZE, maxRow = 0, minCol = GRID_SIZE, maxCol = 0;
    let hasPlaced = false;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== '') {
                hasPlaced = true;
                minRow = Math.min(minRow, r);
                maxRow = Math.max(maxRow, r);
                minCol = Math.min(minCol, c);
                maxCol = Math.max(maxCol, c);
            }
        }
    }

    if (!hasPlaced) return { grid: [[]], placements: [], unplaced: entries.map(e => e.word), gridSize: 0 };

    minRow = Math.max(0, minRow - 1);
    minCol = Math.max(0, minCol - 1);
    maxRow = Math.min(GRID_SIZE - 1, maxRow + 1);
    maxCol = Math.min(GRID_SIZE - 1, maxCol + 1);

    const trimmedGrid = grid.slice(minRow, maxRow + 1).map((row) => row.slice(minCol, maxCol + 1));
    placements.forEach((p) => {
        p.row -= minRow;
        p.col -= minCol;
    });

    return { grid: trimmedGrid, placements, unplaced, gridSize: trimmedGrid.length };
}

// Main function: Mencoba beberapa kali dengan shuffle untuk hasil terbaik
export function generateCrossword(entries: WordEntry[]): CrosswordResult {
    let bestResult: CrosswordResult | null = null;
    const ATTEMPTS = 30; // Coba 30 kali susunan berbeda

    // Sort awal: terpanjang dulu (biasanya baseline terbaik)
    const initialSorted = [...entries].sort((a, b) => b.word.length - a.word.length);
    bestResult = generateSingleLayout(initialSorted);

    if (bestResult.unplaced.length === 0) return bestResult;

    for (let i = 0; i < ATTEMPTS; i++) {
        // Acak urutan kata (shuffle)
        const shuffled = [...entries].sort(() => Math.random() - 0.5);
        const result = generateSingleLayout(shuffled);

        if (result.unplaced.length < bestResult!.unplaced.length) {
            bestResult = result;
        }

        // Jika sudah sempurna (0 unplaced), langsung return
        if (bestResult.unplaced.length === 0) break;
    }

    return bestResult!;
}
