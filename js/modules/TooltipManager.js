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
     * Add a visual indicator (red circle) to an annotated element using HTML instead of SVG
     * @param {Element} element - The element to add the indicator to
     */
    addVisualIndicator(element) {
        if (!element) return;
        
        console.log('Adding HTML indicator for element:', element.id || element.tagName);
        
        try {
            // Get the SVG element's container
            const slideDisplay = document.getElementById('slide-display');
            if (!slideDisplay) {
                console.warn('Could not find slide display');
                return;
            }
            
            // Get element position within the SVG
            const svgElement = element.closest('svg');
            if (!svgElement) {
                console.warn('Could not find parent SVG element');
                return;
            }
            
            // Create an HTML indicator element
            const indicator = document.createElement('div');
            indicator.className = 'html-annotation-indicator';
            indicator.setAttribute('data-target-id', element.id);
            indicator.innerHTML = '<span class="tooltip-hint">Click for annotation</span>';
            
            // Add indicator to slide display
            slideDisplay.appendChild(indicator);
            
            // Position the indicator over the SVG element
            this.positionIndicator(indicator, element, svgElement);
            
            // Add event listener for clicks
            indicator.addEventListener('click', (event) => {
                // Prevent the event from bubbling
                event.stopPropagation();
                
                console.log('HTML indicator clicked for:', element.id);
                
                // Display the annotation content
                const content = this.annotationMap.get(element.id);
                if (!content) {
                    console.warn('No annotation content found for:', element.id);
                    return;
                }
                
                // Set tooltip content
                this.tooltipContent.innerHTML = content;
                
                // Position tooltip next to the indicator
                const rect = indicator.getBoundingClientRect();
                const tooltipRect = this.tooltip.getBoundingClientRect();
                
                // Position above by default
                let top = rect.top - tooltipRect.height - 10;
                // If not enough space above, position below
                if (top < 10) {
                    top = rect.bottom + 10;
                }
                
                // Center horizontally on the indicator
                const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                
                // Ensure the tooltip doesn't go off-screen
                const rightEdge = left + tooltipRect.width;
                const viewportWidth = window.innerWidth;
                
                if (left < 10) {
                    this.tooltip.style.left = '10px';
                } else if (rightEdge > viewportWidth - 10) {
                    this.tooltip.style.left = (viewportWidth - tooltipRect.width - 10) + 'px';
                } else {
                    this.tooltip.style.left = left + 'px';
                }
                
                this.tooltip.style.top = top + 'px';
                
                // Show the tooltip
                this.tooltip.classList.add('visible');
                
                // Highlight the annotated element
                element.classList.add('annotation-highlight');
                
                // Store reference to current element
                this.currentElement = element;
                
                // Add a click listener to the document to dismiss the tooltip
                setTimeout(() => {
                    const dismissHandler = (e) => {
                        // Only dismiss if clicked outside the tooltip
                        if (!this.tooltip.contains(e.target) && e.target !== indicator) {
                            this.tooltip.classList.remove('visible');
                            element.classList.remove('annotation-highlight');
                            this.currentElement = null;
                            document.removeEventListener('click', dismissHandler);
                        }
                    };
                    
                    document.addEventListener('click', dismissHandler);
                }, 100);
            });
        } catch (error) {
            console.error('Error adding indicator:', error);
        }
    }
    
    /**
     * Position an HTML indicator over an SVG element
     * @param {HTMLElement} indicator - The indicator element
     * @param {SVGElement} targetElement - The SVG element to position over
     * @param {SVGElement} svgElement - The parent SVG element
     */
    positionIndicator(indicator, targetElement, svgElement) {
        try {
            // Get SVG position relative to the viewport
            const svgRect = svgElement.getBoundingClientRect();
            
            // Get element position in SVG coordinate space
            let bbox;
            try {
                bbox = targetElement.getBBox();
            } catch (e) {
                console.warn('Could not get element bounding box:', e);
                // Fallback to fixed position
                indicator.style.left = svgRect.left + 10 + 'px';
                indicator.style.top = svgRect.top + 10 + 'px';
                return;
            }
            
            // Convert SVG coordinates to screen coordinates
            let point = svgElement.createSVGPoint();
            point.x = bbox.x;
            point.y = bbox.y;
            
            // Transform point to screen coordinates
            let ctm = svgElement.getScreenCTM();
            if (!ctm) {
                console.warn('Could not get screen CTM');
                return;
            }
            
            let screenPoint = point.matrixTransform(ctm);
            
            // Position the indicator
            indicator.style.left = screenPoint.x + 'px';
            indicator.style.top = screenPoint.y + 'px';
            
            // Setup resize handler to reposition when window size changes
            const resizeHandler = () => {
                // Recalculate positions
                const updatedSvgRect = svgElement.getBoundingClientRect();
                const updatedCtm = svgElement.getScreenCTM();
                if (!updatedCtm) return;
                
                const updatedPoint = point.matrixTransform(updatedCtm);
                indicator.style.left = updatedPoint.x + 'px';
                indicator.style.top = updatedPoint.y + 'px';
            };
            
            // Add resize handler
            window.addEventListener('resize', resizeHandler);
            
            // Also reposition when slides change
            document.addEventListener('afterSlideLoad', resizeHandler);
        } catch (error) {
            console.error('Error positioning indicator:', error);
        }
    }
    
    /**
     * Add event listeners to an indicator
     * @param {SVGElement} indicator - The indicator element
     * @param {string} targetId - The ID of the target element
     */
    addIndicatorEventListeners(indicator, targetId) {
        if (!indicator || !targetId) return;
        
        console.log('Adding event listeners to indicator for element:', targetId);
        
        // Use click event for more reliable interaction on SVG elements
        indicator.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from propagating
            
            // Check if we're in edit mode - don't show tooltips in edit mode
            if (document.querySelector('#slide-display.edit-mode')) {
                return;
            }
            
            console.log('Indicator clicked for element:', targetId);
            
            // Get the target element
            const targetElement = document.getElementById(targetId);
            if (!targetElement) {
                console.warn('Target element not found:', targetId);
                return;
            }
            
            if (!this.annotationMap.has(targetId)) {
                console.warn('No annotation found for target:', targetId);
                return;
            }
            
            // Set current element
            this.currentElement = targetElement;
            
            // Set tooltip content
            this.tooltipContent.innerHTML = this.annotationMap.get(targetId);
            
            // Position tooltip relative to the indicator
            this.positionTooltipForIndicator(event, indicator);
            
            // Show tooltip
            this.tooltip.classList.add('visible');
            
            // Add highlight to the target element
            targetElement.classList.add('annotation-highlight');
        });
        
        // Also add mouseenter event as backup
        indicator.addEventListener('mouseenter', (event) => {
            // Only show tooltip preview on hover - full content on click
            if (document.querySelector('#slide-display.edit-mode')) return;
            
            const targetElement = document.getElementById(targetId);
            if (!targetElement || !this.annotationMap.has(targetId)) return;

            // Show a brief "Click to view annotation" message
            indicator.classList.add('hovered');
        });
        
        // Handle mouse leave
        indicator.addEventListener('mouseleave', () => {
            indicator.classList.remove('hovered');
        });
    }
    
    /**
     * Position the tooltip specifically for indicator elements
     * @param {MouseEvent} event - The mouse event
     * @param {SVGElement} indicator - The indicator element
     */
    positionTooltipForIndicator(event, indicator) {
        if (!this.tooltip) return;
        
        // Get the size of the tooltip
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        // Get the position of the indicator in the viewport
        const svgElement = indicator.closest('svg');
        if (!svgElement) return this.positionTooltip(event); // Fallback
        
        // Get SVG position and scaling
        const svgRect = svgElement.getBoundingClientRect();
        
        // Get indicator position in SVG coordinate space
        let cx = parseInt(indicator.getAttribute('cx')) || 0;
        let cy = parseInt(indicator.getAttribute('cy')) || 0;
        
        // Convert to viewport coordinates
        const svgPoint = svgElement.createSVGPoint();
        svgPoint.x = cx;
        svgPoint.y = cy;
        
        // Get the transformation matrix
        const ctm = svgElement.getScreenCTM();
        if (!ctm) return this.positionTooltip(event); // Fallback
        
        // Transform point to screen coordinates
        const screenPoint = svgPoint.matrixTransform(ctm);
        
        // Calculate tooltip position
        // Position tooltip above the indicator
        let left = screenPoint.x - (tooltipRect.width / 2);
        let top = screenPoint.y - tooltipRect.height - 15; // 15px above the indicator
        
        // Adjust if it would go off-screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top < 10) {
            // If there's not enough space above, position below
            top = screenPoint.y + 15; // 15px below the indicator
        }
        
        // Set the tooltip position
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
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
