<?php
/**
 * File: app/modules/karyawan/KaryawanController.php
 * Controller untuk modul Karyawan.
 */

require_once __DIR__ . '/KaryawanModel.php';

class KaryawanController {
    private $conn; // Tambahkan properti ini
    private $model;

    public function __construct($db) {
        $this->conn = $db; // Tambahkan baris ini untuk menyimpan koneksi DB
        $this->model = new KaryawanModel($db);
    }

    /**
     * FUNGSI BARU: Mengambil data opsi (seperti outlet) untuk form.
     */
    public function getOptions() {
    try {
        // Ambil data outlets
        $outlets = [];
        $resultOutlets = $this->conn->query("SELECT id_outlet, nama_outlet FROM outlet ORDER BY nama_outlet ASC");
        while($row = $resultOutlets->fetch_assoc()) {
            $outlets[] = $row;
        }

        // Ambil data shifts
        $shifts = [];
        $resultShifts = $this->conn->query("SELECT id_shift, nama_shift FROM master_shift ORDER BY nama_shift ASC");
        while($row = $resultShifts->fetch_assoc()) {
            $shifts[] = $row;
        }

        // Kirim keduanya ke frontend
        sendResponse(['outlets' => $outlets, 'shifts' => $shifts]);
        
    } catch (Exception $e) {
        sendError(500, "Gagal mengambil data opsi karyawan: " . $e->getMessage());
    }
}
    /**
     * Mengambil semua data karyawan.
     */
    public function getAll() {
        $karyawan = $this->model->getAllKaryawan();
        // Menggunakan 'objects' sebagai key agar konsisten dengan frontend
        sendResponse(['objects' => $karyawan]);
    }

    /**
     * Mengambil satu data karyawan berdasarkan ID.
     */
    public function getById($data) {
        if (!isset($data['id'])) {
            sendError(400, 'ID Karyawan tidak disertakan.');
        }
        $karyawan = $this->model->getKaryawanById($data['id']);
        if ($karyawan) {
            sendResponse(['record' => $karyawan]);
        } else {
            sendError(404, 'Karyawan tidak ditemukan.');
        }
    }

    /**
     * Menangani pembuatan atau pembaruan data karyawan.
     */
    public function submit($data) {
        $formData = $data['formData'] ?? [];
        $id = $data['id'] ?? null;

        // Validasi
        if (empty($formData['id_karyawan']) || empty($formData['nama_lengkap']) || empty($formData['role'])) {
            sendError(400, 'ID Karyawan, Nama Lengkap, dan Role wajib diisi.');
        }

        if ($id) {
            // Ini adalah proses update
            $result = $this->model->updateKaryawan($id, $formData);
        } else {
            // Ini adalah proses create
            if (empty($formData['password'])) {
                sendError(400, 'Password wajib diisi untuk karyawan baru.');
            }
            $result = $this->model->createKaryawan($formData);
        }

        if ($result) {
            sendResponse(['message' => 'Data karyawan berhasil disimpan.']);
        } else {
            sendError(500, 'Gagal menyimpan data karyawan.');
        }
    }

    /**
     * Menghapus data karyawan.
     */
    public function delete($data) {
        if (!isset($data['id'])) {
            sendError(400, 'ID Karyawan tidak disertakan untuk dihapus.');
        }
        
        $result = $this->model->deleteKaryawan($data['id']);

        if ($result) {
            sendResponse(['message' => 'Data karyawan berhasil dihapus.']);
        } else {
            sendError(500, 'Gagal menghapus data karyawan.');
        }
    }
}
?>