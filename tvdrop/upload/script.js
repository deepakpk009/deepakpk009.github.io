/**
 * File Upload Manager
 * This script handles file uploads with chunking, retries, and progress tracking
 */

// Configuration
const CONFIG = {
    API_URL: 'https://api.deepakpk.com/upload_v2/',
    MAX_RETRIES: 3,
    REQUEST_TIMEOUT: 120000, // 2 minutes
    CHUNK_SIZES: {
      SMALL: 1 * 1024 * 1024,  // 1MB for files < 5MB
      MEDIUM: 5 * 1024 * 1024, // 5MB for files < 50MB
      LARGE: 10 * 1024 * 1024  // 10MB for files >= 50MB
    },
    MAX_FILE_SIZE_FREE: 5 * 1024 * 1024 // 5MB max for non-subscribed users
  };
  
  // State management
  const STATE = {
    files: [],
    validToken: '',
    uploadingFile: null,
    fileFilter: '',
    allowedExtensions: [],
    isSubscribed: false
  };
  
  // DOM element references
  const DOM = {
    // Token related elements
    tokenInput: document.getElementById('token'),
    validateTokenBtn: document.getElementById('validate-token'),
    tokenStatus: document.getElementById('token-status'),
    
    // Upload section elements
    uploadSection: document.querySelector('.upload-section'),
    filterInfo: document.getElementById('filter-info'),
    filterText: document.getElementById('filter-text'),
    
    // File selection elements
    dropzone: document.getElementById('dropzone'),
    fileSelect: document.getElementById('file-select'),
    fileInput: document.getElementById('file-input'),
    fileList: document.getElementById('file-list'),
    
    // Progress and action elements
    uploadButton: document.getElementById('upload-button'),
    overallProgress: document.getElementById('overall-progress')
  };
  
  /**
   * Initialize the application
   */
  function initApp() {
    setupEventListeners();
    checkUrlParameters();
    adjustForViewport();
  }
  
  /**
   * Check URL parameters for token and file filter
   */
  function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const extensionParam = urlParams.get('extension');
    
    if (tokenParam && tokenParam.match(/^\d{6}$/)) {
      DOM.tokenInput.value = tokenParam;
    }
    
    if (extensionParam) {
      setFileFilter(extensionParam);
    }
  }
  
  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Token validation
    DOM.validateTokenBtn.addEventListener('click', validateToken);
    DOM.tokenInput.addEventListener('input', handleTokenInput);
    DOM.tokenInput.addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        validateToken();
      }
    });
    
    // File selection
    DOM.fileSelect.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput.addEventListener('change', handleFileSelect);
    DOM.uploadButton.addEventListener('click', startUpload);
    
    window.addEventListener('resize', adjustForViewport);

    // Drag and drop functionality
    setupDragAndDrop();
  }
  
  /**
   * Set up drag and drop event listeners
   */
  function setupDragAndDrop() {
    // Prevent default browser behavior
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      DOM.dropzone.addEventListener(eventName, preventDefaults, false);
    });
  
    // Highlight dropzone on drag events
    ['dragenter', 'dragover'].forEach(eventName => {
      DOM.dropzone.addEventListener(eventName, highlight, false);
    });
  
    // Remove highlight on leave/drop
    ['dragleave', 'drop'].forEach(eventName => {
      DOM.dropzone.addEventListener(eventName, unhighlight, false);
    });
  
    // Handle file drop
    DOM.dropzone.addEventListener('drop', handleDrop, false);
  }
  
  /**
   * Handle token input - limit to 6 digits
   */
  function handleTokenInput() {
    // Only allow digits and limit to 6 characters
    this.value = this.value.replace(/\D/g, '').substring(0, 6);
  }
  
  /**
   * Prevent default browser behavior for drag and drop
   */
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  /**
   * Highlight dropzone on drag enter/over
   */
  function highlight() {
    DOM.dropzone.classList.add('highlight');
  }
  
  /**
   * Remove highlight from dropzone on drag leave/drop
   */
  function unhighlight() {
    DOM.dropzone.classList.remove('highlight');
  }
  
  /**
   * Validate the entered token with the server
   */
  async function validateToken() {
    const token = DOM.tokenInput.value;
    
    if (!token.match(/^\d{6}$/)) {
      updateTokenStatus('Please enter a valid 6-digit token', 'error');
      return;
    }
    
    try {
      updateTokenStatus('Validating token...', '');
      
      const response = await makeApiRequest(`${CONFIG.API_URL}?action=check_status&token=${token}`, {
        method: 'GET',
        timeout: 30000
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store subscription status from API response
        STATE.isSubscribed = data.data && data.data.subscribed ? true : false;
        
        // Update token status message based on subscription
        let statusMessage = 'Token validated successfully!';
        if (!STATE.isSubscribed) {
          statusMessage += ' (Free account - 5MB file size limit)';
        }
        updateTokenStatus(statusMessage, 'completed');
        STATE.validToken = token;
        DOM.uploadSection.style.display = 'block';
      } else {
        updateTokenStatus('Invalid or expired token', 'error');
      }
    } catch (error) {
      handleTokenValidationError(error);
    }
  }
  
  /**
   * Update the token status display
   * @param {string} message - Status message to display
   * @param {string} statusClass - CSS class for styling (error, completed, etc.)
   */
  function updateTokenStatus(message, statusClass) {
    DOM.tokenStatus.textContent = message;
    DOM.tokenStatus.className = 'info-text' + (statusClass ? ' ' + statusClass : '');
  }
  
  /**
   * Handle errors during token validation
   * @param {Error} error - The error that occurred
   */
  function handleTokenValidationError(error) {
    let errorMessage = 'Error validating token';
    if (error.name === 'AbortError') {
      errorMessage = 'Connection timeout. Please try again.';
    } else if (error.message) {
      errorMessage += ': ' + error.message;
    }
    
    updateTokenStatus(errorMessage, 'error');
  }
  
  /**
   * Set file extension filter
   * @param {string} extension - Comma-separated list of file extensions
   */
  function setFileFilter(extension) {
    STATE.allowedExtensions = extension.split(',').map(ext => {
      // Ensure each extension starts with a dot
      ext = ext.trim().toLowerCase();
      return ext.startsWith('.') ? ext : '.' + ext;
    });
    
    // Build accept attribute
    STATE.fileFilter = STATE.allowedExtensions.join(',');
    DOM.fileInput.setAttribute('accept', STATE.fileFilter);
    
    // Show filter info
    DOM.filterInfo.style.display = 'block';
    DOM.filterText.textContent = STATE.allowedExtensions.join(', ');
  }
  
  /**
   * Check if file matches allowed extensions
   * @param {File} file - File to check
   * @returns {boolean} - Whether the file is allowed
   */
  function isFileAllowed(file) {
    if (!STATE.fileFilter || STATE.allowedExtensions.length === 0) {
      return true; // No filter specified, all files allowed
    }
    
    const fileName = file.name.toLowerCase();
    return STATE.allowedExtensions.some(ext => fileName.endsWith(ext));
  }
  
  /**
   * Handle file selection from input
   * @param {Event} e - Change event from file input
   */
  function handleFileSelect(e) {
    filterAndAddFiles(Array.from(e.target.files));
  }
  
  /**
   * Handle files dropped into the dropzone
   * @param {DragEvent} e - Drop event
   */
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const droppedFiles = Array.from(dt.files);
    filterAndAddFiles(droppedFiles);
  }
  
  /**
   * Filter files by allowed extensions and add them to the list
   * @param {File[]} newFiles - Array of files to process
   */
  function filterAndAddFiles(newFiles) {
    let filteredFiles = newFiles;
    let skippedCount = 0;
    let oversizedCount = 0;
    
    // Apply file extension filter if set
    if (STATE.fileFilter && STATE.allowedExtensions.length > 0) {
      const originalCount = filteredFiles.length;
      filteredFiles = filteredFiles.filter(file => isFileAllowed(file));
      skippedCount = originalCount - filteredFiles.length;
      
      if (skippedCount > 0) {
        showFilterNotification(skippedCount);
      }
    }
    
    // Apply file size filter for non-subscribed users
    if (!STATE.isSubscribed) {
      const originalCount = filteredFiles.length;
      filteredFiles = filteredFiles.filter(file => file.size <= CONFIG.MAX_FILE_SIZE_FREE);
      oversizedCount = originalCount - filteredFiles.length;
      
      if (oversizedCount > 0) {
        showSizeLimitNotification(oversizedCount);
      }
    }
    
    addFiles(filteredFiles);
  }
  
  /**
   * Show notification about skipped files due to filter
   * @param {number} skippedCount - Number of files skipped
   */
  function showFilterNotification(skippedCount) {
    alert(`${skippedCount} ${skippedCount === 1 ? 'file was' : 'files were'} skipped because ${skippedCount === 1 ? 'it doesn\'t' : 'they don\'t'} match the allowed types: ${STATE.allowedExtensions.join(', ')}`);
  }
  
  /**
   * Show notification about files exceeding size limit
   * @param {number} oversizedCount - Number of files exceeding size limit
   */
  function showSizeLimitNotification(oversizedCount) {
    const maxSizeMB = CONFIG.MAX_FILE_SIZE_FREE / (1024 * 1024);
    alert(`${oversizedCount} ${oversizedCount === 1 ? 'file was' : 'files were'} skipped because ${oversizedCount === 1 ? 'it exceeds' : 'they exceed'} the ${maxSizeMB}MB size limit for free accounts. Please subscribe to upload larger files.`);
  }
  
  /**
   * Add files to the file list, avoiding duplicates
   * @param {File[]} newFiles - Array of files to add
   */
  function addFiles(newFiles) {
    // Check for duplicates before adding to files array
    for (let i = 0; i < newFiles.length; i++) {
      // Check if file already exists in the list
      const exists = STATE.files.some(file => 
        file.name === newFiles[i].name && 
        file.size === newFiles[i].size
      );
      
      if (!exists) {
        STATE.files.push(newFiles[i]);
      }
    }
    
    renderFileList();
    updateUploadButton();
  }
  
  /**
   * Render the list of files in the UI
   */
  function renderFileList() {
    DOM.fileList.innerHTML = '';
    
    if (STATE.files.length === 0) {
      DOM.fileList.innerHTML = '<p class="info-text">No files selected</p>';
      return;
    }
    
    STATE.files.forEach((file, index) => {
      const fileItem = createFileListItem(file, index);
      DOM.fileList.appendChild(fileItem);
    });
  }
  
  /**
   * Create a file list item element
   * @param {File} file - File to create item for
   * @param {number} index - Index of the file in the files array
   * @returns {HTMLElement} - The file list item element
   */
  function createFileListItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.index = index;
    
    // Create file info section (name and size)
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
    
    // Create status wrapper to group status and remove button
    const statusWrapper = document.createElement('div');
    statusWrapper.className = 'file-status-wrapper';
    
    // Create status element
    const fileStatus = document.createElement('div');
    fileStatus.className = 'file-status';
    fileStatus.textContent = 'Waiting';
    
    // Create remove button
    const removeButton = createRemoveButton(index);
    
    // Add elements to status wrapper
    statusWrapper.appendChild(fileStatus);
    statusWrapper.appendChild(removeButton);
    
    // Create progress container
    const progressContainer = createProgressBar();
    
    // Assemble the file item
    fileItem.appendChild(fileInfo);
    fileItem.appendChild(statusWrapper);
    fileItem.appendChild(progressContainer);
    
    return fileItem;
}
  
  /**
   * Create a remove button for a file
   * @param {number} index - Index of the file to remove
   * @returns {HTMLElement} - The remove button element
   */
  function createRemoveButton(index) {
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.style.backgroundColor = '#ea4335';
    removeButton.addEventListener('click', () => removeFile(index));
    return removeButton;
  }
  
  /**
   * Create a progress bar container element
   * @returns {HTMLElement} - The progress container element
   */
  function createProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    progressContainer.appendChild(progressBar);
    return progressContainer;
  }
  
  /**
   * Remove a file from the list
   * @param {number} index - Index of the file to remove
   */
  function removeFile(index) {
    STATE.files.splice(index, 1);
    renderFileList();
    updateUploadButton();
  }
  
  /**
   * Update the enabled state of the upload button
   */
  function updateUploadButton() {
    DOM.uploadButton.disabled = STATE.files.length === 0 || !STATE.validToken;
  }
  
  /**
   * Format file size in human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted file size
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Calculate optimal chunk size based on file size
   * @param {number} fileSize - File size in bytes
   * @returns {number} - Chunk size in bytes
   */
  function calculateOptimalChunkSize(fileSize) {
    // For small files, use smaller chunks
    if (fileSize < 5 * 1024 * 1024) { // Less than 5MB
      return CONFIG.CHUNK_SIZES.SMALL;
    } 
    // For medium files
    else if (fileSize < 50 * 1024 * 1024) { // Less than 50MB
      return CONFIG.CHUNK_SIZES.MEDIUM;
    }
    // For large files
    else {
      return CONFIG.CHUNK_SIZES.LARGE;
    }
  }
  
  /**
   * Make an API request with timeout and abort capability
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - Fetch response
   */
  async function makeApiRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || CONFIG.REQUEST_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  /**
   * Start the upload process for all files
   */
  async function startUpload() {
    if (STATE.files.length === 0 || !STATE.validToken) return;
    
    try {
      // Check connection first
      await checkServerConnection();
      
      DOM.uploadButton.disabled = true;
      
      let completedFiles = 0;
      let totalFiles = STATE.files.length;
      let successfulUploads = [];
      let failedUploads = [];
      
      // Process each file
      for (let i = 0; i < STATE.files.length; i++) {
        const result = await processFileUpload(i, completedFiles, totalFiles);
        
        if (result.success) {
          completedFiles++;
          successfulUploads.push(i);
        } else {
          failedUploads.push(i);
        }
        
        updateOverallProgress(completedFiles, totalFiles);
      }
      
      // Cleanup and show final status
      finishUploadProcess(successfulUploads, failedUploads);
      
    } catch (error) {
      DOM.overallProgress.textContent = `${error.message}. Please try again.`;
    }
  }
  
  /**
   * Check server connection before starting upload
   */
  async function checkServerConnection() {
    DOM.overallProgress.textContent = "Checking connection...";
    
    try {
      await makeApiRequest(`${CONFIG.API_URL}?action=check_status&token=${STATE.validToken}`, {
        method: 'GET',
        timeout: 30000
      });
    } catch (error) {
      let errorMessage = "Connection problem";
      if (error.name === 'AbortError') {
        errorMessage = "Connection timed out";
      } else if (error.message) {
        errorMessage += ": " + error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Process upload for a single file
   * @param {number} fileIndex - Index of the file in the files array
   * @param {number} completedFiles - Number of files completed so far
   * @param {number} totalFiles - Total number of files to upload
   * @returns {Object} - Result of upload operation
   */
  async function processFileUpload(fileIndex, completedFiles, totalFiles) {
    const file = STATE.files[fileIndex];
    const fileItem = DOM.fileList.querySelector(`[data-index="${fileIndex}"]`);
    const fileStatus = fileItem.querySelector('.file-status');
    const progressBar = fileItem.querySelector('.progress-bar');
    const removeButton = fileItem.querySelector('button');
  
    // Hide/remove the Remove button when upload starts
    if (removeButton) {
      removeButton.style.display = 'none';
    }
  
  // Initialize with circular progress
  updateChunkStatus(fileStatus, 0, 1, 0);
  const statusText = fileStatus.querySelector('.status-text');
  if (statusText) {
      statusText.textContent = 'Uploading...';
  }
  
    STATE.uploadingFile = file.name;
    updateOverallProgress(completedFiles, totalFiles);
    
    try {
      await uploadFileInChunks(file, progressBar, fileStatus);
      
      // Remove spinner and update completed status
      fileStatus.innerHTML = '';
      fileStatus.textContent = 'Completed';
      fileStatus.className = 'file-status completed';
      
      // Add fade-out animation
      fileItem.style.transition = 'opacity 0.5s ease';
      fileItem.style.opacity = '0.5';
      
      return { success: true };
    } catch (error) {
      // Remove spinner and update error status
      fileStatus.innerHTML = '';
      fileStatus.textContent = 'Failed: ' + error.message;
      fileStatus.className = 'file-status error';
      
      // Show the Remove button again if upload fails
      if (removeButton) {
          removeButton.style.display = '';
      }
      
      console.error(`Error uploading ${file.name}:`, error);
      return { success: false, error };
    }
  }
  
  /**
   * Finish the upload process and update the UI
   * @param {number[]} successfulUploads - Indices of successfully uploaded files
   * @param {number[]} failedUploads - Indices of failed uploads
   */
  function finishUploadProcess(successfulUploads, failedUploads) {
    // Remove successfully uploaded files from the array
    // Sort from highest index to lowest to avoid index shifting issues
    successfulUploads.sort((a, b) => b - a).forEach(index => {
      STATE.files.splice(index, 1);
    });
    
    // Show notification and re-render file list
    if (successfulUploads.length > 0) {
      // Wait to allow the user to see the "Completed" status before removing
      setTimeout(() => {
        renderFileList();
        showFinalUploadStatus(successfulUploads.length, failedUploads.length);
      }, 1000);
    } else {
      DOM.overallProgress.textContent = `Upload failed for all files.`;
    }
    
    DOM.uploadButton.disabled = STATE.files.length === 0;
    STATE.uploadingFile = null;
  }
  
  /**
   * Show final upload status
   * @param {number} successCount - Number of successful uploads
   * @param {number} failCount - Number of failed uploads
   */
  function showFinalUploadStatus(successCount, failCount) {
    DOM.overallProgress.textContent = `${successCount} files uploaded successfully!`;
    if (failCount > 0) {
      DOM.overallProgress.textContent += ` ${failCount} files failed.`;
    }
  }
  
  /**
   * Upload a file in chunks
   * @param {File} file - File to upload
   * @param {HTMLElement} progressBar - Progress bar element
   * @param {HTMLElement} fileStatus - File status element
   */
  async function uploadFileInChunks(file, progressBar, fileStatus) {
    const CHUNK_SIZE = calculateOptimalChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      await uploadChunk(file, chunkIndex, totalChunks, CHUNK_SIZE, progressBar, fileStatus);
    }
  }
  
  /**
   * Upload a single chunk of a file
   * @param {File} file - The file being uploaded
   * @param {number} chunkIndex - Index of the current chunk
   * @param {number} totalChunks - Total number of chunks
   * @param {number} chunkSize - Size of each chunk in bytes
   * @param {HTMLElement} progressBar - Progress bar element
   * @param {HTMLElement} fileStatus - File status element
   */
  async function uploadChunk(file, chunkIndex, totalChunks, chunkSize, progressBar, fileStatus) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    let retries = 0;
    let uploadSuccess = false;
    
    while (!uploadSuccess && retries < CONFIG.MAX_RETRIES) {
      try {
        // Update status to show current chunk and retry if applicable
        updateChunkStatus(fileStatus, chunkIndex, totalChunks, retries);
        
        // Create form data
        const formData = createChunkFormData(file, chunk, chunkIndex, totalChunks);
        
        // Upload chunk
        const response = await makeApiRequest(`${CONFIG.API_URL}?action=upload`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message);
        }
        
        // Update progress
        updateChunkProgress(progressBar, fileStatus, chunkIndex, totalChunks);
        uploadSuccess = true;
      } catch (error) {
        retries++;
        console.error(`Chunk ${chunkIndex + 1}/${totalChunks} attempt ${retries} failed:`, error);
        
        if (retries >= CONFIG.MAX_RETRIES) {
          const errorMessage = getErrorMessage(error);
          throw new Error(`Failed after ${CONFIG.MAX_RETRIES} attempts: ${errorMessage}`);
        }
        
        // Wait before retrying (exponential backoff)
        await handleRetryBackoff(fileStatus, retries);
      }
    }
  }
  
  /**
   * Create form data for chunk upload
   * @param {File} file - The file being uploaded
   * @param {Blob} chunk - The chunk to upload
   * @param {number} chunkIndex - Index of the current chunk
   * @param {number} totalChunks - Total number of chunks
   * @returns {FormData} - Form data for upload request
   */
  function createChunkFormData(file, chunk, chunkIndex, totalChunks) {
    const formData = new FormData();
    formData.append('token', STATE.validToken);
    formData.append('file', chunk);
    formData.append('filename', file.name);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    return formData;
  }
  
  /**
   * Update the chunk status display
   * @param {HTMLElement} fileStatus - File status element
   * @param {number} chunkIndex - Index of the current chunk
   * @param {number} totalChunks - Total number of chunks
   * @param {number} retries - Number of retries for this chunk
   */
  function updateChunkStatus(fileStatus, chunkIndex, totalChunks, retries) {
    // Clear previous contents
    fileStatus.innerHTML = '';

    // Create circular progress indicator
    const circularProgress = document.createElement('div');
    circularProgress.className = 'circular-progress';
  
    // Create status text element
    const statusText = document.createElement('span');
    statusText.className = 'status-text';
    statusText.textContent = retries > 0 ? 
      `Retry ${retries}/${CONFIG.MAX_RETRIES} - Chunk ${chunkIndex + 1}/${totalChunks}` : 
      `Chunk ${chunkIndex + 1}/${totalChunks}`;

    // Add elements to fileStatus
    fileStatus.appendChild(circularProgress);
    fileStatus.appendChild(statusText);
  }
  
  /**
   * Update progress display after successful chunk upload
   * @param {HTMLElement} progressBar - Progress bar element
   * @param {HTMLElement} fileStatus - File status element
   * @param {number} chunkIndex - Index of the current chunk
   * @param {number} totalChunks - Total number of chunks
   */
  function updateChunkProgress(progressBar, fileStatus, chunkIndex, totalChunks) {
    const progress = ((chunkIndex + 1) / totalChunks) * 100;
    progressBar.style.width = `${progress}%`;
  
    // Update only the text part, keeping the spinner
    const statusText = fileStatus.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = `${Math.round(progress)}%`;
    }
  }
  
  /**
   * Handle retry backoff with exponential delay
   * @param {HTMLElement} fileStatus - File status element
   * @param {number} retries - Number of retries so far
   */
  async function handleRetryBackoff(fileStatus, retries) {
    const delayMs = 1000 * Math.pow(2, retries);
  
    // Keep the spinner but update the status text
    const statusText = fileStatus.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = `Waiting to retry... (${delayMs/1000}s)`;
    }
  
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  /**
   * Get appropriate error message from error object
   * @param {Error} error - The error that occurred
   * @returns {string} - Error message to display
   */
  function getErrorMessage(error) {
    let errorMessage = "Unknown error";
    if (error.name === 'AbortError') {
      errorMessage = "Connection timed out";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return errorMessage;
  }
  
  /**
   * Update the overall progress display
   * @param {number} completed - Number of completed files
   * @param {number} total - Total number of files
   */
  function updateOverallProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    
    if (STATE.uploadingFile) {
      DOM.overallProgress.textContent = `Uploading ${completed}/${total} files (${percentage}%) - Current file: ${STATE.uploadingFile}`;
    } else {
      DOM.overallProgress.textContent = `${completed}/${total} files uploaded (${percentage}%)`;
    }
  }

  /**
    * Adjust UI elements based on viewport size
  */
  function adjustForViewport() {
    const isMobile = window.innerWidth <= 600;
    
    // Adjust text content for mobile
    if (isMobile) {
      DOM.fileSelect.textContent = "Select";
      DOM.validateTokenBtn.textContent = "Validate";
      DOM.uploadButton.textContent = "Upload";
    } else {
      DOM.fileSelect.textContent = "Select Files";
      DOM.validateTokenBtn.textContent = "Validate Token";
      DOM.uploadButton.textContent = "Upload Files";
    }
  }
  
  // Initialize the application when the DOM is loaded
  document.addEventListener('DOMContentLoaded', initApp);