// Unchanged from the previous version, included here for completeness
let compressedDataUrl = null;

function setTheme(theme) {
    document.body.className = theme;
}

document.querySelectorAll('.upload-area').forEach(area => {
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const input = area.querySelector('input[type="file"]');
        input.files = e.dataTransfer.files;
        showPreview(input.id);
        if (input.id === 'compressImg') displayOriginalSize('compressImg');
        if (input.id === 'cropImg') previewCropImage('cropImg');
    });
});

function showPreview(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    const previewContainer = document.getElementById(`preview-${inputId}`);
    const previewImg = document.getElementById(`previewImg-${inputId}`);

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
            if (inputId === 'cropImg') {
                previewContainer.style.display = 'none'; // Hide regular preview for cropper
            }
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.style.display = 'none';
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function displayOriginalSize(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) {
        document.getElementById(`originalSize${inputId}`).innerHTML = 'Original Size: <span>-</span>';
        return;
    }
    document.getElementById(`originalSize${inputId}`).innerHTML = `Original Size: <span>${formatSize(file.size)}</span>`;
    document.getElementById(`compressedSize${inputId}`).style.display = 'none';
    document.getElementById(`download${inputId}`).style.display = 'none';
}

function showProgress(inputId, callback) {
    const button = document.querySelector(`#${inputId}`).closest('.tool-card').querySelector('button:not(#downloadCompressImg)');
    const progressContainer = document.getElementById(`progress-${inputId}`);
    const progressBar = progressContainer.querySelector('.progress-bar');
    
    button.disabled = true;
    progressContainer.classList.add('active');
    progressBar.style.width = '0%';

    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            callback(() => {
                progressContainer.classList.remove('active');
                button.disabled = false;
            });
        }
    }, 100);
}

