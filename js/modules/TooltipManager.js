/**
 * TooltipManager module
 * Handles displaying tooltips for annotated elements
 */
export class TooltipManager {
    /**
     * Constructor for TooltipManager
     * @param {Object} slideViewer - Optional reference to the SlideViewer instance
     */
    constructor(slideViewer = null) {
        this.tooltip = null;
        this.tooltipContent = null;
        this.tooltipArrow = null;
        this.currentElement = null;
        this.slideViewer = slideViewer; // Store reference to the slide viewer
        this.annotationMap = new Map(); // Maps element IDs to annotation content
        
        // Create tooltip element
        this.createTooltip();
    }
    
    /**
     * Create the tooltip element
     */
    createTooltip() {
        // Create tooltip container
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'annotation-tooltip';
        
        // Create tooltip arrow
        this.tooltipArrow = document.createElement('div');
        this.tooltipArrow.className = 'annotation-tooltip-arrow';
        this.tooltip.appendChild(this.tooltipArrow);
        
        // Create tooltip content
        this.tooltipContent = document.createElement('div');
        this.tooltipContent.className = 'annotation-tooltip-content';
        this.tooltip.appendChild(this.tooltipContent);
        
        // Add mouse events to the tooltip itself to prevent it from hiding
        this.tooltip.addEventListener('mouseenter', () => {
            // Keep the tooltip visible when mouse enters it
            this.tooltip.classList.add('visible');
            
            // Keep the highlight on the element
            if (this.currentElement) {
                this.currentElement.classList.add('annotation-highlight');
            }
        });
        
        // Add mouseleave event to hide the tooltip when the mouse leaves it
        this.tooltip.addEventListener('mouseleave', () => {
            // Hide the tooltip when mouse leaves it
            this.tooltip.classList.remove('visible');
            
            // Remove highlight from the current element
            if (this.currentElement) {
                this.currentElement.classList.remove('annotation-highlight');
                this.currentElement = null;
            }
        });
        
        // Add to document
        document.body.appendChild(this.tooltip);
    }
    
    /**
     * Register an element with an annotation
     * @param {Element} element - The element to register
     * @param {string} content - The HTML content for the annotation
     * @param {Object} annotationData - Optional full annotation data with position info
     */
    registerAnnotatedElement(element, content, annotationData = null) {
        if (!element) return;
        
        // Add to annotation map
        if (element.id) {
            this.annotationMap.set(element.id, content);
        } else {
            // Generate an ID if the element doesn't have one
            const id = `annotated-element-${Math.random().toString(36).substr(2, 9)}`;
            element.id = id;
            this.annotationMap.set(id, content);
        }
        
        // Add annotated class
        element.classList.add('annotated-element');
        
        // Add the annotation indicator (small red circle) if the function exists
        try {
            if (typeof this.addAnnotationIndicator === 'function') {
                // Pass the annotation data to use its position information
                this.addAnnotationIndicator(element, annotationData);
            } else {
                console.log('Adding visual indicator for annotated element:', element.tagName, element.id);
                this.addVisualIndicator(element);
            }
        } catch (e) {
            console.warn('Could not add annotation indicator:', e);
        }
        
        // Add event listeners
        element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
    
    /**
     * Add a simple visual indicator to an annotated element (fallback method)
     * @param {Element} element - The element to add the indicator to
     */
    addVisualIndicator(element) {
        if (!element) return;
        
        // Just add a class that will be styled via CSS
        element.classList.add('has-annotation');
    }
    
    /**
     * Unregister an annotated element
     * @param {Element} element - The element to unregister
     */
    unregisterAnnotatedElement(element) {
        if (!element || !element.id) return;
        
        // Remove from annotation map
        this.annotationMap.delete(element.id);
        
        // Remove annotated class
        element.classList.remove('annotated-element');
        
        // Remove event listeners
        element.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
        element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    }
    
    /**
     * Handle mouse enter event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseEnter(event) {
        const element = event.currentTarget;
        if (!element || !element.id || !this.annotationMap.has(element.id)) return;
        
        // Check if we're in edit mode - don't show tooltips in edit mode
        if (document.querySelector('#slide-display.edit-mode')) {
            return;
        }
        
        console.log('Mouse entered annotated element:', element.id);
        
        // Set current element
        this.currentElement = element;
        
        // Set tooltip content
        this.tooltipContent.innerHTML = this.annotationMap.get(element.id);
        
        // Position tooltip
        this.positionTooltip(event);
        
        // Show tooltip
        this.tooltip.classList.add('visible');
        
        // Add highlight to the element
        element.classList.add('annotation-highlight');
    }
    
    /**
     * Handle mouse leave event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseLeave(event) {
        const element = event.currentTarget;
        
        // Check if the mouse is moving to the tooltip
        // We need to use setTimeout to allow the mouseenter event on the tooltip to fire first
        setTimeout(() => {
            // If the tooltip contains the active element or has the mouse over it, don't hide
            const isTooltipHovered = this.tooltip.matches(':hover');
            
            if (!isTooltipHovered) {
                // Hide tooltip only if not hovering over it
                this.tooltip.classList.remove('visible');
                
                // Remove highlight from the element
                if (element) {
                    element.classList.remove('annotation-highlight');
                }
                
                this.currentElement = null;
            }
        }, 50); // Short delay to allow other events to process
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseMove(event) {
        // No longer repositioning the tooltip on mouse move
        // The tooltip will stay at its initial position
    }
    
    /**
     * Position the tooltip relative to the mouse cursor
     * @param {MouseEvent} event - The mouse event
     */
    positionTooltip(event) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get cursor position
        const cursorX = event.clientX;
        const cursorY = event.clientY;
        
        // Position tooltip above the cursor by default
        let top = cursorY - tooltipRect.height - 15; // Position above the cursor
        let left = cursorX + 5;  // Position slightly to the right of the cursor
        let arrowClass = 'bottom-left'; // Arrow pointing to the bottom-left (toward cursor)
        
        // Check if tooltip would go off the top of the viewport
        if (top < 10) {
            // Position below cursor if not enough space at the top
            top = cursorY + 15;
            arrowClass = 'top-left';
        }
        
        // Check if tooltip would go off the right of the viewport
        if (left + tooltipRect.width > viewportWidth - 10) {
            // Position to the left of cursor
            left = cursorX - tooltipRect.width - 5;
            
            // Update arrow class based on vertical position
            if (arrowClass === 'top-left') {
                arrowClass = 'top-right';
            } else {
                arrowClass = 'bottom-right';
            }
            
            // If still off-screen, pin to the right edge with a margin
            if (left < 10) {
                left = 10;
            }
        }
        
        // Update tooltip position
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        
        // Update arrow class - first remove all possible arrow classes
        this.tooltipArrow.className = 'annotation-tooltip-arrow';
        
        // Add the specific arrow class based on position
        this.tooltipArrow.classList.add(arrowClass);
    }
    
