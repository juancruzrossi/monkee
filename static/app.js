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
const resultContainer = document.getElementById('resultContainer');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const newGenerationBtn = document.getElementById('newGenerationBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const currentYear = document.getElementById('currentYear');
const fullscreenModal = document.getElementById('fullscreenModal');
const fullscreenImage = document.getElementById('fullscreenImage');
const fullscreenClose = document.getElementById('fullscreenClose');
const promptsToggle = document.getElementById('promptsToggle');
const promptsList = document.getElementById('promptsList');

// State
let uploadedFiles = [];
let isGenerating = false;
const MAX_FILES = 14;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setCurrentYear();
    checkApiHealth();
    setupEventListeners();
});

/**
 * Set current year in footer
 */
function setCurrentYear() {
    currentYear.textContent = new Date().getFullYear();
}

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
    shareBtn.addEventListener('click', handleShare);
    newGenerationBtn.addEventListener('click', handleNewGeneration);

    // Result container click for fullscreen
    resultContainer.addEventListener('click', () => {
        if (resultImage.src) {
            openFullscreen(resultImage.src);
        }
    });

    // Fullscreen modal
    fullscreenClose.addEventListener('click', closeFullscreen);
    fullscreenModal.addEventListener('click', (e) => {
        if (e.target === fullscreenModal) {
            closeFullscreen();
        }
    });

    // Escape key to close fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !fullscreenModal.classList.contains('hidden')) {
            closeFullscreen();
        }
    });

    // Suggested prompts toggle
    promptsToggle.addEventListener('click', togglePromptsList);

    // Prompt items
    document.querySelectorAll('.prompt-item').forEach(item => {
        item.addEventListener('click', () => {
            const prompt = item.dataset.prompt;
            promptInput.value = prompt;
            handlePromptInput();
            promptInput.focus();
            // Close the prompts list
            promptsList.classList.add('hidden');
            promptsToggle.classList.remove('active');
        });
    });

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
}

/**
 * Toggle suggested prompts list
 */
function togglePromptsList() {
    promptsList.classList.toggle('hidden');
    promptsToggle.classList.toggle('active');
}

/**
 * Open fullscreen modal
 */
function openFullscreen(imageSrc) {
    fullscreenImage.src = imageSrc;
    fullscreenModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Close fullscreen modal
 */
function closeFullscreen() {
    fullscreenModal.classList.add('hidden');
    document.body.style.overflow = '';
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
        const imageSrc = e.target.result;
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.dataset.index = index;
        item.innerHTML = `
            <img src="${imageSrc}" alt="Preview ${index + 1}">
            <button class="preview-remove" title="Remove image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        // Remove button - must be set up FIRST
        const removeBtn = item.querySelector('.preview-remove');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeFile(index);
        });

        // Click on image (not on remove button) to view fullscreen
        const img = item.querySelector('img');
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            openFullscreen(imageSrc);
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
    // Only enable if we have a prompt AND not currently generating
    generateBtn.disabled = !hasPrompt || isGenerating;
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

    if (isGenerating) {
        return; // Prevent double-clicks
    }

    // Set generating state
    isGenerating = true;
    setLoading(true);
    hideError();
    resultSection.classList.add('hidden');

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
            resultSection.classList.remove('hidden');

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
        // Always reset generating state
        isGenerating = false;
        setLoading(false);
    }
}

/**
 * Handle share button click
 */
async function handleShare() {
    const imageSrc = resultImage.src;

    if (!imageSrc) return;

    try {
        // Check if Web Share API is available
        if (navigator.share && navigator.canShare) {
            // Convert base64 to blob for sharing
            const response = await fetch(imageSrc);
            const blob = await response.blob();
            const file = new File([blob], `monkee-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Monkee AI Generated Image',
                    text: 'Check out this AI generated image!'
                });
                return;
            }
        }

        // Fallback: copy image URL to clipboard (for desktop)
        if (navigator.clipboard) {
            // For data URLs, we'll just notify the user to download
            showError('Share not supported on this device. Please use Download instead.');
            setTimeout(hideError, 3000);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Share error:', error);
            showError('Unable to share. Please use Download instead.');
            setTimeout(hideError, 3000);
        }
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
    resultSection.classList.add('hidden');
    resultImage.src = '';

    // Hide any errors
    hideError();

    // Reset generating state just in case
    isGenerating = false;

    // Update button state
    updateGenerateButton();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Focus on prompt input
    promptInput.focus();
}

/**
 * Set loading state
 */
function setLoading(loading) {
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoader = generateBtn.querySelector('.btn-loader');

    if (loading) {
        generateBtn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        updateGenerateButton(); // Re-evaluate button state
    }
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');

    // Scroll error into view
    setTimeout(() => {
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.add('hidden');
    errorText.textContent = '';
}
