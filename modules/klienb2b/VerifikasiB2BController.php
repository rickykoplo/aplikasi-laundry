<?php
require_once __DIR__ . '/VerifikasiB2BModel.php';

class VerifikasiB2BController {
    private $model;
    public function __construct($db) { $this->model = new VerifikasiB2BModel($db); }

    public function getList() {
        sendResponse(['objects' => $this->model->getPendingUsers()]);
    }

    public function approve($data) {
        if ($this->model->updateUserStatus($data['id'], 'aktif')) {
            sendResponse(['message' => 'Klien B2B berhasil disetujui.']);
        } else {
            sendError(500, "Gagal menyetujui klien.");
        }
    }

    public function reject($data) {
        if ($this->model->updateUserStatus($data['id'], 'nonaktif')) {
            sendResponse(['message' => 'Klien B2B telah ditolak/dinonaktifkan.']);
        } else {
            sendError(500, "Gagal menolak klien.");
        }
    }
}
?>