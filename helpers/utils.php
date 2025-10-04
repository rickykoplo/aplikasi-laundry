<?php
/**
 * File: app/helpers/utils.php
 * Berisi fungsi-fungsi pembantu umum.
 */

function sendResponse($data)
{
    ob_end_clean();
    echo json_encode(['success' => true, 'response' => $data]);
    exit();
}

function sendError($code, $message)
{
    ob_end_clean();
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

function generateRandomId($prefix)
{
    return $prefix . '-' . strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
}

function uploadImage($data)
{
    if (!isset($data['base64'], $data['folderId'], $data['type'])) {
        sendError(400, 'Data upload gambar tidak lengkap.');
    }

    // Tentukan base path berdasarkan tipe upload
    $base_path = '';
    $public_path = '';
    switch ($data['type']) {
        case 'karyawan':
            $base_path = __DIR__ . '/../public/foto_karyawan/';
            $public_path = 'foto_karyawan/';
            break;
        case 'transaksi':
        default:
            $base_path = __DIR__ . '/../public/foto_bukti/transaksi/' . $data['folderId'] . '/' . ($data['subType'] ?? 'general');
            $public_path = 'foto_bukti/transaksi/' . $data['folderId'] . '/' . ($data['subType'] ?? 'general') . '/';
            break;
    }

    if (!file_exists($base_path)) {
        if (!mkdir($base_path, 0755, true)) sendError(500, 'Gagal membuat direktori upload.');
    }

    $base64_string = $data['base64'];
    if (strpos($base64_string, ',') !== false) {
        $base64_string = explode(',', $base64_string)[1];
    }
    $file_data = base64_decode($base64_string);
    if ($file_data === false) sendError(400, 'Data base64 tidak valid.');

    // Untuk karyawan, nama file adalah ID karyawan agar mudah dicari dan tidak duplikat
    $file_name = ($data['type'] === 'karyawan') ? $data['folderId'] . '.jpg' : uniqid() . '.jpg';
    $file_path = $base_path . '/' . $file_name;

    if (!file_put_contents($file_path, $file_data)) sendError(500, 'Gagal menyimpan file gambar.');

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $base_uri = preg_replace('/\/app\/helpers$/', '', dirname($_SERVER['SCRIPT_NAME']));

    $url = $protocol . $host . $base_uri . '/' . $public_path . $file_name;
    sendResponse(['url' => $url]);
}

function getTableAndIdColumn($dataSheetName)
{
    $tableMap = [
        'Transaksi' => ['transaksi', 'id_transaksi'],
        'Data Karyawan' => ['karyawan', 'id_karyawan'],
        'Data Konsumen' => ['konsumen', 'id_konsumen'],
        'Data Outlet' => ['outlet', 'id_outlet'],
        'Data Layanan' => ['layanan', 'id_layanan'],
        'Kecepatan Layanan' => ['kecepatan_layanan', 'id_kecepatan'],
        'Data Kategori' => ['kategori_layanan', 'id_kategori'],
        'Tugas Kiloan' => ['tugas_kiloan', 'id_kiloan'],
        'Tugas Satuan' => ['tugas_satuan', 'id_satuan'],
        'Tugas Anjem' => ['tugas_anjem', 'id_perintah'],
        'Tugas Luar' => ['tugas_luar', 'id_tugas_luar']
    ];
    if (!isset($tableMap[$dataSheetName])) {
        sendError(400, 'Tipe data tidak valid: ' . $dataSheetName);
    }
    return $tableMap[$dataSheetName];
}

/**
 * Mengubah string JSON di kolom foto menjadi array.
 * PERBAIKAN: Menambahkan 'foto_ambil' ke dalam daftar.
 */
function normalizePhotoFields(&$row) {
     $photoFields = ['foto_barang', 'foto_ambil', 'foto_antar', 'foto_bukti', 'foto_before', 'foto_after', 'foto_dari_pelanggan', 'tanda_tangan_persetujuan', 'tanda_tangan_selesai', 'foto_tugas', 'foto_proses'];
    foreach ($photoFields as $field) {
        if (isset($row[$field]) && !empty($row[$field])) {
            $value = $row[$field];
            $decoded = json_decode($value, true);
            
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $row[$field] = $decoded;
            } else {
                $row[$field] = [$value]; // Jika bukan JSON, bungkus dalam array
            }
        } else {
            $row[$field] = []; // Jika kosong, jadikan array kosong
        }
    }
}