function convertImage(inputId, outputFormat) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    showProgress(inputId, (done) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL(`image/${outputFormat}`);
                downloadFile(dataUrl, `converted.${outputFormat}`);
                done();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function compressImage(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    const targetSizeInput = parseFloat(document.getElementById('targetSize').value);
    const sizeUnit = document.getElementById('sizeUnit').value;
    if (!file) {
        alert('Please select an image file');
        return;
    }
    if (!targetSizeInput || targetSizeInput <= 0) {
        alert('Please enter a valid target size greater than 0');
        return;
    }

    const targetSizeBytes = sizeUnit === 'kb' ? targetSizeInput * 1024 : targetSizeInput * 1024 * 1024;
    if (targetSizeBytes >= file.size) {
        alert('Target size must be smaller than the original size');
        return;
    }

    showProgress(inputId, (done) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                let low = 0.01;
                let high = 1.0;
                let quality;
                let compressedSize;
                let tolerance = targetSizeBytes * 0.05; // 5% tolerance

                for (let i = 0; i < 10; i++) { // Binary search for 10 iterations
                    quality = (low + high) / 2;
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const byteString = atob(dataUrl.split(',')[1]);
                    compressedSize = byteString.length;

                    if (Math.abs(compressedSize - targetSizeBytes) <= tolerance) break;
                    if (compressedSize > targetSizeBytes) {
                        high = quality;
                    } else {
                        low = quality;
                    }
                    await new Promise(resolve => setTimeout(resolve, 10)); // Prevent blocking
                }

                compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                document.getElementById(`compressedSize${inputId}`).innerHTML = `Compressed Size: <span>${formatSize(compressedSize)}</span>`;
                document.getElementById(`compressedSize${inputId}`).style.display = 'block';
                document.getElementById(`download${inputId}`).style.display = 'block';
                done();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function downloadCompressedImage(inputId) {
    if (compressedDataUrl) {
        downloadFile(compressedDataUrl, 'compressed.jpg');
    }
}

function enhanceImage(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an image file');
        return;
    }

    showProgress(inputId, (done) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.2 + 20);     // Red
                    data[i + 1] = Math.min(255, data[i + 1] * 1.2 + 20); // Green
                    data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 20); // Blue
                }
                ctx.putImageData(imageData, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                downloadFile(dataUrl, 'enhanced.jpg');
                done();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function resizeImage(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    const width = parseInt(document.getElementById('resizeWidth').value);
    const height = parseInt(document.getElementById('resizeHeight').value);
    if (!file) {
        alert('Please select an image file');
        return;
    }
    if (width <= 0 || height <= 0) {
        alert('Width and height must be positive numbers');
        return;
    }

    showProgress(inputId, (done) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                downloadFile(dataUrl, 'resized.jpg');
                done();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function rotateImage(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    const angle = parseInt(document.getElementById('rotateAngle').value);
    if (!file) {
        alert('Please select an image file');
        return;
    }

    showProgress(inputId, (done) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const radians = angle * Math.PI / 180;
                const sin = Math.abs(Math.sin(radians));
                const cos = Math.abs(Math.cos(radians));
                canvas.width = img.width * cos + img.height * sin;
                canvas.height = img.width * sin + img.height * cos;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(radians);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                const dataUrl = canvas.toDataURL('image/jpeg');
                downloadFile(dataUrl, 'rotated.jpg');
                done();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

let cropStartX, cropStartY, isDragging = false;

function previewCropImage(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('cropImage');
        img.src = e.target.result;
        const preview = document.getElementById('cropPreview');
        preview.style.display = 'block';

        img.onload = function() {
            const cropArea = document.getElementById('cropArea');
            const maxWidth = img.width > 300 ? 300 : img.width;
            const maxHeight = img.height > 200 ? 200 : img.height;
            cropArea.style.width = `${maxWidth / 2}px`;
            cropArea.style.height = `${maxHeight / 2}px`;
            cropArea.style.left = `${(maxWidth - parseInt(cropArea.style.width)) / 2}px`;
            cropArea.style.top = `${(maxHeight - parseInt(cropArea.style.height)) / 2}px`;

            cropArea.addEventListener('mousedown', (e) => {
                isDragging = true;
                cropStartX = e.clientX - parseInt(cropArea.style.left);
                cropStartY = e.clientY - parseInt(cropArea.style.top);
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    let newX = e.clientX - cropStartX;
                    let newY = e.clientY - cropStartY;
                    const maxX = maxWidth - parseInt(cropArea.style.width);
                    const maxY = maxHeight - parseInt(cropArea.style.height);
                    newX = Math.max(0, Math.min(newX, maxX));
                    newY = Math.max(0, Math.min(newY, maxY));
                    cropArea.style.left = `${newX}px`;
                    cropArea.style.top = `${newY}px`;
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            cropArea.addEventListener('mousedown', (e) => {
                if (e.target === cropArea) {
                    const rect = cropArea.getBoundingClientRect();
                    const resizeThreshold = 10;
                    if (e.clientX > rect.right - resizeThreshold && e.clientY > rect.bottom - resizeThreshold) {
                        isDragging = false;
                        let startWidth = parseInt(cropArea.style.width);
                        let startHeight = parseInt(cropArea.style.height);
                        const startX = e.clientX;
                        const startY = e.clientY;

                        function resize(e) {
                            let newWidth = startWidth + (e.clientX - startX);
                            let newHeight = startHeight + (e.clientY - startY);
                            newWidth = Math.max(50, Math.min(newWidth, maxWidth - parseInt(cropArea.style.left)));
                            newHeight = Math.max(50, Math.min(newHeight, maxHeight - parseInt(cropArea.style.top)));
                            cropArea.style.width = `${newWidth}px`;
                            cropArea.style.height = `${newHeight}px`;
                        }

                        document.addEventListener('mousemove', resize);
                        document.addEventListener('mouseup', () => {
                            document.removeEventListener('mousemove', resize);
                        }, { once: true });
                    }
                }
            });
        };
    };
    reader.readAsDataURL(file);
}

function cropImage(inputId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an image file');
        return;
    }

    const cropArea = document.getElementById('cropArea');
    const img = document.getElementById('cropImage');
    const scale = img.naturalWidth / img.width;

    const x = parseInt(cropArea.style.left) * scale;
    const y = parseInt(cropArea.style.top) * scale;
    const width = parseInt(cropArea.style.width) * scale;
    const height = parseInt(cropArea.style.height) * scale;

    showProgress(inputId, (done) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                downloadFile(dataUrl, 'cropped.jpg');
                done();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function downloadFile(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}