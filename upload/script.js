// API endpoint
const API_URL = 'https://api.deepakpk.com/upload/';

// DOM elements
const tokenInput = document.getElementById('token');
const validateTokenBtn = document.getElementById('validate-token');
const tokenStatus = document.getElementById('token-status');
const uploadSection = document.querySelector('.upload-section');
const filterInfo = document.getElementById('filter-info');
const filterText = document.getElementById('filter-text');
const dropzone = document.getElementById('dropzone');
const fileSelect = document.getElementById('file-select');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const uploadButton = document.getElementById('upload-button');
const overallProgress = document.getElementById('overall-progress');

// State variables
let files = [];
let validToken = '';
let uploadingFile = null;
let fileFilter = '';
let allowedExtensions = [];

// Constants
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 120000; // 2 minutes

// Check if token and file filter are in URL parameters
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const extensionParam = urlParams.get('extension');
    
    if (tokenParam && tokenParam.match(/^\d{6}$/)) {
        tokenInput.value = tokenParam;
    }
    
    if (extensionParam) {
        setFileFilter(extensionParam);
    }
});

// Calculate optimal chunk size based on file size
function calculateOptimalChunkSize(fileSize) {
    // For small files, use smaller chunks
    if (fileSize < 5 * 1024 * 1024) { // Less than 5MB
        return 1 * 1024 * 1024; // 1MB chunks
    } 
    // For medium files
    else if (fileSize < 50 * 1024 * 1024) { // Less than 50MB
        return 5 * 1024 * 1024; // 5MB chunks
    }
    // For large files
    else {
        return 10 * 1024 * 1024; // 10MB chunks
    }
}

// Set file filter
function setFileFilter(extension) {
    allowedExtensions = extension.split(',').map(ext => {
        // Ensure each extension starts with a dot
        ext = ext.trim().toLowerCase();
        return ext.startsWith('.') ? ext : '.' + ext;
    });
    
    // Build accept attribute
    fileFilter = allowedExtensions.join(',');
    fileInput.setAttribute('accept', fileFilter);
    
    // Show filter info
    filterInfo.style.display = 'block';
    filterText.textContent = allowedExtensions.join(', ');
}

// Check if file matches allowed extensions
function isFileAllowed(file) {
    if (!fileFilter || allowedExtensions.length === 0) {
        return true; // No filter specified, all files allowed
    }
    
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some(ext => fileName.endsWith(ext));
}

// Event listeners
validateTokenBtn.addEventListener('click', validateToken);
tokenInput.addEventListener('input', function() {
    // Only allow digits and limit to 6 characters
    this.value = this.value.replace(/\D/g, '').substring(0, 6);
});

fileSelect.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

uploadButton.addEventListener('click', startUpload);

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, unhighlight, false);
});

dropzone.addEventListener('drop', handleDrop, false);

// Utility functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropzone.classList.add('highlight');
}

function unhighlight() {
    dropzone.classList.remove('highlight');
}

