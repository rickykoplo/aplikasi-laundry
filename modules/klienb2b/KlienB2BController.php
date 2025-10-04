<?php
require_once __DIR__ . '/KlienB2BModel.php';
require_once __DIR__ . '/../../helpers/utils.php'; // Diperlukan untuk generateRandomId

class KlienB2BController {
    private $conn;
    private $model;
    public function __construct($db) { 
        $this->conn = $db;
        $this->model = new KlienB2BModel($db); 
    }

    public function register($data) {
        try {
            if ($this->model->register($data['formData'])) {
                sendResponse(['message' => 'Registrasi berhasil. Akun Anda sedang menunggu persetujuan admin.']);
            } else {
                throw new Exception("Gagal melakukan registrasi.");
            }
        } catch (Exception $e) {
            sendError(409, $e->getMessage()); // 409 Conflict untuk data duplikat atau error lain
        }
    }

    public function login($data) {
        $user = $this->model->login($data['no_telpon'], $data['password']);

        if (!$user) {
            sendError(401, "Nomor telepon atau password salah.");
            return;
        }

        // Pengecekan status setelah login berhasil
        if ($user['status_akun'] === 'pending') {
            sendError(403, "Akun Anda sedang menunggu persetujuan dari admin.");
        } elseif ($user['status_akun'] === 'nonaktif') {
            sendError(403, "Akun Anda telah dinonaktifkan. Silakan hubungi admin.");
        } elseif ($user['status_akun'] === 'aktif') {
            // Jika status 'aktif'
            sendResponse(['message' => 'Login berhasil.', 'userData' => $user]);
        } else {
            sendError(500, "Status akun tidak valid.");
        }
    }
}
?>