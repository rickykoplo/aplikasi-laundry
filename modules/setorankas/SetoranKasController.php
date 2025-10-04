<?php
/**
 * File: app/modules/setorankas/SetoranKasController.php
 * Controller untuk modul Konfirmasi Setoran Kas.
 */

require_once __DIR__ . '/SetoranKasModel.php';

class SetoranKasController
{
    private $model;

    public function __construct($db)
    {
        $this->model = new SetoranKasModel($db);
    }

    /**
     * Endpoint untuk mendapatkan daftar setoran yang masih pending.
     */
    public function getList()
    {
        try {
            $deposits = $this->model->getPendingDeposits();
            sendResponse(['deposits' => $deposits]);
        } catch (Exception $e) {
            sendError(500, $e->getMessage());
        }
    }

    /**
     * Endpoint untuk mengonfirmasi setoran.
     */
    public function confirm($data)
    {
        try {
            if (empty($data['id'])) {
                sendError(400, "ID Transaksi wajib diisi.");
            }
            if (empty($data['loggedInUser']['namaLengkap'])) {
                sendError(400, "Informasi pengguna (kasir) tidak ditemukan.");
            }
            
            $kasir_name = $data['loggedInUser']['namaLengkap'];
            $id_transaksi = $data['id'];

            $result = $this->model->confirmDeposit($id_transaksi, $kasir_name);

            if ($result) {
                sendResponse(['message' => 'Setoran berhasil dikonfirmasi.']);
            } else {
                sendError(404, 'Setoran tidak ditemukan atau sudah dikonfirmasi sebelumnya.');
            }
        } catch (Exception $e) {
            sendError(500, $e->getMessage());
        }
    }
}