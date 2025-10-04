<?php
require_once __DIR__ . '/AbsensiModel.php';

class AbsensiController {
    private $model;
    public function __construct($db) { $this->model = new AbsensiModel($db); }
    public function checkStatus($data) {
        $status = $this->model->checkAbsensiStatus($data['username']);
        sendResponse($status ?: null);
    }
    public function submitAbsen($data) {
        $result = $this->model->submitAbsen($data);
        if ($result['success']) {
            sendResponse(['message' => $result['message']]);
        } else {
            sendError(400, $result['message']);
        }
    }
    public function submitIzinSakit($data) {
        $result = $this->model->submitIzinSakit($data);
        if ($result['success']) {
            sendResponse(['message' => $result['message']]);
        } else {
            sendError(400, $result['message']);
        }
    }
}
