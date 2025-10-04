<?php
// Trik "Cache Busting" yang lebih kuat.
// Ini akan menghasilkan nomor versi baru setiap kali file diubah.
$sw_version = filemtime(__DIR__ . '/sw.js'); 
$css_version = filemtime(__DIR__ . '/css/style.css'); 
$main_js_version = filemtime(__DIR__ . '/js/main.js'); 
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Family Laundry - Dasbor</title>
    
    <link rel="manifest" href="manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- PERBAIKAN: Menambahkan versi file CSS untuk memaksa browser memuat ulang -->
    <link rel="stylesheet" href="css/style.css?v=<?php echo $css_version; ?>">
    <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js"></script>
	
    <script src="https://unpkg.com/sweetalert/dist/sweetalert.min.js"></script>
    <script>
      tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } } }
    </script>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js?v=<?php echo $sw_version; ?>')
                .then(registration => {
                    console.log('Service Worker berhasil didaftarkan:', registration.scope);
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                swal({
                                    title: "Update Tersedia!",
                                    text: "Versi baru aplikasi telah diunduh. Muat ulang?",
                                    icon: "info",
                                    buttons: ["Nanti", "Muat Ulang"],
                                    closeOnClickOutside: false,
                                    closeOnEsc: false,
                                }).then((willReload) => {
                                    if (willReload) newWorker.postMessage({ action: 'skipWaiting' });
                                });
                            }
                        });
                    });
                })
                .catch(error => console.log('Pendaftaran Service Worker gagal:', error));
            
            let refreshing;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
        }
    </script>
</head>
<body class="bg-gray-100 font-sans">
    <div id="loadingOverlay" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center hidden">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
    <div id="toastContainer" class="fixed top-5 right-5 z-50 space-y-2"></div>

    <div id="login-page" class="page min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div class="w-full max-w-sm">
            <h2 class="text-center text-3xl font-bold text-gray-800 mb-6">Family Laundry</h2>
            <div class="bg-white p-8 rounded-lg shadow-md">
                <form id="login-form">
                    <div class="mb-4">
                        <label for="username" class="block text-sm font-medium text-gray-700">ID Karyawan</label>
                        <input type="text" id="username" class="input-text w-full mt-1">
                    </div>
                    <div class="mb-6">
                        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" class="input-text w-full mt-1">
                    </div>
                    <button type="submit" class="btn-primary w-full">Login</button>
                </form>
            </div>
        </div>
    </div>

    <div id="app-content" class="page hidden flex flex-col h-screen">
        <header class="bg-white shadow-sm p-4 flex justify-between items-center">
            <h1 id="page-title" class="text-xl font-bold text-gray-800">Dasbor</h1>
            <div class="relative">
                <button id="user-menu-button" class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                    <span id="user-initial"><i class="fas fa-user-circle text-2xl"></i></span>
                </button>
                <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                    <a href="#profil" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profil Saya</a>
                    <a href="#" class="logout-btn block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</a>
                </div>
            </div>
        </header>

        <main id="page-content-container" class="flex-grow p-4 overflow-y-auto pb-20">
            <!-- Konten dinamis akan dimuat di sini -->
        </main>
        
        <nav id="bottom-nav" class="bg-white border-t">
            <div id="bottom-nav-menu" class="max-w-screen-xl mx-auto grid grid-cols-5 h-full"></div>
        </nav>
    </div>
    
    <!-- === MODALS === -->
    <div id="formModal" class="fixed inset-0 z-40 hidden items-center justify-center bg-black bg-opacity-50 p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 id="formModalLabel" class="text-xl font-bold">Form</h3>
                <button class="modal-close-btn text-2xl text-gray-500">&times;</button>
            </div>
            <div class="p-4 overflow-y-auto">
                <div id="existing-photos-container" class="mb-4"></div>
                <div id="estimasi-info" class="text-center text-sm mb-3 hidden p-2 bg-blue-100 rounded-md"></div>
                <form id="dynamic-form" onsubmit="return false;"></form>
                <div id="image-preview-container" class="mt-4 flex flex-wrap gap-2"></div>
            </div>
            <div class="p-4 border-t flex justify-end">
                <button id="formModalSubmitButton" class="btn-primary">Simpan</button>
            </div>
        </div>
    </div>
    
    <div id="konsumenModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-50 p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg h-[80vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-xl font-bold">Pilih Konsumen</h3>
                <button class="modal-close-btn text-2xl text-gray-500">&times;</button>
            </div>
            <div class="p-4">
                 <input type="search" id="filter-konsumen" class="input-text w-full" placeholder="Cari nama atau no telpon...">
            </div>
            <div id="duplicate-konsumen-info" class="p-4 bg-yellow-100 text-yellow-800 text-sm hidden"></div>
            <div id="konsumen-list-container" class="p-4 overflow-y-auto flex-grow"></div>
            <div class="p-4 border-t flex justify-end">
                <button id="btn-tambah-konsumen-baru" class="btn-success">Tambah Konsumen Baru</button>
            </div>
        </div>
    </div>
    
    <div id="imageGalleryModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-75 p-4">
        <div class="bg-white rounded-lg shadow-xl p-4 relative modal-content">
             <button class="gallery-close-btn absolute -top-2 -right-2 bg-white rounded-full h-8 w-8 text-2xl">&times;</button>
             <div id="gallery-content" class="space-y-4"></div>
        </div>
    </div>

    <!-- PERBAIKAN: Menambahkan versi file JS untuk memaksa browser memuat ulang -->
    <script src="js/main.js?v=<?php echo $main_js_version; ?>" type="module"></script>
</body>
</html>

