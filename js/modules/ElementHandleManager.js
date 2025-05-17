/**
 * ElementHandleManager module
 * Handles displaying visual handles for SVG elements
 */
export class ElementHandleManager {
    /**
     * Constructor for ElementHandleManager
     * @param {Object} slideViewer - The SlideViewer instance
     */
    constructor(slideViewer) {
        this.slideViewer = slideViewer;
        this.handleGroup = null;
        this.currentHandles = [];
        
        // Create handle container
        this.createHandleContainer();
    }
    
    /**
     * Create the container for element handles
     */
    createHandleContainer() {
        // Remove any existing handle group
        const existingGroup = document.querySelector('.element-handle-group');
        if (existingGroup) {
            existingGroup.remove();
        }
        
        // Create a new handle group
        this.handleGroup = document.createElement('div');
        this.handleGroup.className = 'element-handle-group';
        this.handleGroup.style.position = 'absolute';
        this.handleGroup.style.top = '0';
        this.handleGroup.style.left = '0';
        this.handleGroup.style.width = '100%';
        this.handleGroup.style.height = '100%';
        this.handleGroup.style.pointerEvents = 'none';
        this.handleGroup.style.zIndex = '1000';
        
        // Make sure the slide display has position relative
        if (window.getComputedStyle(this.slideViewer.slideDisplay).position === 'static') {
            this.slideViewer.slideDisplay.style.position = 'relative';
        }
        
        this.slideViewer.slideDisplay.appendChild(this.handleGroup);
        console.log('Handle container created and added to slide display');
    }
    
    /**
     * Show handles for a list of elements
     * @param {Array} elements - Array of SVG elements
     * @param {boolean} clearExisting - Whether to clear existing handles
     */
    showHandlesForElements(elements, clearExisting = true) {
        console.log(`Showing handles for ${elements.length} elements`);
        
        // Filter out invalid elements
        const validElements = elements.filter(el => el && el.nodeType === 1);
        if (validElements.length === 0) {
            console.warn('No valid elements to show handles for');
            return;
        }
        
        console.log(`Valid elements: ${validElements.length}`);
        
        // Clear existing handles if requested
        if (clearExisting) {
            this.clearHandles();
        }
        
        // Create the handle container if it doesn't exist
        if (!this.handleGroup) {
            this.createHandleContainer();
        }
        
        // Create handles for each element with different colors
        const colors = ['#4285f4', '#ea4335', '#fbbc05', '#34a853', '#8a2be2', '#ff6347'];
        
        validElements.forEach((element, index) => {
            const color = colors[index % colors.length];
            this.createHandleForElement(element, color, index + 1);
        });
        
        // Add debug information to the page
        this.addDebugInfo(validElements);
    }
    
    /**
     * Create a handle for a specific element
     * @param {Element} element - The element
     * @param {string} color - The color for the handle
     * @param {number} index - The index for labeling
     */
    createHandleForElement(element, color, index) {
        try {
            // Get element's bounding box
            const bbox = this.getElementBoundingBox(element);
            if (!bbox) {
                console.warn(`Couldn't get bounding box for element ${index}:`, element);
                return null;
            }
            
            // Create handle container
            const handle = document.createElement('div');
            handle.className = 'element-handle';
            handle.style.position = 'absolute';
            handle.style.left = `${bbox.x}px`;
            handle.style.top = `${bbox.y}px`;
            handle.style.width = `${bbox.width}px`;
            handle.style.height = `${bbox.height}px`;
            handle.style.pointerEvents = 'none';
            handle.style.zIndex = '1000';
            
            // Create border directly with CSS instead of SVG
            handle.style.border = `2px dashed ${color}`;
            handle.style.boxSizing = 'border-box';
            
            // Create label
            const label = document.createElement('div');
            label.className = 'element-handle-label';
            label.style.position = 'absolute';
            label.style.top = '-20px';
            label.style.left = '0';
            label.style.backgroundColor = color;
            label.style.color = 'white';
            label.style.padding = '2px 5px';
            label.style.borderRadius = '2px';
            label.style.fontSize = '10px';
            label.style.whiteSpace = 'nowrap';
            label.style.pointerEvents = 'none';
            label.textContent = `#${index}: ${element.tagName}${element.id ? ` (${element.id})` : ''}`;
            handle.appendChild(label);
            
            // Add handle to group
            this.handleGroup.appendChild(handle);
            this.currentHandles.push(handle);
            
            // Highlight the actual element as well
            this.highlightElement(element, color);
            
            console.log(`Created handle for element ${index} at x:${bbox.x}, y:${bbox.y}, w:${bbox.width}, h:${bbox.height}`);
            return handle;
        } catch (e) {
            console.error('Error creating handle:', e);
            return null;
        }
    }
    
