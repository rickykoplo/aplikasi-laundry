<?php
/**
 * File: app/modules/auth/AuthController.php
 * Controller untuk otentikasi pengguna.
 */

class AuthController
{
    private $conn; // <-- PERBEDAAN 1: Variabelnya $conn, bukan $model

    public function __construct($db)
    {
        $this->conn = $db; // <-- PERBEDAAN 2: Di sini kita mengisi $this->conn
    }

    /**
     * Memproses login pengguna.
     */
    public function login($data)
{
    try {
        if (empty($data['username']) || empty($data['password'])) {
            throw new Exception('ID Karyawan dan password harus diisi.', 400);
        }

        // 1. Ambil data pengguna berdasarkan ID Karyawan
        $stmt = $this->conn->prepare("SELECT * FROM karyawan WHERE id_karyawan = ?");
        $stmt->bind_param("s", $data['username']);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            
            // --- PERBAIKAN UTAMA DI SINI ---
            // 2. Verifikasi password menggunakan password_verify()
            if (password_verify($data['password'], $user['password'])) {
                
                // 3. Jika berhasil, siapkan data untuk dikirim ke frontend
                $userData = [
                    'username' => $user['id_karyawan'],
                    'namaLengkap' => $user['nama_lengkap'],
                    'role' => $user['role'],
                    'id_outlet' => $user['id_outlet'],
                    'foto_profil' => $user['foto_profil'] // Kirim juga foto profil
                ];
                sendResponse(['message' => 'Login berhasil', 'userData' => $userData]);

            } else {
                // Jika password tidak cocok
                throw new Exception('Password salah.', 401);
            }
            // --- AKHIR PERBAIKAN ---

        } else {
            throw new Exception('ID Karyawan tidak ditemukan.', 404);
        }
    } catch (Exception $e) {
        sendError($e->getCode() ?: 500, $e->getMessage());
    }
}
}