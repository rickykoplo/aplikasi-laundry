<?php
require_once __DIR__ . '/ShiftModel.php';

class ShiftController {
    private $model;
    public function __construct($db) { $this->model = new ShiftModel($db); }

    public function getList() {
        sendResponse(['objects' => $this->model->getAll()]);
    }
    public function getById($data) {
        sendResponse(['record' => $this->model->getById($data['id'])]);
    }
    public function submit($data) {
        $this->model->submit($data);
        sendResponse(['message' => 'Data shift berhasil disimpan.']);
    }
    public function delete($data) {
        $this->model->delete($data['id']);
        sendResponse(['message' => 'Shift berhasil dihapus.']);
    }
}
?>