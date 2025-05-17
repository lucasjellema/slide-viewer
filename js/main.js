/**
 * Main entry point for the Slide Viewer application
 */
import { SlideViewer } from './modules/SlideViewer.js';
import { AdminController } from './modules/AdminController.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the slide viewer
    const slideViewer = new SlideViewer({
        slideDisplay: document.getElementById('slide-display'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        slideCounter: document.getElementById('slide-counter'),
        totalSlides: 26
    });
    
    // Initialize the admin controller if admin mode is enabled
    const adminController = new AdminController({
        adminControls: document.getElementById('admin-controls'),
        editBtn: document.getElementById('edit-btn'),
        downloadBtn: document.getElementById('download-btn'),
        slideViewer: slideViewer
    });
    
    // Check for admin mode in URL
    adminController.checkAdminMode();
    
    // Load the first slide
    slideViewer.loadSlide(1);
});
