<?php

ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- HEADER CORS YANG LENGKAP UNTUK MENGIZINKAN KONEKSI ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start();

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/utils.php';

$conn = get_database_connection();

try {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!$payload || !isset($payload['action'])) {
        throw new Exception('Permintaan tidak valid atau aksi tidak ditemukan.', 400);
    }

    $action = $payload['action'];
    $data = $payload['payload'] ?? null;

    switch ($action) {
			
		case 'getKaryawanOptions':
    require_once __DIR__ . '/../modules/karyawan/KaryawanController.php';
    (new KaryawanController($conn))->getOptions();
    break;
			
        // --- Modul Auth ---
        case 'login':
            require_once __DIR__ . '/../modules/auth/AuthController.php';
            (new AuthController($conn))->login($data);
            break;

        // --- Modul Dashboard ---
        case 'getDashboardSummary':
            require_once __DIR__ . '/../modules/dashboard/DashboardController.php';
            (new DashboardController($conn))->getSummary();
            break;
        case 'getDailySummary':
            require_once __DIR__ . '/../modules/dashboard/DashboardController.php';
            (new DashboardController($conn))->getDailySummary();
            break;

        // --- Modul Absensi ---
        case 'checkAbsensiStatus':
        case 'submitAbsen':
        case 'submitIzinSakit':
            require_once __DIR__ . '/../modules/absensi/AbsensiController.php';
            $controller = new AbsensiController($conn);
            if ($action === 'checkAbsensiStatus') $controller->checkStatus($data);
            if ($action === 'submitAbsen') $controller->submitAbsen($data);
            if ($action === 'submitIzinSakit') $controller->submitIzinSakit($data);
            break;

        // --- Modul Profil ---
        case 'updateProfile':
            require_once __DIR__ . '/../modules/profil/ProfilController.php';
            (new ProfilController($conn))->update($data);
            break;
            
        // --- Modul Transaksi ---
        case 'getTransaksiList':
        case 'submitTransaksi':
        case 'submitPengambilan':
        case 'getTransaksiById':
        case 'deleteTransaksi':
            require_once __DIR__ . '/../modules/transaksi/TransaksiController.php';
            $controller = new TransaksiController($conn);
            if ($action === 'getTransaksiList') $controller->getList($data);
            if ($action === 'submitTransaksi') $controller->submit($data);
            if ($action === 'submitPengambilan') $controller->submitPengambilan($data);
            if ($action === 'getTransaksiById') $controller->getById($data);
            if ($action === 'deleteTransaksi') $controller->delete($data);
            break;

        // --- Modul Layanan, Kategori, Kecepatan, Proses ---
        case 'getLayananOptions':
        case 'getLayananList':
        case 'submitLayanan':
        case 'duplicateLayanan':
        case 'getKategoriList':
        case 'submitKategori':
        case 'getKecepatanList':
        case 'submitKecepatan':
        case 'getProsesKerjaList':
        case 'submitProsesKerja':
        case 'getProsesKerjaById':
        case 'deleteProsesKerja':
             require_once __DIR__ . '/../modules/layanan/LayananController.php';
            $controller = new LayananController($conn);
            if ($action === 'getLayananOptions') $controller->getLayananOptions();
            if ($action === 'getLayananList') $controller->getLayananList();
            if ($action === 'submitLayanan') $controller->submitLayanan($data);
            if ($action === 'duplicateLayanan') $controller->duplicateLayanan($data);
            if ($action === 'getKategoriList') $controller->getKategoriList();
            if ($action === 'submitKategori') $controller->submitKategori($data);
            if ($action === 'getKecepatanList') $controller->getKecepatanList();
            if ($action === 'submitKecepatan') $controller->submitKecepatan($data);
            if ($action === 'getProsesKerjaList') $controller->getProsesKerjaList();
            if ($action === 'submitProsesKerja') $controller->submitProsesKerja($data);
            if ($action === 'getProsesKerjaById') $controller->getProsesKerjaById($data);
            if ($action === 'deleteProsesKerja') $controller->deleteProsesKerja($data);
            break;
            
        // --- Modul Tugas (Internal) ---
        case 'getTugasList':
        case 'getTugasDetail':
        case 'updateTugasProses':
        case 'getTugasCategorySummary':
        case 'submitAnjemTask':
        case 'updateAnjemStatus':
        case 'selesaikanKategoriTugas':
        case 'deleteTugas':
        case 'selesaikanTugasAntar':
		case 'selesaikanLayananTugas':
            require_once __DIR__ . '/../modules/tugas/TugasController.php';
            $controller = new TugasController($conn);
            if ($action === 'getTugasList') $controller->getList($data);
            if ($action === 'getTugasDetail') $controller->getDetail($data);
            if ($action === 'updateTugasProses') $controller->updateProses($data);
            if ($action === 'getTugasCategorySummary') $controller->getCategorySummary();
            if ($action === 'submitAnjemTask') $controller->submitAnjemTask($data);
            if ($action === 'updateAnjemStatus') $controller->updateAnjemStatus($data);
            if ($action === 'selesaikanKategoriTugas') $controller->selesaikanKategoriTugas($data);
            if ($action === 'deleteTugas') $controller->deleteTugas($data);
            if ($action === 'selesaikanTugasAntar') $controller->selesaikanTugasAntar($data);
            if ($action === 'selesaikanLayananTugas') $controller->selesaikanLayananTugas($data);
            break;
            
        // --- MODUL TUGAS LUAR (DIPINDAHKAN KE SINI) ---
        case 'getTugasLuarOptions':
		case 'getTugasLuarById':
        case 'submitTugasLuar':
		case 'selesaikanTugasLuar': 
		case 'mulaiSurveyTugasLuar':    // Endpoint baru
		case 'setujuiSpkTugasLuar':     // Endpoint baru
		case 'deleteTugasLuar':
   			 require_once __DIR__ . '/../modules/tugasluar/TugasLuarController.php';
   			 $controller = new TugasLuarController($conn);
				if ($action === 'getTugasLuarOptions') $controller->getOptions();
    			if ($action === 'getTugasLuarById') $controller->getById($data);
   				if ($action === 'submitTugasLuar') $controller->submit($data);
    			if ($action === 'mulaiSurveyTugasLuar') $controller->mulaiSurvey($data); // Panggil fungsi baru
    			if ($action === 'setujuiSpkTugasLuar') $controller->setujuiSpk($data);   // Panggil fungsi baru
    			if ($action === 'selesaikanTugasLuar') $controller->selesaikan($data);
    			if ($action === 'deleteTugasLuar') $controller->delete($data);
    			break;

        // --- MODUL SETORAN KAS ---
        case 'getListSetoran':
        case 'konfirmasiSetoran':
            require_once __DIR__ . '/../modules/setorankas/SetoranKasController.php';
            $controller = new SetoranKasController($conn);
            if ($action === 'getListSetoran') $controller->getList();
            if ($action === 'konfirmasiSetoran') $controller->confirm($data);
            break;

        // --- Modul Karyawan ---
        case 'getAllKaryawan':
        case 'submitKaryawan':
            require_once __DIR__ . '/../modules/karyawan/KaryawanController.php';
            $controller = new KaryawanController($conn);
            if ($action === 'getAllKaryawan') $controller->getAll();
            if ($action === 'submitKaryawan') $controller->submit($data);
            break;
        
        // --- Modul Outlet ---
        case 'submitOutlet':
             require_once __DIR__ . '/../modules/outlet/OutletController.php';
             (new OutletController($conn))->submit($data);
             break;

        // --- Modul Konsumen ---
        case 'getKonsumenList':
        case 'submitKonsumen':
        case 'submitKonsumenAdmin':
            require_once __DIR__ . '/../modules/konsumen/KonsumenController.php';
            $controller = new KonsumenController($conn);
            if ($action === 'getKonsumenList') $controller->getAll();
            else $controller->submit($data);
            break;
        
        // --- Modul Laporan ---
        case 'getRevenueReport':
        case 'getAbsensiReport':
            require_once __DIR__ . '/../modules/laporan/LaporanController.php';
            $controller = new LaporanController($conn);
            if ($action === 'getRevenueReport') $controller->getRevenueReport($data);
            if ($action === 'getAbsensiReport') $controller->getAbsensiReport($data);
            break;
        
        // --- Modul Settings ---
        case 'getSettingsData':
        case 'saveProsesKerja':
            require_once __DIR__ . '/../modules/settings/SettingsController.php';
            $controller = new SettingsController($conn);
            if ($action === 'getSettingsData') $controller->getProcessSettings();
            if ($action === 'saveProsesKerja') $controller->saveProcessSettings($data);
            break;

        // --- Upload Module ---
        case 'uploadImage':
    // Asumsi fungsi uploadImage ada di utils.php atau file lain yang di-require
    uploadImage($data); // <-- HAPUS TANDA KOMENTAR PADA BARIS INI
    break;

		// --- Modul Manajemen Shift ---
case 'getShiftList':
case 'getShiftById':
case 'submitShift':
case 'deleteShift':
    require_once __DIR__ . '/../modules/shift/ShiftController.php';
    $controller = new ShiftController($conn);
    if ($action === 'getShiftList') $controller->getList();
    if ($action === 'getShiftById') $controller->getById($data);
    if ($action === 'submitShift') $controller->submit($data);
    if ($action === 'deleteShift') $controller->delete($data);
    break;
			
        // --- Rute Generik ---
        case 'getASRead':
        case 'getRecordById':
        case 'deleteRow':
            if (!isset($data['dataSheetName'])) throw new Exception('dataSheetName tidak ada.');
            $sheet = $data['dataSheetName'];

            if ($sheet === 'Data Karyawan') {
                require_once __DIR__ . '/../modules/karyawan/KaryawanController.php';
                $c = new KaryawanController($conn);
                if ($action === 'getRecordById') $c->getById($data);
                elseif ($action === 'deleteRow') $c->delete($data);
                else $c->getAll();
            } elseif ($sheet === 'Data Konsumen') {
                require_once __DIR__ . '/../modules/konsumen/KonsumenController.php';
                $c = new KonsumenController($conn);
                if ($action === 'getRecordById') $c->getById($data);
                elseif ($action === 'deleteRow') $c->delete($data);
                else $c->getAll();
            } elseif ($sheet === 'Data Outlet') {
                require_once __DIR__ . '/../modules/outlet/OutletController.php';
                 $c = new OutletController($conn);
                if ($action === 'getRecordById') $c->getById($data);
                elseif ($action === 'deleteRow') $c->delete($data);
                else $c->getAll();
            } elseif (in_array($sheet, ['Data Layanan', 'Data Kategori', 'Data Kecepatan Layanan'])) {
                require_once __DIR__ . '/../modules/layanan/LayananController.php';
                $c = new LayananController($conn);
                 if ($action === 'getRecordById') {
                    if($sheet === 'Data Layanan') $c->getLayananById($data);
                    if($sheet === 'Data Kategori') $c->getKategoriById($data);
                    if($sheet === 'Data Kecepatan Layanan') $c->getKecepatanById($data);
                 } elseif ($action === 'deleteRow') {
                    if($sheet === 'Data Layanan') $c->deleteLayanan($data);
                    if($sheet === 'Data Kategori') $c->deleteKategori($data);
                    if($sheet === 'Data Kecepatan Layanan') $c->deleteKecepatan($data);
                 } else {
                    if($sheet === 'Data Layanan') $c->getLayananList();
                    if($sheet === 'Data Kategori') $c->getKategoriList();
                    if($sheet === 'Data Kecepatan Layanan') $c->getKecepatanList();
                 }
            }
            break;
			
			// --- Modul Klien B2B ---
case 'registrasiB2B':
case 'loginB2B':
    require_once __DIR__ . '/../modules/klienb2b/KlienB2BController.php';
    $controller = new KlienB2BController($conn);
    if ($action === 'registrasiB2B') $controller->register($data);
    if ($action === 'loginB2B') $controller->login($data); // <-- PERBAIKAN DI SINI
    break;
			
			// --- Modul Verifikasi Klien B2B ---
case 'getPendingB2BList':
case 'approveB2BUser':
case 'rejectB2BUser':
    require_once __DIR__ . '/../modules/klienb2b/VerifikasiB2BController.php';
    $controller = new VerifikasiB2BController($conn);
    if ($action === 'getPendingB2BList') $controller->getList();
    if ($action === 'approveB2BUser') $controller->approve($data);
    if ($action === 'rejectB2BUser') $controller->reject($data);
    break;
			
			// --- Modul Layanan B2B ---
case 'getLayananB2BList':
case 'getLayananB2BById':
case 'submitLayananB2B':
case 'deleteLayananB2B':
    require_once __DIR__ . '/../modules/layananb2b/LayananB2BController.php';
    $controller = new LayananB2BController($conn);
    if ($action === 'getLayananB2BList') $controller->getListByKonsumen($data);
    if ($action === 'getLayananB2BById') $controller->getById($data);
    if ($action === 'submitLayananB2B') $controller->submit($data);
    if ($action === 'deleteLayananB2B') $controller->delete($data);
    break;

        default:
            throw new Exception('Aksi tidak valid: ' . htmlspecialchars($action), 400);
    }

} catch (Exception $e) {
    ob_clean(); // Bersihkan buffer sebelum mengirim error
    $errorCode = $e->getCode() ?: 500;
    if ($errorCode < 100 || $errorCode >= 600) $errorCode = 500;
    sendError($errorCode, $e->getMessage());
} finally {
    if ($conn) {
        $conn->close();
    }
}


?>