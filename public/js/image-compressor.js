/**
 * File: app/public/js/image-compressor.js
 * Utilitas untuk kompresi gambar di sisi klien sebelum diunggah.
 */
export function compressImage(file, options = { maxWidth: 1024, quality: 0.7 }) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > options.maxWidth) {
                    height *= options.maxWidth / width;
                    width = options.maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', options.quality);
                const base64Data = compressedDataUrl.split(',')[1];
                resolve({
                    base64: base64Data,
                    type: 'image/jpeg',
                    name: file.name.replace(/\.[^/.]+$/, "") + ".jpg"
                });
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}
