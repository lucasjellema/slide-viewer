/**
 * ElementDetector module
 * Handles detecting SVG elements at specific coordinates
 */
export class ElementDetector {
    /**
     * Constructor for ElementDetector
     * @param {Object} slideViewer - The SlideViewer instance
     */
    constructor(slideViewer) {
        this.slideViewer = slideViewer;
    }
    
    /**
     * Find all SVG elements at a specific point
     * @param {number} clientX - Client X coordinate
     * @param {number} clientY - Client Y coordinate
     * @returns {Array} - Array of SVG elements at the point
     */
    findElementsAtPoint(clientX, clientY) {
        const svgElement = this.slideViewer.getCurrentSvgElement();
        if (!svgElement) {
            console.error('No SVG element found');
            return [];
        }
        
        const elements = [];
        
        // Get coordinates relative to the slide display
        const displayRect = this.slideViewer.slideDisplay.getBoundingClientRect();
        const x = clientX - displayRect.left;
        const y = clientY - displayRect.top;
        
        console.log(`Finding elements at coordinates: x=${x}, y=${y}`);
        
        // Convert coordinates to be relative to the SVG viewBox if needed
        const svgRect = svgElement.getBoundingClientRect();
        let viewBoxX = x;
        let viewBoxY = y;
        
        // If SVG has a viewBox, convert coordinates
        if (svgElement.viewBox && svgElement.viewBox.baseVal) {
            viewBoxX = x * (svgElement.viewBox.baseVal.width / svgRect.width);
            viewBoxY = y * (svgElement.viewBox.baseVal.height / svgRect.height);
            console.log(`Converted to viewBox coordinates: x=${viewBoxX}, y=${viewBoxY}`);
        }
        
        // First try using the browser's elementFromPoint
        const clickedElement = document.elementFromPoint(clientX, clientY);
        if (this.isVisibleSvgElement(clickedElement) && !this.isRemoved(clickedElement)) {
            console.log('Direct hit on element:', clickedElement.tagName);
            elements.push(clickedElement);
        }
        
        // Then check all elements using bounding box
        const allElements = svgElement.querySelectorAll('*');
        console.log(`Checking ${allElements.length} SVG elements`);
        
        allElements.forEach(element => {
            // Skip elements that are already removed or already in the list
            if (this.isRemoved(element) || elements.includes(element)) return;
            
            // Skip non-visible elements like defs, metadata, etc.
            if (!this.isVisibleSvgElement(element)) return;
            
            // Check if element contains the point
            if (this.isPointInElement(element, viewBoxX, viewBoxY, svgElement)) {
                elements.push(element);
                console.log('Found element via bounding box:', element.tagName, element.id || '');
            }
        });
        
        return elements;
    }
    
    /**
     * Check if an element is an SVG element
     * @param {Element} element - The element to check
     * @returns {boolean} - True if the element is an SVG element
     */
    isSvgElement(element) {
        return element && element.tagName && 
               element !== this.slideViewer.slideDisplay &&
               element.namespaceURI === 'http://www.w3.org/2000/svg';
    }
    
    /**
     * Check if an element is a visible SVG element (not defs, metadata, etc.)
     * @param {Element} element - The element to check
     * @returns {boolean} - True if the element is a visible SVG element
     */
    isVisibleSvgElement(element) {
        // First check if it's an SVG element at all
        if (!this.isSvgElement(element)) return false;
        
        // List of non-visible SVG elements
        const nonVisibleElements = [
            'defs',
            'metadata',
            'desc',
            'title',
            'pattern',
            'linearGradient',
            'radialGradient',
            'script',
            'style',
            'symbol',
            'clipPath',
            'mask'
        ];
        
        // Check if the element's tag name is in the non-visible list
        if (nonVisibleElements.includes(element.tagName.toLowerCase())) {
            return false;
        }
        
        // Check if the element has zero dimensions
        try {
            const bbox = element.getBBox();
            if (bbox && (bbox.width === 0 || bbox.height === 0)) {
                return false;
            }
        } catch (e) {
            // If getBBox fails, we'll assume it's visible
        }
        
        // Check if the element has display:none or visibility:hidden
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if an element is removed
     * @param {Element} element - The element to check
     * @returns {boolean} - True if the element is removed
     */
    isRemoved(element) {
        return element && element.classList && element.classList.contains('removed');
    }
    
    /**
     * Check if a point is inside an SVG element
     * @param {SVGElement} element - The SVG element
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {SVGElement} svgRoot - The root SVG element
     * @returns {boolean} - True if the point is inside the element
     */
    isPointInElement(element, x, y, svgRoot) {
        if (!element || !svgRoot) return false;
        
        try {
            // Try using getBBox for simple shapes
            const bbox = element.getBBox();
            if (bbox) {
                // Try to get element's transform
                try {
                    const ctm = element.getCTM();
                    if (ctm) {
                        // Transform point to element's coordinate system
                        const pt = svgRoot.createSVGPoint();
                        pt.x = x;
                        pt.y = y;
                        const transformedPt = pt.matrixTransform(ctm.inverse());
                        
                        // Check if point is in bounding box
                        return (transformedPt.x >= bbox.x && 
                                transformedPt.x <= bbox.x + bbox.width && 
                                transformedPt.y >= bbox.y && 
                                transformedPt.y <= bbox.y + bbox.height);
                    }
                } catch (e) {
                    console.log('Transform error:', e);
                }
                
                // Fallback to simple bounding box check
                return (x >= bbox.x && 
                        x <= bbox.x + bbox.width && 
                        y >= bbox.y && 
                        y <= bbox.y + bbox.height);
            }
        } catch (e) {
            // Some elements might not support getBBox
            console.log('getBBox error:', e);
        }
        
        // Fallback to isPointInFill/isPointInStroke if available
        try {
            if (element.isPointInFill || element.isPointInStroke) {
                const pt = svgRoot.createSVGPoint();
                pt.x = x;
                pt.y = y;
                
                if (element.isPointInFill && element.isPointInFill(pt)) {
                    return true;
                }
                
                if (element.isPointInStroke && element.isPointInStroke(pt)) {
                    return true;
                }
            }
        } catch (e) {
            console.log('isPointIn error:', e);
        }
        
        return false;
    }
}
