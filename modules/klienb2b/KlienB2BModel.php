<?php
class KlienB2BModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function register($data) {
        // 1. Cek dulu apakah no telpon sudah terdaftar di tabel pengguna_b2b
        $stmt_check = $this->conn->prepare("SELECT id_pengguna FROM pengguna_b2b WHERE no_telpon = ?");
        $stmt_check->bind_param("s", $data['no_telpon']);
        $stmt_check->execute();
        if ($stmt_check->get_result()->num_rows > 0) {
            throw new Exception("Nomor telepon sudah terdaftar. Silakan login.");
        }

        // 2. Validasi dan buat data perusahaan baru di tabel 'konsumen'
        if (empty($data['nama_perusahaan'])) {
            throw new Exception("Nama perusahaan wajib diisi.");
        }
        $new_konsumen_id = generateRandomId('KSM');
        $stmt_new_konsumen = $this->conn->prepare(
            "INSERT INTO konsumen (id_konsumen, nama_konsumen, nama_perusahaan, tipe_konsumen) VALUES (?, ?, ?, 'B2B')"
        );
        $stmt_new_konsumen->bind_param("sss", $new_konsumen_id, $data['nama_lengkap'], $data['nama_perusahaan']);
        if (!$stmt_new_konsumen->execute()) {
            throw new Exception("Gagal membuat data perusahaan baru: " . $stmt_new_konsumen->error);
        }
        
        // 3. Amankan password dan simpan data pengguna baru
        $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);

        $stmt_pengguna = $this->conn->prepare(
            "INSERT INTO pengguna_b2b (id_konsumen, nama_lengkap, no_telpon, password, jabatan, status_akun) VALUES (?, ?, ?, ?, ?, 'pending')"
        );
        $stmt_pengguna->bind_param(
            "sssss", 
            $new_konsumen_id,
            $data['nama_lengkap'], 
            $data['no_telpon'], 
            $hashed_password, 
            $data['jabatan']
        );
        
        return $stmt_pengguna->execute();
    }

    public function login($no_telpon, $password) {
        $stmt = $this->conn->prepare("SELECT * FROM pengguna_b2b WHERE no_telpon = ?");
        $stmt->bind_param("s", $no_telpon);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if ($user && password_verify($password, $user['password'])) {
            unset($user['password']); 
            return $user;
        }

        return null; // Login gagal
    }
}
?>