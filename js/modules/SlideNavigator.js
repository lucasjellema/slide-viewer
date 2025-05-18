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
            
            // Load SVG content
            let svgContent;
            
            try {
                // First attempt to get from zip loader if available
                if (this.slideViewer.zipLoader && this.slideViewer.zipLoader.getSlide(index)) {
                    svgContent = this.slideViewer.zipLoader.getSlide(index);
                } else {
                    // Otherwise load from the file system with cache busting
                    const response = await fetch(`slides/Slide${index}.SVG?nocache=${Date.now()}`);
                    if (!response.ok) {
                        throw new Error(`Failed to load slide ${index}`);
                    }
                    svgContent = await response.text();
                }
                
                // Create a canvas element for rendering the SVG
                const canvas = document.createElement('canvas');
                canvas.width = 150;  // Fixed width for thumbnail
                canvas.height = 100;  // Fixed height for thumbnail
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.objectFit = 'contain';
                canvas.style.backgroundColor = '#ffffff';
                
                // Clear the container and add the canvas
                container.innerHTML = '';
                container.appendChild(canvas);
                
                // Add a slide number label
                const slideNumber = document.createElement('div');
                slideNumber.className = 'slide-number';
                slideNumber.textContent = index;
                container.appendChild(slideNumber);
                
                // Render the SVG to the canvas
                await this.renderSVGToCanvas(svgContent, canvas, index);
                
            } catch (error) {
                console.error(`Error loading/rendering slide ${index}:`, error);
                // Create a fallback thumbnail with slide number
                const fallbackDiv = document.createElement('div');
                fallbackDiv.style.width = '100%';
                fallbackDiv.style.height = '100%';
                fallbackDiv.style.display = 'flex';
                fallbackDiv.style.alignItems = 'center';
                fallbackDiv.style.justifyContent = 'center';
                fallbackDiv.style.backgroundColor = '#f0f0f0';
                fallbackDiv.style.fontSize = '16px';
                fallbackDiv.style.color = '#666';
                fallbackDiv.textContent = `Slide ${index}`;
                
                container.innerHTML = '';
                container.appendChild(fallbackDiv);
            }
        } catch (error) {
            console.error(`Error in loadThumbnailPreview for slide ${index}:`, error);
            container.innerHTML = `<div style="text-align:center;">Slide ${index}</div>`;
        }
    }
    
    /**
     * Renders an SVG to a canvas element
     * @param {string} svgContent - SVG content as string
     * @param {HTMLCanvasElement} canvas - Canvas to render to
     * @param {number} index - Slide index for debugging
     * @returns {Promise} - Resolves when rendering is complete
     */
    renderSVGToCanvas(svgContent, canvas, index) {
        return new Promise((resolve, reject) => {
            try {
                // Get the 2D context for the canvas
                const ctx = canvas.getContext('2d');
                
                // Extract viewBox from SVG for proper scaling
                const viewBoxMatch = svgContent.match(/viewBox=["']([^"']*)["']/);
                let viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 1600 900";
                const viewBoxValues = viewBox.split(/[\s,]+/).map(parseFloat);
                
                // Get the original width and height from viewBox
                const originalWidth = viewBoxValues[2];
                const originalHeight = viewBoxValues[3];
                
                // Calculate aspect ratio for proper scaling
                const aspectRatio = originalWidth / originalHeight;
                
                // Clear background to white
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Create a new SVG image
                const img = new Image();
                
                // Clean the SVG content to avoid conflicts
                const cleanedSvgContent = this.cleanSVGForThumbnail(svgContent, index);
                
                // When the image loads, draw it on the canvas with proper scaling
                img.onload = () => {
                    try {
                        // Calculate dimensions to maintain aspect ratio
                        let drawWidth, drawHeight;
                        
                        if (aspectRatio > canvas.width / canvas.height) {
                            // Wider than tall
                            drawWidth = canvas.width;
                            drawHeight = drawWidth / aspectRatio;
                        } else {
                            // Taller than wide
                            drawHeight = canvas.height;
                            drawWidth = drawHeight * aspectRatio;
                        }
                        
                        // Center the image on the canvas
                        const x = (canvas.width - drawWidth) / 2;
                        const y = (canvas.height - drawHeight) / 2;
                        
                        // Draw the image on the canvas
                        ctx.drawImage(img, x, y, drawWidth, drawHeight);
                        
                        // Resolve the promise
                        resolve();
                    } catch (error) {
                        console.error(`Error drawing SVG to canvas for slide ${index}:`, error);
                        reject(error);
                    }
                };
                
                // Handle errors
                img.onerror = (error) => {
                    console.error(`Error loading SVG image for slide ${index}:`, error);
                    reject(error);
                };
                
                // Set the source to a data URL of the cleaned SVG
                img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanedSvgContent)}`;
                
            } catch (error) {
                console.error(`Error in renderSVGToCanvas for slide ${index}:`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Cleans SVG content for use in thumbnails
     * @param {string} svgContent - Original SVG content
     * @param {number} index - Slide index for making unique IDs
     * @returns {string} - Cleaned SVG content
     */
    cleanSVGForThumbnail(svgContent, index) {
        if (!svgContent) return '';
        
        try {
            // Add a unique namespace to all IDs to avoid conflicts between thumbnails
            // This will prefix all IDs with 'thumb-{index}-'
            let cleaned = svgContent.replace(/\sid="([^"]*)"/g, ` id="thumb-${index}-$1"`);
            
            // Also update any references to IDs (like url(#id))
            cleaned = cleaned.replace(/url\(#([^)]+)\)/g, `url(#thumb-${index}-$1)`);
            
            // Remove scripts for security
            cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            
            // Remove animations for better performance
            cleaned = cleaned.replace(/<animate\b[^<]*(?:(?!<\/animate>)<[^<]*)*<\/animate>/gi, '');
            cleaned = cleaned.replace(/<animateTransform\b[^<]*(?:(?!<\/animateTransform>)<[^<]*)*<\/animateTransform>/gi, '');
            cleaned = cleaned.replace(/<animateMotion\b[^<]*(?:(?!<\/animateMotion>)<[^<]*)*<\/animateMotion>/gi, '');
            cleaned = cleaned.replace(/<set\b[^<]*(?:(?!<\/set>)<[^<]*)*<\/set>/gi, '');
            
            // Ensure SVG has proper attributes for rendering
            if (!cleaned.includes('xmlns=')) {
                cleaned = cleaned.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            
            return cleaned;
        } catch (error) {
            console.error(`Error cleaning SVG for slide ${index}:`, error);
            return svgContent; // Return original if cleaning fails
        }
    }
    
    /**
     * Helper method to strip scripts and other unwanted elements from SVG content
     * @param {string} svgContent - Raw SVG content as string
     * @returns {string} - Cleaned SVG content
     */
    stripSVGScripts(svgContent) {
        if (!svgContent) return '';
        
        // Remove the outer <svg> tags since we're going to nest this inside our own <svg>
        let content = svgContent.replace(/<svg[^>]*>|<\/svg>/gi, '');
        
        // Remove scripts
        content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove animations
        content = content.replace(/<animate\b[^<]*(?:(?!<\/animate>)<[^<]*)*<\/animate>/gi, '');
        content = content.replace(/<animateTransform\b[^<]*(?:(?!<\/animateTransform>)<[^<]*)*<\/animateTransform>/gi, '');
        content = content.replace(/<animateMotion\b[^<]*(?:(?!<\/animateMotion>)<[^<]*)*<\/animateMotion>/gi, '');
        content = content.replace(/<set\b[^<]*(?:(?!<\/set>)<[^<]*)*<\/set>/gi, '');
        
        return content;
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
