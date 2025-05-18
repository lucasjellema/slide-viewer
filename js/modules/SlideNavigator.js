/**
 * SlideNavigator module
 * Handles the collapsible panel and slide navigator functionality
 */
export class SlideNavigator {
    /**
     * Constructor for SlideNavigator
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        // DOM elements
        this.slideViewer = config.slideViewer;
        this.panelHeader = document.getElementById('overview-panel-header');
        this.panelContent = document.getElementById('overview-panel-content');
        this.toggleBtn = document.getElementById('toggle-overview');
        this.navigatorContainer = document.getElementById('slide-navigator');
        
        // State
        this.isCollapsed = true; // Start collapsed
        this.thumbnails = [];
        this.totalSlides = this.slideViewer.totalSlides;
        this.previewTooltip = null;
        this.previewContent = null;
        this.previewTitle = null;
        
        // Initialize
        this.createPreviewTooltip();
        this.setupEventListeners();
        this.createThumbnails();
        
        // Initially collapse the panel
        this.panelContent.classList.add('collapsed');
        this.toggleBtn.classList.add('collapsed');
        
        // Listen for slide changes to update active thumbnail
        // Use a more reliable method to detect slide changes
        this.currentSlideIndex = this.slideViewer.getCurrentSlideIndex() || 1;
        this.updateActiveThumbnail(this.currentSlideIndex);
        
        // Add a direct listener to the SlideViewer
        this.slideViewer.on('afterSlideLoad', (event) => {
            if (event.detail && event.detail.currentIndex) {
                this.currentSlideIndex = event.detail.currentIndex;
                this.updateActiveThumbnail(this.currentSlideIndex);
            }
        });
        
        // Also listen for the document event as a fallback
        document.addEventListener('afterSlideLoad', (event) => {
            if (event.detail && event.detail.currentIndex) {
                this.currentSlideIndex = event.detail.currentIndex;
                this.updateActiveThumbnail(this.currentSlideIndex);
            }
        });
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Toggle panel when header is clicked
        this.panelHeader.addEventListener('click', () => {
            this.togglePanel();
        });
        
        // Prevent click on button from bubbling to header
        this.toggleBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            this.togglePanel();
        });
    }
    
    /**
     * Toggle the panel open/closed
     */
    togglePanel() {
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            this.panelContent.classList.add('collapsed');
            this.toggleBtn.classList.add('collapsed');
        } else {
            this.panelContent.classList.remove('collapsed');
            this.toggleBtn.classList.remove('collapsed');
        }
    }
    
    /**
     * Create thumbnails for all slides
     */
    createThumbnails() {
        // Clear existing thumbnails
        this.navigatorContainer.innerHTML = '';
        this.thumbnails = [];
        
        // Create a thumbnail for each slide
        for (let i = 1; i <= this.totalSlides; i++) {
            const thumbnail = this.createThumbnail(i);
            this.navigatorContainer.appendChild(thumbnail);
            this.thumbnails.push(thumbnail);
        }
        
        // Set the first thumbnail as active
        if (this.thumbnails.length > 0) {
            this.updateActiveThumbnail(1);
        }
    }
    
    /**
     * Create a single thumbnail
     * @param {number} index - The slide index
     * @returns {HTMLElement} - The thumbnail element
     */
    createThumbnail(index) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'slide-thumbnail';
        thumbnail.dataset.slideIndex = index;
        
        // Create a container for the slide preview
        const previewContainer = document.createElement('div');
        previewContainer.className = 'thumbnail-preview';
        previewContainer.style.width = '100%';
        previewContainer.style.height = '100%';
        previewContainer.style.display = 'flex';
        previewContainer.style.alignItems = 'center';
        previewContainer.style.justifyContent = 'center';
        
        // Create slide number indicator
        const slideNumber = document.createElement('div');
        slideNumber.className = 'slide-number';
        slideNumber.textContent = index;
        
        // Add click handler to navigate to this slide
        thumbnail.addEventListener('click', () => {
            this.slideViewer.loadSlide(index);
        });
        
        // Add mouse events for preview tooltip
        thumbnail.addEventListener('mouseenter', (event) => {
            this.showPreviewTooltip(index, event);
        });
        
        thumbnail.addEventListener('mouseleave', () => {
            this.hidePreviewTooltip();
        });
        
        // Update preview position on mouse move
        thumbnail.addEventListener('mousemove', (event) => {
            // Only update position if tooltip is visible
            if (this.previewTooltip.classList.contains('visible')) {
                // Get dimensions
                const cursorX = event.clientX;
                const cursorY = event.clientY;
                const previewWidth = parseInt(this.previewTooltip.style.width);
                const previewHeight = parseInt(this.previewTooltip.style.height);
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Position above and to the right of cursor by default
                let left = cursorX + 20;
                let top = cursorY - previewHeight - 40;
                
                // Adjust if would go off screen
                if (left + previewWidth > viewportWidth - 20) {
                    left = viewportWidth - previewWidth - 20;
                }
                
                if (top < 20) {
                    // Position below cursor instead
                    top = cursorY + 20;
                }
                
                // Set position with smooth transition
                this.previewTooltip.style.transition = 'left 0.1s, top 0.1s';
                this.previewTooltip.style.left = `${left}px`;
                this.previewTooltip.style.top = `${top}px`;
            }
        });
        
        // Add elements to thumbnail
        thumbnail.appendChild(previewContainer);
        thumbnail.appendChild(slideNumber);
        
        // Load the slide content as thumbnail preview
        this.loadThumbnailPreview(previewContainer, index);
        
        return thumbnail;
    }
    
    /**
     * Load a preview of the slide for the thumbnail
     * @param {HTMLElement} container - The container element
     * @param {number} index - The slide index
     */
    async loadThumbnailPreview(container, index) {
        try {
            // Create a loading indicator
            container.innerHTML = `<div style="text-align:center;">Loading...</div>`;
            
            let svgContent;
            
            // If we have a zip loader with slides
            if (this.slideViewer.zipLoader && this.slideViewer.zipLoader.getSlide(index)) {
                // Load from zip content
                svgContent = this.slideViewer.zipLoader.getSlide(index);
            } else {
                // Load from file system
                try {
                    const response = await fetch(`slides/Slide${index}.SVG`);
                    if (!response.ok) {
                        throw new Error(`Failed to load slide ${index}`);
                    }
                    svgContent = await response.text();
                } catch (error) {
                    console.error(`Error fetching slide ${index}:`, error);
                    container.innerHTML = `<div style="text-align:center;">Slide ${index}</div>`;
                    return;
                }
            }
            
            // Create a new div for the SVG content
            const svgContainer = document.createElement('div');
            svgContainer.style.width = '100%';
            svgContainer.style.height = '100%';
            svgContainer.style.overflow = 'hidden';
            
            // Set the SVG content
            svgContainer.innerHTML = svgContent;
            
            // Clear the container and add the SVG container
            container.innerHTML = '';
            container.appendChild(svgContainer);
            
            // Get the SVG element
            const svg = svgContainer.querySelector('svg');
            if (svg) {
                // Ensure proper scaling and display
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.maxWidth = '100%';
                svg.style.maxHeight = '100%';
                svg.style.display = 'block'; // Ensure it's displayed as block
                
                // Preserve aspect ratio
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                
                // Remove all text elements for further simplification
                const textElements = svg.querySelectorAll('text, tspan, textPath');
                textElements.forEach(text => text.remove());
                
                // Remove any scripts or interactive elements for security and performance
                const scripts = svg.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                
                // Remove any animations for thumbnails
                const animations = svg.querySelectorAll('animate, animateTransform, animateMotion, set');
                animations.forEach(anim => anim.remove());
                
                // Hide any title or desc elements
                const metaElements = svg.querySelectorAll('title, desc');
                metaElements.forEach(el => el.style.display = 'none');
            } else {
                console.warn(`No SVG element found in slide ${index}`);
                container.innerHTML = `<div style="text-align:center;">Slide ${index}</div>`;
            }
        } catch (error) {
            console.error(`Error loading thumbnail for slide ${index}:`, error);
            container.innerHTML = `<div style="text-align:center;">Slide ${index}</div>`;
        }
    }
    
    /**
     * Simplify complex SVG elements for better thumbnail performance
     * @param {SVGElement} svg - The SVG element to simplify
     */
    simplifyComplexElements(svg) {
        // For very complex SVGs, we might want to simplify for thumbnails
        // This is optional and depends on performance needs
        
        // Example: Reduce opacity of very small elements that won't be visible in thumbnails
        const tinyElements = svg.querySelectorAll('path[d*="0.1"], circle[r="0.5"]');
        tinyElements.forEach(el => {
            el.style.opacity = '0.5';
        });
        
        // Example: Simplify very complex groups with many children
        const complexGroups = Array.from(svg.querySelectorAll('g')).filter(g => g.children.length > 50);
        complexGroups.forEach(group => {
            // Keep only a subset of children for the thumbnail
            Array.from(group.children).slice(20).forEach(child => {
                child.style.display = 'none';
            });
        });
    }
    
    /**
     * Update the active thumbnail
     * @param {number} index - The active slide index
     */
    updateActiveThumbnail(index) {
        console.log(`Updating active thumbnail to slide ${index}`);
        
        if (!index || index < 1 || index > this.thumbnails.length) {
            console.warn(`Invalid slide index: ${index}`);
            return;
        }
        
        // Remove active class from all thumbnails
        this.thumbnails.forEach((thumbnail, i) => {
            if (thumbnail.classList.contains('active')) {
                console.log(`Removing active class from slide ${i + 1}`);
                thumbnail.classList.remove('active');
            }
        });
        
        // Add active class to the current thumbnail
        const activeThumbnail = this.thumbnails[index - 1];
        if (activeThumbnail) {
            console.log(`Adding active class to slide ${index}`);
            activeThumbnail.classList.add('active');
            
            // Scroll the thumbnail into view if the panel is open
            if (!this.isCollapsed) {
                activeThumbnail.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        } else {
            console.warn(`Thumbnail for slide ${index} not found`);
        }
    }
    
    /**
     * Create the preview tooltip element
     */
    createPreviewTooltip() {
        // Create tooltip container
        this.previewTooltip = document.createElement('div');
        this.previewTooltip.className = 'slide-preview-tooltip';
        this.previewTooltip.setAttribute('id', 'slide-preview-tooltip');
        
        // Create tooltip content
        this.previewContent = document.createElement('div');
        this.previewContent.className = 'slide-preview-content';
        this.previewTooltip.appendChild(this.previewContent);
        
        // Create title element
        this.previewTitle = document.createElement('div');
        this.previewTitle.className = 'preview-title';
        this.previewTooltip.appendChild(this.previewTitle);
        
        // Add to document
        document.body.appendChild(this.previewTooltip);
    }
    
    /**
     * Show the preview tooltip for a slide
     * @param {number} index - The slide index
     * @param {MouseEvent} event - The mouse event
     */
    async showPreviewTooltip(index, event) {
        // First, completely remove the old tooltip if it exists
        if (this.previewTooltip) {
            document.body.removeChild(this.previewTooltip);
        }
        
        // Create a completely new tooltip for each preview to avoid any content spillover
        this.createPreviewTooltip();
        
        // Set title
        this.previewTitle.textContent = `Slide ${index}`;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate size as 50% of the page (viewport) for a much larger preview
        const previewWidth = Math.round(viewportWidth * 0.5);
        const previewHeight = Math.round(viewportHeight * 0.5);
        
        // Set size
        this.previewTooltip.style.width = `${previewWidth}px`;
        this.previewTooltip.style.height = `${previewHeight}px`;
        
        // Position tooltip near cursor but not directly under it
        const cursorX = event.clientX;
        const cursorY = event.clientY;
        
        // Position above and to the right of cursor by default
        let left = cursorX + 20;
        let top = cursorY - previewHeight - 40;
        
        // Adjust if would go off screen
        if (left + previewWidth > viewportWidth - 20) {
            left = viewportWidth - previewWidth - 20;
        }
        
        if (top < 20) {
            // Position below cursor instead
            top = cursorY + 20;
        }
        
        // Set position
        this.previewTooltip.style.left = `${left}px`;
        this.previewTooltip.style.top = `${top}px`;
        
        // Load full slide content (with text)
        try {
            let svgContent;
            
            // If we have a zip loader with slides
            if (this.slideViewer.zipLoader && this.slideViewer.zipLoader.getSlide(index)) {
                // Load from zip content
                svgContent = this.slideViewer.zipLoader.getSlide(index);
            } else {
                // Load from file system
                const response = await fetch(`slides/Slide${index}.SVG`);
                if (!response.ok) {
                    throw new Error(`Failed to load slide ${index}`);
                }
                svgContent = await response.text();
            }
            
            // Create an iframe to completely isolate the SVG content
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.overflow = 'hidden';
            
            // Add the iframe to the preview content
            this.previewContent.appendChild(iframe);
            
            // Wait for iframe to load
            await new Promise(resolve => {
                iframe.onload = resolve;
                iframe.src = 'about:blank';
            });
            
            // Get the iframe document
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // Create a complete HTML document with the SVG content
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body, html {
                            margin: 0;
                            padding: 0;
                            width: 100%;
                            height: 100%;
                            overflow: hidden;
                        }
                        svg {
                            width: 100%;
                            height: 100%;
                            display: block;
                            max-width: 100%;
                            max-height: 100%;
                        }
                    </style>
                </head>
                <body>
                    ${svgContent}
                </body>
                </html>
            `);
            iframeDoc.close();
            
            // Scale SVG to fit entire contents within the preview
            const svg = iframeDoc.querySelector('svg');
            if (svg) {
                // Get the original viewBox
                let viewBox = svg.getAttribute('viewBox');
                if (!viewBox) {
                    // If no viewBox, create one based on width/height attributes or default values
                    const width = svg.getAttribute('width') || 800;
                    const height = svg.getAttribute('height') || 600;
                    viewBox = `0 0 ${width} ${height}`;
                    svg.setAttribute('viewBox', viewBox);
                }
                
                // Set dimensions to 100% of container
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.width = '100%';
                svg.style.height = '100%';
                
                // Use 'contain' to ensure the entire SVG fits within the container
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }
            
            // Show tooltip
            this.previewTooltip.classList.add('visible');
        } catch (error) {
            console.error(`Error loading preview for slide ${index}:`, error);
        }
    }
    
    /**
     * Hide the preview tooltip
     */
    hidePreviewTooltip() {
        this.previewTooltip.classList.remove('visible');
    }
    
    /**
     * Update the total number of slides
     * @param {number} totalSlides - The new total number of slides
     */
    updateTotalSlides(totalSlides) {
        if (this.totalSlides !== totalSlides) {
            this.totalSlides = totalSlides;
            this.createThumbnails();
        }
    }
}
