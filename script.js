document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', handleFileSelect);

document.getElementById('newFileBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('convertBtn').addEventListener('click', convertImagesToPdf);

document.getElementById('restartBtn').addEventListener('click', () => {
    window.location.href = window.location.href; // Most reliable reload method
});

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById('previewContainer');
    const uploadBtn = document.getElementById('uploadBtn');
    const newFileBtn = document.getElementById('newFileBtn');
    const convertBtn = document.getElementById('convertBtn');

    previewContainer.innerHTML = '';

    if (files.length === 0) {
        return;
    }

    if (files.length > 3) {
        alert('You can select a maximum of 3 files.');
        document.getElementById('fileInput').value = '';
        return;
    }

    uploadBtn.style.display = 'none';
    newFileBtn.style.display = 'inline-block';
    newFileBtn.textContent = 'Select New Files';
    convertBtn.disabled = false;

    files.forEach((file, index) => {
        const filePreview = document.createElement('div');
        filePreview.className = 'file-preview';

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100px';
            img.style.height = 'auto';
            filePreview.appendChild(img);
        };
        reader.readAsDataURL(file);

        const removeBtn = document.createElement('span');
        removeBtn.textContent = '✖';
        removeBtn.className = 'remove-btn';
        removeBtn.addEventListener('click', () => {
            files.splice(index, 1);
            previewContainer.removeChild(filePreview);
            document.getElementById('fileInput').files = createFileList(files);

            if (files.length === 0) {
                uploadBtn.style.display = 'inline-block';
                newFileBtn.style.display = 'none';
                convertBtn.disabled = true;
            }
        });
        filePreview.appendChild(removeBtn);
        previewContainer.appendChild(filePreview);
    });
}

function createFileList(files) {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
}

async function convertImagesToPdf() {
    const files = Array.from(document.getElementById('fileInput').files);

    if (files.length === 0) {
        return;
    }

    const progressBar = document.getElementById('progress');
    const progressBarContainer = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const restartBtn = document.getElementById('restartBtn');

    progressBar.style.width = '0%';
    progressBarContainer.style.display = 'block';
    progressText.style.display = 'block'; // Keep progress text visible if you want it
    convertBtn.textContent = 'Converting...';
    convertBtn.disabled = true;

    const totalFiles = files.length;
    let filesProcessed = 0;
    const convertedFiles = [];

    try {
        const promises = files.map((file) => new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async function (event) {
                try {
                    const pdfDoc = await PDFLib.PDFDocument.create();
                    const page = pdfDoc.addPage(PDFLib.PageSizes.A4);
                    const originalFileName = file.name.replace(/\.[^/.]+$/, "");

                    let img;
                    if (file.type.startsWith('image/png')) {
                        img = await pdfDoc.embedPng(event.target.result);
                    } else if (file.type.startsWith('image/jpeg') || file.type.startsWith('image/jpg')) {
                        img = await pdfDoc.embedJpg(event.target.result);
                    } else if (file.type.startsWith('image/gif')) {
                        const embeddedGif = await pdfDoc.embedPng(event.target.result);
                        img = embeddedGif;
                    } else if (file.type.startsWith('image/bmp')) {
                        img = await pdfDoc.embedPng(event.target.result);
                    } else if (file.type.startsWith('image/webp')) {
                        img = await pdfDoc.embedPng(event.target.result);
                    } else {
                        console.warn(`Unsupported image type: ${file.type}`);
                        alert(`Unsupported image type: ${file.type}. Only PNG, JPG, JPEG, GIF, BMP and WEBP are supported.`);
                        reject(`Unsupported image type: ${file.type}`);
                        return;
                    }

                    page.drawImage(img, {
                        x: 50,
                        y: page.getHeight() - img.height - 50,
                        width: img.width,
                        height: img.height,
                    });

                    const pdfBytes = await pdfDoc.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    convertedFiles.push({ blob, fileName: originalFileName });

                    filesProcessed++;
                    const progress = (filesProcessed / totalFiles) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `Processed ${filesProcessed}/${totalFiles} files (${progress.toFixed(0)}%)`;

                    resolve();

                } catch (conversionError) {
                    console.error(`Error converting ${file.name}:`, conversionError);
                    alert(`Error converting ${file.name}: ${conversionError.message}`);
                    reject(conversionError);
                }
            };

            reader.onerror = (readError) => {
                console.error(`Error reading ${file.name}:`, readError);
                alert(`Error reading ${file.name}: ${readError.message}`);
                reject(readError);
            };

            reader.readAsDataURL(file);
        }));

        await Promise.all(promises);

        progressBar.style.width = '100%';
        progressText.style.display = 'none'; // Hide the separate progress text (optional)
        convertBtn.textContent = 'Conversion Complete!'; // Update button text
        convertBtn.disabled = true; // Disable button

        downloadBtn.style.display = 'inline-block';
        restartBtn.style.display = 'inline-block';

        downloadBtn.addEventListener('click', () => {
            convertedFiles.forEach(({ blob, fileName }) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName + '.pdf';
                link.click();
                URL.revokeObjectURL(link.href);
            });
        });

    } catch (allErrors) {
        console.error("Overall conversion process errors:", allErrors);
        alert("Some errors occurred during the conversion. Please check the console for details.");
        progressBarContainer.style.display = 'none';
        convertBtn.textContent = 'Convert to PDF'; // Reset button text on error
        convertBtn.disabled = false;
    }
}