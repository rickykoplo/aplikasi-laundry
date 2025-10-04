<?php
require_once __DIR__ . '/SettingsModel.php';

class SettingsController
{
    private $conn;
    private $model;

    public function __construct($conn)
    {
        $this->conn = $conn;
        $this->model = new SettingsModel($this->conn);
    }

    public function getProcessSettings()
    {
        try {
            $data = $this->model->getProcessSettingsData();
            sendResponse($data);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data pengaturan: " . $e->getMessage());
        }
    }

    public function saveProcessSettings($data)
    {
        try {
            if (!isset($data['settings'])) {
                throw new Exception("Data pengaturan tidak ditemukan.");
            }
            $this->model->saveProcessSettings($data);
            sendResponse(['message' => 'Pengaturan proses kerja berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menyimpan data pengaturan: " . $e->getMessage());
        }
    }
}
