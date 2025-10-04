<?php
/**
 * File: app/modules/auth/AuthModel.php
 * Model untuk modul Autentikasi.
 * Mengelola semua interaksi dengan database yang terkait dengan user.
 */

class AuthModel {
    private $conn;

    // Menerima koneksi database saat diinisialisasi
    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Mengambil data user dari database berdasarkan username (id_karyawan).
     * @param string $username ID Karyawan yang akan dicari.
     * @return array|null Data user jika ditemukan, atau null jika tidak.
     */
    public function getUserByUsername($username) {
        // Menggunakan prepared statement untuk keamanan dari SQL Injection
        $stmt = $this->conn->prepare("SELECT * FROM karyawan WHERE id_karyawan = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Mengembalikan satu baris data sebagai associative array
        return $result->fetch_assoc();
    }
}