// Token validation
async function validateToken() {
    const token = tokenInput.value;
    
    if (!token.match(/^\d{6}$/)) {
        tokenStatus.textContent = 'Please enter a valid 6-digit token';
        tokenStatus.className = 'info-text error';
        return;
    }
    
    try {
        tokenStatus.textContent = 'Validating token...';
        tokenStatus.className = 'info-text';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        // We'll just make a check_status call to verify if the token is valid
        const response = await fetch(`${API_URL}?action=check_status&token=${token}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.success) {
            tokenStatus.textContent = 'Token validated successfully!';
            tokenStatus.className = 'info-text completed';
            validToken = token;
            uploadSection.style.display = 'block';
        } else {
            tokenStatus.textContent = 'Invalid or expired token';
            tokenStatus.className = 'info-text error';
        }
    } catch (error) {
        let errorMessage = 'Error validating token';
        if (error.name === 'AbortError') {
            errorMessage = 'Connection timeout. Please try again.';
        } else if (error.message) {
            errorMessage += ': ' + error.message;
        }
        
        tokenStatus.textContent = errorMessage;
        tokenStatus.className = 'info-text error';
    }
}

// File handling
function handleFileSelect(e) {
    filterAndAddFiles(Array.from(e.target.files));
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const droppedFiles = Array.from(dt.files);
    filterAndAddFiles(droppedFiles);
}

function filterAndAddFiles(newFiles) {
    let filteredFiles = newFiles;
    let skippedCount = 0;
    
    // Apply file extension filter if set
    if (fileFilter && allowedExtensions.length > 0) {
        const originalCount = filteredFiles.length;
        filteredFiles = filteredFiles.filter(file => isFileAllowed(file));
        skippedCount = originalCount - filteredFiles.length;
        
        if (skippedCount > 0) {
            alert(`${skippedCount} ${skippedCount === 1 ? 'file was' : 'files were'} skipped because ${skippedCount === 1 ? 'it doesn\'t' : 'they don\'t'} match the allowed types: ${allowedExtensions.join(', ')}`);
        }
    }
    
    addFiles(filteredFiles);
}

function addFiles(newFiles) {
    // Check for duplicates before adding to files array
    for (let i = 0; i < newFiles.length; i++) {
        // Check if file already exists in the list
        const exists = files.some(file => 
            file.name === newFiles[i].name && 
            file.size === newFiles[i].size
        );
        
        if (!exists) {
            files.push(newFiles[i]);
        }
    }
    
    renderFileList();
    updateUploadButton();
}

function renderFileList() {
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        fileList.innerHTML = '<p class="info-text">No files selected</p>';
        return;
    }
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        
        const fileStatus = document.createElement('div');
        fileStatus.className = 'file-status';
        fileStatus.textContent = 'Waiting';
        
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.style.backgroundColor = '#ea4335';
        removeButton.addEventListener('click', () => removeFile(index));
        
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        progressContainer.appendChild(progressBar);
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(fileStatus);
        fileItem.appendChild(removeButton);
        fileItem.appendChild(progressContainer);
        
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    files.splice(index, 1);
    renderFileList();
    updateUploadButton();
}

function updateUploadButton() {
    uploadButton.disabled = files.length === 0 || !validToken;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File upload
async function startUpload() {
    if (files.length === 0 || !validToken) return;
    
    // Check connection first
    try {
        overallProgress.textContent = "Checking connection...";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`${API_URL}?action=check_status&token=${validToken}`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error("Server connection check failed");
        }
    } catch (error) {
        let errorMessage = "Connection problem";
        if (error.name === 'AbortError') {
            errorMessage = "Connection timed out";
        } else if (error.message) {
            errorMessage += ": " + error.message;
        }
        
        overallProgress.textContent = `${errorMessage}. Please try again.`;
        return;
    }
    
    uploadButton.disabled = true;
    
    let completedFiles = 0;
    let totalFiles = files.length;
    let successfulUploads = [];
    let failedUploads = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileItem = fileList.querySelector(`[data-index="${i}"]`);
        const fileStatus = fileItem.querySelector('.file-status');
        const progressBar = fileItem.querySelector('.progress-bar');
        
        fileStatus.textContent = 'Uploading...';
        uploadingFile = file.name;
        updateOverallProgress(completedFiles, totalFiles);
        
        try {
            await uploadFileInChunks(file, progressBar, fileStatus);
            fileStatus.textContent = 'Completed';
            fileStatus.className = 'file-status completed';
            completedFiles++;
            successfulUploads.push(i);
            updateOverallProgress(completedFiles, totalFiles);
            
            // Add fade-out animation
            fileItem.style.transition = 'opacity 0.5s ease';
            fileItem.style.opacity = '0.5';
        } catch (error) {
            fileStatus.textContent = 'Failed: ' + error.message;
            fileStatus.className = 'file-status error';
            failedUploads.push(i);
            console.error(`Error uploading ${file.name}:`, error);
        }
    }
    
    // Remove successfully uploaded files from the array
    // We need to remove from highest index to lowest to avoid index shifting issues
    successfulUploads.sort((a, b) => b - a).forEach(index => {
        files.splice(index, 1);
    });
    
    // Show notification and re-render file list
    if (successfulUploads.length > 0) {
        // Wait a moment to allow the user to see the "Completed" status before removing
        setTimeout(() => {
            renderFileList();
            overallProgress.textContent = `${successfulUploads.length} files uploaded successfully!`;
            if (failedUploads.length > 0) {
                overallProgress.textContent += ` ${failedUploads.length} files failed.`;
            }
        }, 1000);
    } else {
        overallProgress.textContent = `Upload failed for all files.`;
    }
    
    uploadButton.disabled = files.length === 0;
    uploadingFile = null;
}

async function uploadFileInChunks(file, progressBar, fileStatus) {
    const CHUNK_SIZE = calculateOptimalChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        let retries = 0;
        let uploadSuccess = false;
        
        while (!uploadSuccess && retries < MAX_RETRIES) {
            try {
                const formData = new FormData();
                formData.append('token', validToken);
                formData.append('file', chunk);
                formData.append('filename', file.name);
                formData.append('chunkIndex', chunkIndex);
                formData.append('totalChunks', totalChunks);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
                
                fileStatus.textContent = retries > 0 ? 
                    `Retry ${retries}/${MAX_RETRIES} - Chunk ${chunkIndex + 1}/${totalChunks}` : 
                    `Chunk ${chunkIndex + 1}/${totalChunks}`;
                    
                const response = await fetch(`${API_URL}?action=upload`, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message);
                }
                
                // Update progress
                const progress = ((chunkIndex + 1) / totalChunks) * 100;
                progressBar.style.width = `${progress}%`;
                fileStatus.textContent = `${Math.round(progress)}%`;
                uploadSuccess = true;
            } catch (error) {
                retries++;
                console.error(`Chunk ${chunkIndex + 1}/${totalChunks} attempt ${retries} failed:`, error);
                
                let errorMessage = "Unknown error";
                if (error.name === 'AbortError') {
                    errorMessage = "Connection timed out";
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                if (retries >= MAX_RETRIES) {
                    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
                }
                
                // Wait before retrying (exponential backoff)
                const delayMs = 1000 * Math.pow(2, retries);
                fileStatus.textContent = `Waiting to retry... (${delayMs/1000}s)`;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
}

function updateOverallProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    
    if (uploadingFile) {
        overallProgress.textContent = `Uploading ${completed}/${total} files (${percentage}%) - Current file: ${uploadingFile}`;
    } else {
        overallProgress.textContent = `${completed}/${total} files uploaded (${percentage}%)`;
    }
}