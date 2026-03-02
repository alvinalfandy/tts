# TTS Crossword — Platform Teka-Teki Silang Interaktif

## 📝 Deskripsi Proyek

Aplikasi ini dirancang untuk memudahkan pembuatan puzzle TTS secara dinamis. Kreator cukup memasukkan daftar kata dan petunjuk, lalu sistem akan mencari susunan terbaik agar kata-kata tersebut saling bersinggungan secara logis. Platform ini menggabungkan logika algoritma yang kompleks dengan pengalaman pengguna yang modern dan responsif.

---

## 🛠 Tech Stack

- **Framework**: Next.js (App Router)
- **Bahasa**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Autentikasi**: Auth.js (Next-Auth)
- **UI/UX**: Tailwind CSS & Framer Motion

---

## ✨ Fitur Unggulan

- **Generator Otomatis**: Algoritma cerdas yang menyusun grid berdasarkan titik temu huruf (*intersections*) secara optimal.
- **Panel Kreator**: Form input intuitif untuk membuat, memvalidasi, dan mempublikasikan puzzle baru.
- **Interface Interaktif**: Navigasi keyboard penuh (`Arrow Keys`, `Backspace`, `Tab`) untuk pengalaman bermain yang mulus.
- **Sistem Hint & Progress**: Deteksi penyelesaian otomatis dengan bantuan petunjuk huruf sel aktif.
- **Export & Share**: Fitur cetak ke PDF dan berbagi link unik untuk setiap puzzle.

---

## 🧠 Analisis Algoritma (Core Logic)

Inti dari aplikasi ini adalah algoritma **Crossword Generation** yang efisien:

1.  **Prioritas Kata**: Mengurutkan kata berdasarkan panjang karakter untuk menentukan struktur utama grid.
2.  **Scoring Heuristic**: Menghitung skor penempatan berdasarkan jumlah persinggungan (*intersections*) dan kepadatan grid (kedekatan dengan pusat).
3.  **Cross-Validation**: Memastikan setiap huruf yang bertumpu valid dan tidak membentuk kata baru yang tidak terdefinisi di luar daftar.
4.  **Optimasi Iteratif**: Melakukan percobaan berulang (*multi-shuffle attempts*) untuk mendapatkan hasil grid yang paling rapat dan lengkap.

---

## 📁 Arsitektur Folder

- `src/app/` — Struktur halaman dan API endpoints (Next.js App Router).
- `src/components/` — Komponen UI utama (Grid Interaktif, Daftar Petunjuk).
- `src/lib/` — Logika inti (Algoritma Generator, Koneksi DB, Auth).
- `src/models/` — Definisi skema database Mongoose.

---

*Dikembangkan oleh Alvin Alfandy*
