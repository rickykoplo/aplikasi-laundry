<?php
require_once __DIR__ . '/ProfilModel.php';

class ProfilController {
    private $model;
    public function __construct($db) { $this->model = new ProfilModel($db); }

    public function update($data) {
        if (!isset($data['username'], $data['namaLengkap'])) {
            sendError(400, 'Data profil tidak lengkap.');
        }
        if ($this->model->updateProfile($data)) {
            sendResponse(['message' => 'Profil berhasil diperbarui.']);
        } else {
            sendError(500, 'Gagal memperbarui profil.');
        }
    }
}
