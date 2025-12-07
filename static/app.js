/**
 * Monkee - AI Image Generation
 * Frontend Application
 */

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');
const promptInput = document.getElementById('promptInput');
const charCount = document.getElementById('charCount');
const aspectRatio = document.getElementById('aspectRatio');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const downloadBtn = document.getElementById('downloadBtn');
const newGenerationBtn = document.getElementById('newGenerationBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// State
let uploadedFiles = [];
const MAX_FILES = 14;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkApiHealth();
    setupEventListeners();
});

/**
 * Check API health status
 */
async function checkApiHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();

        if (!data.api_configured) {
            showError('API key not configured. Please set GOOGLE_API_KEY environment variable.');
        }
    } catch (error) {
        showError('Unable to connect to the server. Please try again later.');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Upload area click
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Prompt input
    promptInput.addEventListener('input', handlePromptInput);

    // Generate button
    generateBtn.addEventListener('click', handleGenerate);

    // Result actions
    downloadBtn.addEventListener('click', handleDownload);
    newGenerationBtn.addEventListener('click', handleNewGeneration);

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
    fileInput.value = '';
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

/**
 * Handle file drop
 */
function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files).filter(file =>
        file.type.startsWith('image/')
    );
    addFiles(files);
}

/**
 * Add files to upload list
 */
function addFiles(files) {
    const remainingSlots = MAX_FILES - uploadedFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
        showError(`Maximum ${MAX_FILES} images allowed. Only ${remainingSlots} more can be added.`);
    }

    filesToAdd.forEach(file => {
        uploadedFiles.push(file);
        createPreviewItem(file, uploadedFiles.length - 1);
    });

    updateGenerateButton();
    hideError();
}

/**
 * Create preview item for uploaded file
 */
function createPreviewItem(file, index) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.dataset.index = index;
        item.innerHTML = `
            <img src="${e.target.result}" alt="Preview ${index + 1}">
            <button class="preview-remove" title="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        item.querySelector('.preview-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(index);
        });

        previewGrid.appendChild(item);
    };

    reader.readAsDataURL(file);
}

/**
 * Remove file from upload list
 */
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    rebuildPreviewGrid();
    updateGenerateButton();
}

/**
 * Rebuild preview grid after removal
 */
function rebuildPreviewGrid() {
    previewGrid.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        createPreviewItem(file, index);
    });
}

/**
 * Handle prompt input
 */
function handlePromptInput() {
    const length = promptInput.value.length;
    charCount.textContent = length;
    updateGenerateButton();
    hideError();
}

/**
 * Update generate button state
 */
function updateGenerateButton() {
    const hasPrompt = promptInput.value.trim().length > 0;
    const hasImages = uploadedFiles.length > 0;

    // Enable if we have a prompt (images are optional for text-to-image)
    generateBtn.disabled = !hasPrompt;
}

/**
 * Handle generate button click
 */
async function handleGenerate() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showError('Please enter a prompt to generate an image.');
        return;
    }

    // Disable button and show loading
    setLoading(true);
    hideError();
    resultSection.hidden = true;

    try {
        // Create form data
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('aspect_ratio', aspectRatio.value);

        // Add images
        uploadedFiles.forEach((file, index) => {
            formData.append('images', file);
        });

        // Send request
        const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to generate image');
        }

        if (data.success && data.image) {
            // Show result
            resultImage.src = data.image;
            resultSection.hidden = false;

            // Scroll to result
            setTimeout(() => {
                resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            throw new Error('No image was generated');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showError(error.message || 'An error occurred while generating the image.');
    } finally {
        setLoading(false);
    }
}

/**
 * Handle download button click
 */
function handleDownload() {
    const imageSrc = resultImage.src;

    if (!imageSrc) return;

    // Create download link
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `monkee-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Handle new generation button click
 */
function handleNewGeneration() {
    // Clear uploaded files
    uploadedFiles = [];
    previewGrid.innerHTML = '';

    // Clear prompt
    promptInput.value = '';
    charCount.textContent = '0';

    // Hide result
    resultSection.hidden = true;
    resultImage.src = '';

    // Hide any errors
    hideError();

    // Update button state
    updateGenerateButton();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Focus on upload area
    promptInput.focus();
}

/**
 * Set loading state
 */
function setLoading(isLoading) {
    generateBtn.disabled = isLoading;

    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoader = generateBtn.querySelector('.btn-loader');

    if (isLoading) {
        btnText.hidden = true;
        btnLoader.hidden = false;
    } else {
        btnText.hidden = false;
        btnLoader.hidden = true;
    }
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    errorMessage.hidden = false;

    // Scroll error into view
    setTimeout(() => {
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.hidden = true;
    errorText.textContent = '';
}
