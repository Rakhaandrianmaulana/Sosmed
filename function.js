// ===================================================================================
// PENTING: KEAMANAN
// Kunci API (API Keys) TIDAK BOLEH disimpan di sini dalam aplikasi nyata.
// Kode ini hanya untuk tujuan demonstrasi frontend.
// Siapa pun dapat melihat kunci ini jika Anda meletakkannya di sini.
//
// Untuk aplikasi yang aman:
// 1. Buat backend (misalnya, dengan Node.js, Python/Flask, PHP).
// 2. Simpan kunci API Anda di backend tersebut.
// 3. Frontend (file ini) mengirim permintaan ke backend Anda.
// 4. Backend Anda kemudian yang akan berkomunikasi dengan Pterodactyl API.
// ===================================================================================

// --- KONFIGURASI (HANYA CONTOH, JANGAN GUNAKAN KUNCI ASLI DI SINI) ---
const PTERODACTYL_DOMAIN = 'https://lanavyn.cfxcloud.com/'; // Ganti dengan domain Anda
const PTERODACTYL_API_KEY = 'ptlc_GANTI_DENGAN_KUNCI_API_BACKEND_ANDA'; // INI HARUSNYA DI BACKEND!

// Menangani event submit dari form
document.getElementById('createUserForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Mencegah form dari reload halaman

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const statusMessage = document.getElementById('statusMessage');

    // Password default sesuai permintaan Anda
    const defaultPassword = '1001';

    // Data yang akan dikirim ke Pterodactyl API
    const userData = {
        username: username,
        email: email,
        first_name: firstName,
        last_name: lastName,
        password: defaultPassword,
        root_admin: false // Set ke true jika ingin membuat admin
    };

    statusMessage.textContent = 'Memproses permintaan...';
    statusMessage.className = 'text-yellow-400';

    // Panggil fungsi untuk membuat pengguna
    createUser(userData);
});

/**
 * Fungsi untuk membuat pengguna baru melalui Pterodactyl API.
 * CATATAN: Panggilan fetch() langsung dari browser seperti ini akan GAGAL
 * karena masalah CORS dan karena mengekspos API Key. Ini hanya sebagai ilustrasi.
 * @param {object} data - Data pengguna yang akan dibuat.
 */
async function createUser(data) {
    const statusMessage = document.getElementById('statusMessage');
    const apiUrl = `${PTERODACTYL_DOMAIN}api/application/users`;

    try {
        // Ini adalah contoh bagaimana permintaan API akan terlihat.
        // Dalam aplikasi nyata, Anda akan mengirim 'data' ke backend Anda,
        // dan backend Anda yang akan menjalankan fetch() ini.
        console.log('--- DATA UNTUK DIKIRIM KE API ---');
        console.log('URL:', apiUrl);
        console.log('Data Pengguna:', data);
        console.log('Metode: POST');
        console.log('---------------------------------');

        // Simulasi panggilan API (karena panggilan langsung tidak aman/tidak akan berfungsi)
        // Ganti bagian ini dengan panggilan ke backend Anda sendiri
        alert(`
            PERINGATAN KEAMANAN:
            Ini hanyalah simulasi. Panggilan API langsung dari browser tidak aman.

            Data yang akan dikirim:
            - Username: ${data.username}
            - Email: ${data.email}
            - Nama: ${data.first_name} ${data.last_name}
            - Password: (disembunyikan)

            Untuk melanjutkan, Anda perlu membuat backend untuk menangani permintaan ini dengan aman.
        `);

        // Contoh jika berhasil (simulasi)
        statusMessage.textContent = `Pengguna '${data.username}' berhasil disimulasikan!`;
        statusMessage.className = 'text-green-400';
        document.getElementById('createUserForm').reset(); // Reset form

        /*
        // --- CONTOH KODE ASLI JIKA DIJALANKAN DARI BACKEND (misal: Node.js) ---
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gagal membuat pengguna: ${errorData.errors[0].detail}`);
        }

        const result = await response.json();
        console.log('Pengguna berhasil dibuat:', result);
        statusMessage.textContent = `Pengguna '${result.attributes.username}' berhasil dibuat!`;
        statusMessage.className = 'text-green-400';
        */

    } catch (error) {
        console.error('Terjadi kesalahan:', error);
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.className = 'text-red-500';
    }
}
