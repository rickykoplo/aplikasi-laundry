<?php
/**
 * File: app/modules/laporan/LaporanController.php
 * Controller untuk modul Laporan.
 */

require_once __DIR__ . '/LaporanModel.php';

class LaporanController {
    private $model;

    public function __construct($db) {
        $this->model = new LaporanModel($db);
    }

    public function getRevenueReport($data) {
        $report = $this->model->getRevenueReport($data['startDate'], $data['endDate']);
        sendResponse($report);
    }

    public function getAbsensiReport($data) {
        $employee = (isset($data['employee']) && $data['employee'] !== 'Semua Karyawan') ? $data['employee'] : null;
        $report = $this->model->getAbsensiReport($data['startDate'], $data['endDate'], $employee);
        sendResponse(['reportData' => $report]);
    }
}
