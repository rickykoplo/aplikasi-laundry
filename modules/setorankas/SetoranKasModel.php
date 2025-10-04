<?php
// File: app/modules/setorankas/SetoranKasModel.php

class SetoranKasModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // ... (fungsi getPendingDeposits() tetap sama) ...
    public function getPendingDeposits()
    {
        $query = "
            SELECT 
                id_transaksi, 
                nama_pelanggan, 
                diserahkan_oleh, 
                catatan_pembayaran,
                waktu_ambil 
            FROM transaksi 
            WHERE status_bayar = 'Tunai Diterima Kurir' 
            ORDER BY diserahkan_oleh, waktu_ambil DESC
        ";
        
        $result = $this->conn->query($query);
        if (!$result) {
            throw new Exception("Gagal mengambil data setoran: " . $this->conn->error);
        }
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    /**
     * Mengonfirmasi bahwa setoran untuk sebuah transaksi telah diterima.
     * @param string $id_transaksi ID transaksi yang akan dikonfirmasi.
     * @param string $kasir_name Nama kasir/owner yang mengonfirmasi.
     * @return bool Hasil dari operasi update.
     */
    public function confirmDeposit($id_transaksi, $kasir_name)
    {
        // --- PERBAIKAN DI SINI ---
        $stmt = $this->conn->prepare("
            UPDATE transaksi 
            SET 
                status_transaksi = 'Selesai', -- <== TAMBAHKAN BARIS INI
                status_bayar = 'Lunas & Disetor', 
                penyetor_dikonfirmasi_oleh = ?, 
                waktu_setor_dikonfirmasi = NOW() 
            WHERE id_transaksi = ? AND status_bayar = 'Tunai Diterima Kurir'
        ");
        // --- BATAS PERBAIKAN ---
        
        $stmt->bind_param("ss", $kasir_name, $id_transaksi);
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal mengonfirmasi setoran: " . $stmt->error);
        }
        return $stmt->affected_rows > 0;
    }
}
?>