    /**
     * Get the bounding box for an element relative to the slide display
     * @param {Element} element - The element
     * @returns {Object|null} - The bounding box or null if not available
     */
    getElementBoundingBox(element) {
        try {
            // Check if the element is valid and has getBoundingClientRect
            if (!element || typeof element.getBoundingClientRect !== 'function') {
                console.warn('Invalid element or missing getBoundingClientRect:', element);
                return null;
            }
            
            // Get element's bounding client rect
            const elementRect = element.getBoundingClientRect();
            const displayRect = this.slideViewer.slideDisplay.getBoundingClientRect();
            
            // Calculate position relative to slide display
            return {
                x: elementRect.left - displayRect.left,
                y: elementRect.top - displayRect.top,
                width: elementRect.width,
                height: elementRect.height
            };
        } catch (e) {
            console.error('Error getting bounding box:', e);
            return null;
        }
    }
    
    /**
     * Highlight an SVG element
     * @param {Element} element - The element
     * @param {string} color - The color for highlighting
     */
    highlightElement(element, color) {
        try {
            // Check if this is an SVG element
            if (!element || !element.namespaceURI || element.namespaceURI !== 'http://www.w3.org/2000/svg') {
                // For non-SVG elements, use outline
                const originalOutline = element.style.outline;
                element.dataset.originalOutline = originalOutline;
                element.style.outline = `2px solid ${color}`;
                return;
            }
            
            // Store original attributes
            element.dataset.originalStroke = element.getAttribute('stroke') || 'none';
            element.dataset.originalStrokeWidth = element.getAttribute('stroke-width') || '1';
            element.dataset.originalFill = element.getAttribute('fill') || 'none';
            
            // Apply highlight
            element.setAttribute('stroke', color);
            element.setAttribute('stroke-width', '2');
            
            // For filled elements, add some transparency to the fill
            if (element.getAttribute('fill') && element.getAttribute('fill') !== 'none') {
                element.setAttribute('fill-opacity', '0.7');
            }
        } catch (e) {
            console.error('Error highlighting element:', e);
        }
    }
    
    /**
     * Restore original element styles
     * @param {Element} element - The element
     */
    restoreElementStyle(element) {
        if (!element) return;
        
        // For non-SVG elements
        if (element.dataset.originalOutline !== undefined) {
            element.style.outline = element.dataset.originalOutline;
            return;
        }
        
        // For SVG elements
        if (element.dataset.originalStroke) {
            element.setAttribute('stroke', element.dataset.originalStroke);
        }
        
        if (element.dataset.originalStrokeWidth) {
            element.setAttribute('stroke-width', element.dataset.originalStrokeWidth);
        }
        
        if (element.dataset.originalFill) {
            element.setAttribute('fill', element.dataset.originalFill);
        }
        
        element.removeAttribute('fill-opacity');
    }
    
    /**
     * Add debug information to the page
     * @param {Array} elements - The elements being shown
     */
    addDebugInfo(elements) {
        // Remove any existing debug info
        const existingDebug = document.getElementById('handle-debug-info');
        if (existingDebug) {
            existingDebug.remove();
        }
        
        // Create debug container
        const debugContainer = document.createElement('div');
        debugContainer.id = 'handle-debug-info';
        debugContainer.style.position = 'fixed';
        debugContainer.style.bottom = '10px';
        debugContainer.style.right = '10px';
        debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugContainer.style.color = 'white';
        debugContainer.style.padding = '10px';
        debugContainer.style.borderRadius = '4px';
        debugContainer.style.fontSize = '12px';
        debugContainer.style.zIndex = '9999';
        debugContainer.style.maxWidth = '300px';
        debugContainer.style.maxHeight = '200px';
        debugContainer.style.overflow = 'auto';
        
        // Add info about the elements
        const title = document.createElement('h3');
        title.textContent = `Debug: ${elements.length} Elements Found`;
        title.style.margin = '0 0 5px 0';
        title.style.fontSize = '14px';
        debugContainer.appendChild(title);
        
        // Add info about each element
        const list = document.createElement('ul');
        list.style.margin = '0';
        list.style.padding = '0 0 0 15px';
        
        elements.forEach((element, index) => {
            const item = document.createElement('li');
            const bbox = this.getElementBoundingBox(element);
            item.textContent = `#${index+1}: ${element.tagName} ${element.id ? `(${element.id})` : ''} - ${bbox ? `x:${Math.round(bbox.x)}, y:${Math.round(bbox.y)}, w:${Math.round(bbox.width)}, h:${Math.round(bbox.height)}` : 'No bbox'}`;
            list.appendChild(item);
        });
        
        debugContainer.appendChild(list);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '10px';
        closeBtn.style.padding = '3px 8px';
        closeBtn.style.fontSize = '12px';
        closeBtn.addEventListener('click', () => {
            debugContainer.remove();
        });
        
        debugContainer.appendChild(closeBtn);
        document.body.appendChild(debugContainer);
    }
    
    /**
     * Clear all handles
     */
    clearHandles() {
        // Remove all handle elements
        if (this.handleGroup) {
            this.handleGroup.innerHTML = '';
        }
        
        // Reset current handles array
        this.currentHandles = [];
        
        // Restore original styles for all SVG elements
        const svgElement = this.slideViewer.getCurrentSvgElement();
        if (svgElement) {
            const allElements = svgElement.querySelectorAll('*');
            allElements.forEach(element => {
                if (element.dataset.originalStroke !== undefined) {
                    this.restoreElementStyle(element);
                }
            });
        }
    }
}
