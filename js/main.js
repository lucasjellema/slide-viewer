/**
 * Main entry point for the Slide Viewer application
 */
import { SlideViewer } from './modules/SlideViewer.js';
import { AdminController } from './modules/AdminController.js';
import { ZipLoader } from './modules/ZipLoader.js';
import { AnnotationManager } from './modules/AnnotationManager.js';

/**
 * Get a URL parameter by name
 * @param {string} name - The parameter name
 * @returns {string|null} - The parameter value or null if not found
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Initialize the application
 * @param {ZipLoader|null} zipLoader - Optional ZipLoader instance
 */
function initializeApp(zipLoader = null) {
    // Initialize the slide viewer
    const slideViewer = new SlideViewer({
        slideDisplay: document.getElementById('slide-display'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        slideCounter: document.getElementById('slide-counter'),
        totalSlides: zipLoader ? zipLoader.getTotalSlides() : 26,
        zipLoader: zipLoader
    });
    
    // Initialize the admin controller if admin mode is enabled
    const adminController = new AdminController({
        adminControls: document.getElementById('admin-controls'),
        editBtn: document.getElementById('edit-btn'),
        downloadBtn: document.getElementById('download-btn'),
        slideViewer: slideViewer
    });
    
    // Set up the annotation manager with the zip loader if available
    adminController.annotationManager = new AnnotationManager(slideViewer, zipLoader);
    
    // Check for admin mode in URL
    adminController.checkAdminMode();
    
    // Load the first slide
    slideViewer.loadSlide(1);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check if we have a slidesZipUrl parameter
    const slidesZipUrl = getUrlParameter('slidesZipUrl');
    
    if (slidesZipUrl) {
        // Show loading message
        document.getElementById('slide-display').innerHTML = '<div class="loading">Loading slides from zip file...</div>';
        
        // Create a new ZipLoader and download the zip file
        const zipLoader = new ZipLoader();
        const success = await zipLoader.downloadAndExtract(slidesZipUrl);
        
        if (success) {
            console.log(`Successfully loaded ${zipLoader.getTotalSlides()} slides from zip file`);
            initializeApp(zipLoader);
        } else {
            console.error('Failed to load slides from zip file');
            document.getElementById('slide-display').innerHTML = '<div class="error">Failed to load slides from zip file. Check the console for details.</div>';
            // Initialize without zip content as fallback
            setTimeout(() => initializeApp(), 2000);
        }
    } else {
        // Initialize without zip content
        initializeApp();
    }
});
