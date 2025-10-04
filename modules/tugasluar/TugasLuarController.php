<?php
/**
 * File: app/modules/tugasluar/TugasLuarController.php
 * Controller KHUSUS untuk modul Tugas Luar.
 * VERSI LENGKAP DENGAN INTEGRASI TRANSAKSI DAN PERBAIKAN.
 */

class TugasLuarController
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getOptions()
    {
        try {
            // 1. Ambil data karyawan
            $karyawan_res = $this->conn->query("SELECT id_karyawan, nama_lengkap FROM karyawan ORDER BY nama_lengkap ASC");
            if (!$karyawan_res) {
                throw new Exception("Gagal mengambil data karyawan: " . $this->conn->error);
            }
            $karyawan = [];
            while ($row = $karyawan_res->fetch_assoc()) {
                $karyawan[] = $row;
            }

            // 2. Ambil data layanan tugas luar
            $layanan_res = $this->conn->query("SELECT * FROM daftar_harga_tugasluar ORDER BY layanan ASC");
            if (!$layanan_res) {
                throw new Exception("Gagal mengambil data layanan tugas luar: " . $this->conn->error);
            }
            $layanan = [];
            while ($row = $layanan_res->fetch_assoc()) {
                $layanan[] = $row;
            }

            sendResponse([
                'karyawan' => $karyawan,
                'layanan' => $layanan
            ]);
        } catch (Exception $e) {
            sendError(500, 'Gagal mengambil data opsi: ' . $e->getMessage());
        }
    }

    public function getById($data)
    {
        try {
            if (empty($data['id'])) throw new Exception('ID Tugas Luar tidak boleh kosong.');
            $stmt = $this->conn->prepare("SELECT * FROM tugas_luar WHERE id_tugas_luar = ?");
            $stmt->bind_param('s', $data['id']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows === 0) throw new Exception('Tugas tidak ditemukan.');
            
            $record = $result->fetch_assoc();
            if (function_exists('normalizePhotoFields')) {
                normalizePhotoFields($record, ['foto_dari_pelanggan', 'foto_before', 'foto_after']);
            }
            sendResponse(['record' => $record]);
        } catch (Exception $e) {
            sendError(500, 'Gagal mengambil data tugas luar: ' . $e->getMessage());
        }
    }
    
    public function submit($data)
    {
        $this->conn->begin_transaction();
        try {
            $formData = $data['formData'];
            $id = $data['id'] ?? null;
            $loggedInUser = $data['loggedInUser'];

            $id_outlet_user = $loggedInUser['id_outlet'] ?? null;
            if (empty($id_outlet_user)) {
                throw new Exception("Data outlet untuk karyawan ini tidak ditemukan. Harap update data karyawan di database.", 400);
            }

            if (empty($formData['nama_pelanggan']) || empty($formData['alamat']) || empty($formData['tanggal_pengerjaan'])) {
                throw new Exception("Pelanggan, Alamat, dan Tanggal Pengerjaan wajib diisi.");
            }
            
            $rencana_pekerjaan = $formData['rencana_pekerjaan'] ?? [];
            $biaya_transportasi = (float)($formData['biaya_transportasi'] ?? 0);
            
            $estimasi_biaya_awal = $biaya_transportasi;
            foreach ($rencana_pekerjaan as $item) {
                $estimasi_biaya_awal += (float)($item['harga'] ?? 0) * (int)($item['jumlah'] ?? 0);
            }

            if ($id) {
                throw new Exception("Fungsi update belum diimplementasikan dalam alur ini.");
            } else {
                $newIdTugasLuar = generateRandomId('TGL');
                $newIdTransaksi = generateRandomId('TRX');
                
                $stmt_tugas = $this->conn->prepare(
                    "INSERT INTO tugas_luar (
                        id_tugas_luar, id_transaksi_referensi, id_konsumen, nama_pelanggan, no_telp, 
                        alamat, link_peta, tanggal_pengerjaan, jam_mulai, rencana_pekerjaan, 
                        tim_pengerjaan, foto_dari_pelanggan, biaya_transportasi, kode_persetujuan, 
                        kode_selesai, catatan_pelanggan, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif')"
                );

                $rencana_json = json_encode($rencana_pekerjaan);
                $tim_json = json_encode($formData['tim_pengerjaan'] ?? []);
                $foto_json = json_encode($formData['foto_dari_pelanggan'] ?? []);

                $stmt_tugas->bind_param(
                    "ssssssssssssdsss",
                    $newIdTugasLuar, $newIdTransaksi, $formData['id_konsumen'], $formData['nama_pelanggan'], $formData['no_telp'],
                    $formData['alamat'], $formData['link_peta'], $formData['tanggal_pengerjaan'], $formData['jam_mulai'], $rencana_json,
                    $tim_json, $foto_json, $biaya_transportasi, $formData['kode_persetujuan'],
                    $formData['kode_selesai'], $formData['catatan_pelanggan']
                );

                if (!$stmt_tugas->execute()) {
                    throw new Exception("Gagal menyimpan tugas luar: " . $stmt_tugas->error);
                }

                $stmt_transaksi = $this->conn->prepare(
                    "INSERT INTO transaksi (
                        id_transaksi, id_konsumen, id_outlet, nama_pelanggan, no_telp_pelanggan, alamat_pelanggan, 
                        detail_layanan, total_biaya, status_transaksi, status_bayar, referensi_tugas, 
                        diterima_oleh, waktu_antar, jenis_tugas, catatan, biaya_transport
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', 'Belum Lunas', ?, ?, NOW(), 'Tugas Luar', ?, ?)"
                );
                
                $stmt_transaksi->bind_param(
                    "sssssssdsssd",
                    $newIdTransaksi, $formData['id_konsumen'], $id_outlet_user, $formData['nama_pelanggan'],
                    $formData['no_telp'], $formData['alamat'], $rencana_json, $estimasi_biaya_awal,
                    $newIdTugasLuar, $loggedInUser['namaLengkap'], $formData['catatan_pelanggan'], $biaya_transportasi
                );
                
                if (!$stmt_transaksi->execute()) {
                    throw new Exception("Gagal membuat data transaksi keuangan: " . $stmt_transaksi->error);
                }
            }
            
            $this->conn->commit();
            sendResponse(['message' => 'Tugas Luar dan Transaksi berhasil dibuat.']);

        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, $e->getMessage());
        }
    }

    public function mulaiSurvey($data)
    {
        try {
            $id = $data['id'];
            $layanan_aktual = json_encode($data['layanan_aktual'] ?? []);
            $catatan_survei = $data['catatan_survei'] ?? '';
            $biaya_final = (float)($data['biaya_final'] ?? 0);
            $foto_before_json = json_encode($data['foto_before'] ?? []);

            $stmt = $this->conn->prepare("UPDATE tugas_luar SET detail_layanan_aktual=?, catatan_survei=?, biaya_final=?, foto_before=?, status='Survey' WHERE id_tugas_luar=?");
            $stmt->bind_param('ssdss', $layanan_aktual, $catatan_survei, $biaya_final, $foto_before_json, $id);
            
            if (!$stmt->execute()) throw new Exception("Gagal update data survei: " . $stmt->error);
            
            sendResponse(['message' => 'Data survei berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, $e->getMessage());
        }
    }

    public function setujuiSpk($data)
    {
        $this->conn->begin_transaction();
        try {
            $id = $data['id'];
            $tanda_tangan = $data['tanda_tangan'] ?? null;
            $kode_input = $data['kode_persetujuan'] ?? null;

            $stmt_get = $this->conn->prepare(
                "SELECT kode_persetujuan, id_transaksi_referensi, detail_layanan_aktual, biaya_final 
                 FROM tugas_luar WHERE id_tugas_luar = ?"
            );
            $stmt_get->bind_param('s', $id);
            $stmt_get->execute();
            $tugas = $stmt_get->get_result()->fetch_assoc();

            if (!$tugas) throw new Exception("Tugas tidak ditemukan.");
            if ($tugas['kode_persetujuan'] !== $kode_input) throw new Exception("Kode Persetujuan yang dimasukkan salah.");

            $stmt_update_tugas = $this->conn->prepare(
                "UPDATE tugas_luar SET tanda_tangan_persetujuan=?, status='Dikerjakan', waktu_mulai_aktual=NOW() 
                 WHERE id_tugas_luar=?"
            );
            $stmt_update_tugas->bind_param('ss', $tanda_tangan, $id);
            if (!$stmt_update_tugas->execute()) throw new Exception("Gagal menyetujui SPK: " . $stmt_update_tugas->error);

            if (!empty($tugas['id_transaksi_referensi'])) {
                $stmt_update_trx = $this->conn->prepare(
                    "UPDATE transaksi SET detail_layanan = ?, total_biaya = ? WHERE id_transaksi = ?"
                );
                $stmt_update_trx->bind_param(
                    "sds",
                    $tugas['detail_layanan_aktual'],
                    $tugas['biaya_final'],
                    $tugas['id_transaksi_referensi']
                );
                if (!$stmt_update_trx->execute()) throw new Exception("Gagal sinkronisasi data ke transaksi.");
            }

            $this->conn->commit();
            sendResponse(['message' => 'SPK disetujui, tugas dimulai dan data keuangan telah disinkronkan.']);
        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, $e->getMessage());
        }
    }

    // --- FUNGSI BARU YANG LENGKAP DAN BENAR ---
    public function selesaikan($data)
    {
        $this->conn->begin_transaction();
        try {
            $id = $data['id'];
            $jumlah_pembayaran = $data['jumlah_pembayaran'] ?? null;
            $catatan_hasil = $data['catatan_hasil'] ?? '';
            $foto_urls = $data['foto_urls'] ?? [];
            $tanda_tangan = $data['tanda_tangan'] ?? null;
            $kode_selesai = $data['kode_selesai'] ?? null;

            $stmt_get = $this->conn->prepare(
                "SELECT id_transaksi_referensi, foto_after FROM tugas_luar WHERE id_tugas_luar = ?"
            );
            $stmt_get->bind_param('s', $id);
            $stmt_get->execute();
            $tugas = $stmt_get->get_result()->fetch_assoc();
            $id_transaksi = $tugas['id_transaksi_referensi'] ?? null;
            
            $existing_photos = json_decode($tugas['foto_after'] ?? '[]', true) ?: [];
            $all_photos_json = json_encode(array_merge($existing_photos, $foto_urls));

            $stmt_update_tugas = $this->conn->prepare(
                "UPDATE tugas_luar SET status='Selesai', catatan_hasil=?, foto_after=?, 
                 waktu_selesai_aktual=NOW(), tanda_tangan_selesai=?, kode_selesai=? 
                 WHERE id_tugas_luar=?"
            );
            $stmt_update_tugas->bind_param('sssss', $catatan_hasil, $all_photos_json, $tanda_tangan, $kode_selesai, $id);
            if (!$stmt_update_tugas->execute()) throw new Exception("Gagal menyelesaikan tugas luar.");

            if ($id_transaksi) {
                $loggedInUser = $data['loggedInUser']['namaLengkap'] ?? 'Kurir';

                if (isset($jumlah_pembayaran) && is_numeric($jumlah_pembayaran) && $jumlah_pembayaran > 0) {
                    
                    $stmt_get_trx = $this->conn->prepare("SELECT catatan_pembayaran FROM transaksi WHERE id_transaksi = ?");
                    $stmt_get_trx->bind_param("s", $id_transaksi);
                    $stmt_get_trx->execute();
                    $transaksi_lama = $stmt_get_trx->get_result()->fetch_assoc();
                    $catatan_pembayaran_final = $transaksi_lama['catatan_pembayaran'] ?? '';

                    $catatan_pembayaran_baru = "Tunai Rp" . number_format($jumlah_pembayaran) . " diterima oleh kurir " . $loggedInUser . ".";
                    $catatan_pembayaran_final .= ($catatan_pembayaran_final ? "\n" : '') . $catatan_pembayaran_baru;

                    $stmt_update_trx = $this->conn->prepare(
                        "UPDATE transaksi SET 
                            status_transaksi = 'Aktif',
                            status_bayar = 'Tunai Diterima Kurir', 
                            jumlah_bayar = jumlah_bayar + ?, 
                            waktu_ambil = NOW(),
                            diserahkan_oleh = ?,
                            catatan_pembayaran = ?
                         WHERE id_transaksi = ?"
                    );
                    $stmt_update_trx->bind_param("dsss", $jumlah_pembayaran, $loggedInUser, $catatan_pembayaran_final, $id_transaksi);

                } else {
                    $stmt_update_trx = $this->conn->prepare(
                        "UPDATE transaksi SET 
                            status_transaksi = 'Selesai', 
                            waktu_ambil = NOW(),
                            diserahkan_oleh = ?
                         WHERE id_transaksi = ?"
                    );
                    $stmt_update_trx->bind_param("ss", $loggedInUser, $id_transaksi);
                }
                
                if (!$stmt_update_trx->execute()) {
                    throw new Exception("Gagal menyelesaikan transaksi keuangan: " . $stmt_update_trx->error);
                }
            }

            $this->conn->commit();
            sendResponse(['message' => 'Tugas Luar berhasil diselesaikan.']);

        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, $e->getMessage());
        }
    }

    public function delete($data)
    {
        try {
            if (empty($data['id'])) throw new Exception('ID tugas tidak ada.');
            
            $this->conn->begin_transaction();
            
            $stmt_get = $this->conn->prepare("SELECT id_transaksi_referensi FROM tugas_luar WHERE id_tugas_luar = ?");
            $stmt_get->bind_param('s', $data['id']);
            $stmt_get->execute();
            $tugas = $stmt_get->get_result()->fetch_assoc();
            
            if ($tugas && !empty($tugas['id_transaksi_referensi'])) {
                $stmt_del_trx = $this->conn->prepare("DELETE FROM transaksi WHERE id_transaksi = ?");
                $stmt_del_trx->bind_param('s', $tugas['id_transaksi_referensi']);
                $stmt_del_trx->execute();
            }

            $stmt_del_tugas = $this->conn->prepare("DELETE FROM tugas_luar WHERE id_tugas_luar = ?");
            $stmt_del_tugas->bind_param('s', $data['id']);
            if (!$stmt_del_tugas->execute()) throw new Exception('Gagal menghapus tugas luar.');
            
            $this->conn->commit();
            sendResponse(['message' => 'Tugas dan transaksi terkait berhasil dihapus.']);
            
        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, 'Gagal menghapus tugas: ' . $e->getMessage());
        }
    }
}
?>