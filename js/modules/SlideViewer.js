/**
 * SlideViewer module
 * Handles loading and navigating through slides
 */
export class SlideViewer {
    /**
     * Constructor for SlideViewer
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        // DOM elements
        this.slideDisplay = config.slideDisplay;
        this.prevBtn = config.prevBtn;
        this.nextBtn = config.nextBtn;
        this.slideCounter = config.slideCounter;
        
        // State
        this.currentSlideIndex = 1;
        this.totalSlides = config.totalSlides || 26;
        
        // Zip content (if available)
        this.zipLoader = config.zipLoader || null;
        
        // Event listeners
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners for navigation
     */
    setupEventListeners() {
        // Navigation buttons
        this.prevBtn.addEventListener('click', () => {
            if (this.currentSlideIndex > 1) {
                this.loadSlide(this.currentSlideIndex - 1);
            }
        });
        
        this.nextBtn.addEventListener('click', () => {
            if (this.currentSlideIndex < this.totalSlides) {
                this.loadSlide(this.currentSlideIndex + 1);
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            // Skip navigation if a modal is open or if we're in a text input/editor
            const isModalOpen = document.querySelector('.modal-overlay');
            const isEditingText = document.activeElement.isContentEditable || 
                                 ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
            
            // Skip keyboard navigation if modifier keys are pressed (Ctrl, Alt, Shift, Meta)
            const hasModifier = event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
            
            // Only process arrow keys for navigation when not editing and no modifiers
            if (!isModalOpen && !isEditingText && !hasModifier) {
                if (event.key === 'ArrowLeft' && this.currentSlideIndex > 1) {
                    this.loadSlide(this.currentSlideIndex - 1);
                } else if (event.key === 'ArrowRight' && this.currentSlideIndex < this.totalSlides) {
                    this.loadSlide(this.currentSlideIndex + 1);
                }
            }
        });
    }
    
    /**
     * Load a slide by index
     * @param {number} index - The slide index to load
     * @returns {Promise} - Promise that resolves when the slide is loaded
     */
    async loadSlide(index) {
        try {
            // Trigger pre-load event for any listeners
            this.triggerEvent('beforeSlideLoad', { currentIndex: this.currentSlideIndex, newIndex: index });
            
            let svgContent;
            
            // Check if we have a zip loader with slides
            if (this.zipLoader && this.zipLoader.getSlide(index)) {
                // Load from zip content
                svgContent = this.zipLoader.getSlide(index);
                console.log(`Loaded slide ${index} from zip content`);
                
                // Update total slides count if needed
                if (this.totalSlides !== this.zipLoader.getTotalSlides()) {
                    this.totalSlides = this.zipLoader.getTotalSlides();
                    console.log(`Updated total slides to ${this.totalSlides} based on zip content`);
                }
            } else {
                // Load from file system
                const response = await fetch(`slides/Slide${index}.SVG`);
                if (!response.ok) {
                    throw new Error(`Failed to load slide ${index}`);
                }
                svgContent = await response.text();
            }
            
            // Set the SVG content
            this.slideDisplay.innerHTML = svgContent;
            
            // Resize the SVG to fit the container
            this.resizeSvgToFit();
            
            // Update counter
            this.slideCounter.textContent = `Slide ${index} of ${this.totalSlides}`;
            
            // Update button states
            this.prevBtn.disabled = index === 1;
            this.nextBtn.disabled = index === this.totalSlides;
            
            // Update current index
            this.currentSlideIndex = index;
            
            // Trigger post-load event for any listeners
            this.triggerEvent('afterSlideLoad', { currentIndex: index });
            
            return this.slideDisplay.querySelector('svg');
        } catch (error) {
            console.error(error);
            this.slideDisplay.innerHTML = `<p class="error">Error loading slide ${index}</p>`;
            return null;
        }
    }
    
    /**
     * Get the current slide index
     * @returns {number} - The current slide index
     */
    getCurrentSlideIndex() {
        return this.currentSlideIndex;
    }
    
    /**
     * Get the current SVG element
     * @returns {SVGElement|null} - The current SVG element or null if not loaded
     */
    getCurrentSvgElement() {
        return this.slideDisplay.querySelector('svg');
    }
    
    /**
     * Trigger a custom event for listeners
     * @param {string} eventName - Name of the event
     * @param {Object} data - Data to pass with the event
     */
    triggerEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        this.slideDisplay.dispatchEvent(event);
    }
    
    /**
     * Add an event listener for slide viewer events
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     */
    on(eventName, callback) {
        this.slideDisplay.addEventListener(eventName, callback);
    }
    
    /**
     * Remove an event listener
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     */
    off(eventName, callback) {
        this.slideDisplay.removeEventListener(eventName, callback);
    }
    
    /**
     * Resize the SVG to fit properly within the container
     * Ensures the SVG maintains its aspect ratio while fitting in the available space
     */
    resizeSvgToFit() {
        const svg = this.slideDisplay.querySelector('svg');
        if (!svg) return;
        
        // Get the container dimensions
        const containerWidth = this.slideDisplay.clientWidth;
        const containerHeight = this.slideDisplay.clientHeight;
        
        // Get the SVG's viewBox or create one if it doesn't exist
        let viewBox = svg.getAttribute('viewBox');
        if (!viewBox) {
            // If no viewBox, create one based on width/height attributes or default values
            const width = svg.getAttribute('width') || 800;
            const height = svg.getAttribute('height') || 600;
            viewBox = `0 0 ${width} ${height}`;
            svg.setAttribute('viewBox', viewBox);
        }
        
        // Ensure the SVG has width and height set to 100%
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        // Add preserveAspectRatio attribute to maintain aspect ratio
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        console.log(`Resized SVG to fit container: ${containerWidth}x${containerHeight}`);
    }
}