    /**
     * Clear all annotated elements
     */
    clearAnnotatedElements() {
        // Remove annotated class from all elements
        document.querySelectorAll('.annotated-element').forEach(element => {
            element.classList.remove('annotated-element');
        });
        
        // Clear annotation map
        this.annotationMap.clear();
    }
    
    /**
     * Update the annotation for an element
     * @param {Element} element - The element to update
     * @param {string} content - The new HTML content
     */
    updateAnnotation(element, content) {
        if (!element || !element.id) return;
        
        // Update annotation map
        this.annotationMap.set(element.id, content);
        
        // Update tooltip content if this is the current element
        if (this.currentElement === element) {
            this.tooltipContent.innerHTML = content;
        }
    }
    
    /**
     * Add a small red circle indicator to an annotated element
     * @param {Element} element - The element to add the indicator to
     * @param {Object} annotationData - Optional annotation data with position info
     */
    addAnnotationIndicator(element, annotationData = null) {
        if (!element) return;
        
        // Check if the indicator already exists
        const existingIndicator = element.querySelector('.annotation-indicator');
        if (existingIndicator) return;
        
        // Get element's bounding box
        const rect = element.getBoundingClientRect();
        
        // Create the indicator element
        const indicator = document.createElement('div');
        indicator.className = 'annotation-indicator';
        
        // Add the indicator to the element or its parent SVG
        if (element.tagName === 'svg') {
            // If the element is an SVG, append the indicator directly to it
            element.appendChild(indicator);
            
            // Add click handler to open the editor
            this.addIndicatorClickHandler(indicator, element);
        } else {
            // For SVG child elements, we need to handle differently
            const svgElement = element.ownerSVGElement || element.closest('svg');
            if (svgElement) {
                // Create an SVG namespace
                const svgns = "http://www.w3.org/2000/svg";
                
                // Create a group element to contain the indicator
                // This allows us to position it relative to the target element
                const group = document.createElementNS(svgns, "g");
                group.setAttribute("class", "annotation-indicator-group");
                
                // Create an SVG circle element for the indicator
                const svgIndicator = document.createElementNS(svgns, "circle");
                svgIndicator.setAttribute("class", "annotation-indicator-svg");
                svgIndicator.setAttribute("r", "5");
                svgIndicator.setAttribute("cx", "0");
                svgIndicator.setAttribute("cy", "0");
                
                // Add the circle to the group
                group.appendChild(svgIndicator);
                
                // Get the element's bounding box in SVG coordinates
                let bbox;
                try {
                    // Try to get the bounding box directly
                    bbox = element.getBBox();
                } catch (e) {
                    // Fallback for elements that don't support getBBox
                    console.warn('Element does not support getBBox, using client rect instead');
                    const elementRect = element.getBoundingClientRect();
                    const svgRect = svgElement.getBoundingClientRect();
                    
                    // Create a simulated bbox
                    bbox = {
                        x: elementRect.left - svgRect.left,
                        y: elementRect.top - svgRect.top,
                        width: elementRect.width,
                        height: elementRect.height
                    };
                }
                
                // Position the group at the left edge, but vertically centered
                const transformX = bbox.x;
                const transformY = bbox.y + (bbox.height / 2);
                
                // Set the transform attribute to position the group
                group.setAttribute("transform", `translate(${transformX}, ${transformY})`);
                
                // Add to the SVG
                svgElement.appendChild(group);
                
                // Store reference to the element it belongs to
                group.dataset.forElement = element.id;
                
                // Add click handler to open the editor
                this.addIndicatorClickHandler(group, element);
            }
        }
    }
    
    /**
     * Add click handler to indicator to open the editor
     * @param {Element} indicator - The indicator element
     * @param {Element} targetElement - The target element with the annotation
     */
    addIndicatorClickHandler(indicator, targetElement) {
        if (!indicator || !targetElement || !targetElement.id) return;
        
        // Make the indicator clickable
        indicator.style.pointerEvents = 'auto';
        indicator.style.cursor = 'pointer';
        
        // Add click event listener
        indicator.addEventListener('click', (e) => {
            // Only handle in edit mode
            if (!document.querySelector('.edit-mode')) return;
            
            e.stopPropagation(); // Prevent event bubbling
            
            // Get the annotation content
            const content = this.annotationMap.get(targetElement.id);
            if (!content) return;
            
            // Dispatch a custom event to open the editor
            const event = new CustomEvent('openAnnotationEditor', {
                detail: {
                    element: targetElement,
                    content: content
                },
                bubbles: true
            });
            
            indicator.dispatchEvent(event);
        });
    }
}
