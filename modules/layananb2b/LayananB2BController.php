<?php
require_once __DIR__ . '/LayananB2BModel.php';

class LayananB2BController {
    private $model;
    public function __construct($db) { $this->model = new LayananB2BModel($db); }

    public function getListByKonsumen($data) {
        if (empty($data['id_konsumen'])) {
            sendError(400, "ID Konsumen B2B harus disertakan.");
        }
        sendResponse(['objects' => $this->model->getAllByKonsumen($data['id_konsumen'])]);
    }
    public function getById($data) {
        sendResponse(['record' => $this->model->getById($data['id'])]);
    }
    public function submit($data) {
        $this->model->submit($data);
        sendResponse(['message' => 'Layanan B2B berhasil disimpan.']);
    }
    public function delete($data) {
        $this->model->delete($data['id']);
        sendResponse(['message' => 'Layanan B2B berhasil dihapus.']);
    }
}
?>