/**
 * AnnotationManager module
 * Handles creating, saving, and loading annotations
 */
import { RichTextEditor } from './RichTextEditor.js';
import { TooltipManager } from './TooltipManager.js';
export class AnnotationManager {
    /**
     * Constructor for AnnotationManager
     * @param {Object} slideViewer - The SlideViewer instance
     * @param {Object} zipLoader - Optional ZipLoader instance with annotations
     */
    constructor(slideViewer, zipLoader = null) {
        this.slideViewer = slideViewer;
        this.annotations = {}; // Storage for annotations by slide
        this.selectedAnnotation = null;
        this.zipLoader = zipLoader;
        
        // Create rich text editor
        this.richTextEditor = new RichTextEditor();
        
        // Create tooltip manager with reference to the slide viewer
        this.tooltipManager = new TooltipManager(this.slideViewer);
        
        // Initialize annotations
        this.annotations = {};
        
        // If we have a zip loader, use its annotations (if any) and don't load local files
        if (this.zipLoader) {
            if (this.zipLoader.getAnnotations()) {
                console.log('Loading annotations from zip file');
                this.annotations = this.zipLoader.getAnnotations();
            } else {
                console.log('Zip file provided but no annotations found in it');
                // Only use localStorage as fallback if no zip annotations
                this.loadPersistedAnnotations();
            }
        } else {
            // No zip loader, try to load from local file first, then from localStorage as fallback
            console.log('No zip file provided, trying to load local annotations');
            this.loadAnnotationsFromFile().then(loaded => {
                if (!loaded) {
                    // If file loading failed, try localStorage
                    this.loadPersistedAnnotations();
                }
            });
        }
        
        // Listen for slide changes
        this.setupEventListeners();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Save annotations before unloading the page
        window.addEventListener('beforeunload', () => {
            const currentSlideIndex = this.slideViewer.getCurrentSlideIndex();
            if (currentSlideIndex) {
                this.saveAnnotationsForSlide(currentSlideIndex);
            }
        });
        
        // Listen for custom event to open annotation editor
        document.addEventListener('openAnnotationEditor', (e) => {
            if (e.detail && e.detail.element && e.detail.content) {
                console.log('Opening annotation editor for element:', e.detail.element);
                this.openRichTextEditor(e.detail.content, e.detail.element);
            }
        });
    }
    
    /**
     * Create a new annotation
     * @param {string} text - Annotation text or HTML content
     * @param {SVGElement} targetElement - The target SVG element
     * @param {Object} position - Optional position override
     * @returns {Object} - The created annotation data object
     */
    createAnnotation(text, targetElement, position = null) {
        // Open the rich text editor if no text is provided
        if (!text && targetElement) {
            this.openRichTextEditor('', targetElement);
            return null;
        }
        
        // Ensure all links in the text have target="_blank"
        if (text && text.includes('<a')) {
            text = this.ensureLinksOpenInNewTab(text);
        }
        
        // Create annotation data object with all required fields
        const annotationData = {
            type: 'annotation',
            text: text,
            elementPath: targetElement ? this.getElementPath(targetElement) : null,
            elementTag: targetElement ? targetElement.tagName : null,
            elementId: targetElement && targetElement.id ? targetElement.id : null,
            elementAttributes: targetElement ? this.getElementAttributes(targetElement) : null,
            position: position || this.calculatePosition(targetElement),
            created: new Date().toISOString()
        };
        
        console.log('Created annotation data object:', JSON.stringify(annotationData, null, 2));
        
        // Register the element with the tooltip manager
        if (targetElement) {
            if (!targetElement.id) {
                // Generate an ID if the element doesn't have one
                targetElement.id = `annotated-element-${Math.random().toString(36).substr(2, 9)}`;
                annotationData.elementId = targetElement.id;
            }
            
            this.tooltipManager.registerAnnotatedElement(targetElement, text);
        }
        
        // Save the annotation to the current slide
        const currentSlideIndex = this.slideViewer.getCurrentSlideIndex();
        const slideKey = `slide-${currentSlideIndex}`;
        
        if (!this.annotations[slideKey]) {
            this.annotations[slideKey] = [];
        }
        
        this.annotations[slideKey].push(annotationData);
        console.log(`Added annotation to slide ${currentSlideIndex}:`, annotationData);
        
        // Persist annotations
        this.persistAnnotations();
        
        // If in edit mode, create a visual representation
        if (document.querySelector('.edit-mode')) {
            this.createVisualAnnotation(annotationData);
        }
        
        return annotationData;
    }
    
    /**
     * Create a visual representation of an annotation
     * @param {Object} annotationData - The annotation data
     * @returns {HTMLElement} - The created annotation element
     */
    createVisualAnnotation(annotationData) {
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        annotation.dataset.annotationId = annotationData.created; // Use timestamp as unique ID
        
        // Store reference to the target element if available
        if (annotationData.elementId) {
            annotation.dataset.targetElement = annotationData.elementId;
        }
        
        // Create text element
        const textElement = document.createElement('div');
        textElement.className = 'annotation-text';
        
        // Support HTML content
        if (annotationData.text.includes('<') && annotationData.text.includes('>')) {
            textElement.innerHTML = annotationData.text;
        } else {
            textElement.textContent = annotationData.text;
        }
        
        annotation.appendChild(textElement);
        
        // Set position
        if (annotationData.position) {
            if (typeof annotationData.position === 'object') {
                if (annotationData.position.left) annotation.style.left = annotationData.position.left;
                if (annotationData.position.top) annotation.style.top = annotationData.position.top;
                // Clear transform if position is explicitly set
                annotation.style.transform = '';
                console.log(`Applied saved position to annotation: left=${annotationData.position.left}, top=${annotationData.position.top}`);
            }
        } else {
            // Default position in the center
            annotation.style.left = '50%';
            annotation.style.top = '50%';
            annotation.style.transform = 'translate(-50%, -50%)';
        }
        
        // Make annotation draggable
        this.makeElementDraggable(annotation);
        
        // Add click handler for selection and editing
        annotation.addEventListener('click', (e) => {
            // Select the annotation
            this.selectAnnotation(annotation);
            
            // Only open the editor if we're in edit mode AND the annotation wasn't being dragged
            if (document.querySelector('.edit-mode') && !annotation.isDragging) {
                const content = annotation.querySelector('.annotation-text').innerHTML;
                
                // Find the target element
                let targetElement = null;
                if (annotationData.elementId) {
                    const svgElement = this.slideViewer.getCurrentSvgElement();
                    if (svgElement) {
                        targetElement = svgElement.getElementById(annotationData.elementId);
                    }
                }
                
                // Open the editor
                this.openRichTextEditor(content, targetElement, (newContent) => {
                    // Update the annotation text
                    annotation.querySelector('.annotation-text').innerHTML = newContent;
                    
                    // Update the annotation data
                    annotationData.text = newContent;
                    
                    // Save the updated annotation
                    this.persistAnnotations();
                    
                    // Update the tooltip if there's a target element
                    if (targetElement) {
                        this.tooltipManager.updateAnnotation(targetElement, newContent);
                    }
                });
            }
            
            e.stopPropagation();
        });
        
        // Add double-click handler as an alternative way to edit
        annotation.addEventListener('dblclick', (e) => {
            if (document.querySelector('.edit-mode')) {
                const content = annotation.querySelector('.annotation-text').innerHTML;
                
                // Find the target element
                let targetElement = null;
                if (annotationData.elementId) {
                    const svgElement = this.slideViewer.getCurrentSvgElement();
                    if (svgElement) {
                        targetElement = svgElement.getElementById(annotationData.elementId);
                    }
                }
                
                // Open the editor
                this.openRichTextEditor(content, targetElement, (newContent) => {
                    // Update the annotation text
                    annotation.querySelector('.annotation-text').innerHTML = newContent;
                    
                    // Update the annotation data
                    annotationData.text = newContent;
                    
                    // Save the updated annotation
                    this.persistAnnotations();
                    
                    // Update the tooltip if there's a target element
                    if (targetElement) {
                        this.tooltipManager.updateAnnotation(targetElement, newContent);
                    }
                });
                
                e.stopPropagation();
            }
        });
        
        // Add to the slide display
        this.slideViewer.slideDisplay.appendChild(annotation);
        
        // Select the new annotation
        this.selectAnnotation(annotation);
        
        return annotation;
    }
    
    /**
     * Calculate position for an annotation based on target element
     * @param {Element} targetElement - The target element
     * @returns {Object} - Position object with left and top properties
     */
    calculatePosition(targetElement) {
        if (!targetElement) {
            return { left: '50%', top: '50%' };
        }
        
        try {
            // Get the element's bounding rectangle
            const rect = targetElement.getBoundingClientRect();
            const displayRect = this.slideViewer.slideDisplay.getBoundingClientRect();
            
            // Get the SVG element to calculate scaling
            const svgElement = targetElement.ownerSVGElement || this.slideViewer.getCurrentSvgElement();
            
            // Calculate position relative to the display container
            let left = rect.left - displayRect.left + rect.width/2;
            let top = rect.top - displayRect.top + rect.height/2;
            
            // Ensure the annotation is visible and within bounds
            // Keep it at least 10px from the edges
            left = Math.max(10, Math.min(displayRect.width - 10, left));
            top = Math.max(10, Math.min(displayRect.height - 10, top));
            
            console.log(`Calculated annotation position: left=${left}px, top=${top}px`);
            
            return {
                left: left + 'px',
                top: top + 'px'
            };
        } catch (e) {
            console.error('Error calculating position:', e);
            return { left: '50%', top: '50%' };
        }
    }
    
    /**
     * Open the rich text editor
     * @param {string} initialContent - Initial HTML content
     * @param {Element} targetElement - The target element being annotated
     * @param {Function} callback - Optional callback for when content is saved
     */
    openRichTextEditor(initialContent = '', targetElement = null, callback = null) {
        // If no callback is provided, create a default one that creates a new annotation
        if (!callback) {
            callback = (content, element) => {
                if (content && content.trim() !== '') {
                    console.log('Creating annotation from rich text editor with content:', content);
                    // Create the annotation
                    this.createAnnotation(content, element);
                }
            };
        }
        
        // Create a wrapper callback to ensure links have target="_blank"
        const wrappedCallback = (content, element) => {
            // Process the content to ensure links open in new tabs
            if (content && content.includes('<a')) {
                content = this.ensureLinksOpenInNewTab(content);
            }
            
            // Call the original callback with the processed content
            callback(content, element);
        };
        
        // Open the rich text editor
        this.richTextEditor.open(initialContent, targetElement, wrappedCallback);
    }
    
    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     */
    makeElementDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;
        
        // Add the isDragging property to the element for reference in click handlers
        element.isDragging = false;
        
        element.onmousedown = dragMouseDown.bind(this);
        
        function dragMouseDown(e) {
            e.preventDefault();
            
            // Reset dragging state
            isDragging = false;
            element.isDragging = false;
            
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Select this annotation
            this.selectAnnotation(element);
            
            // Call a function whenever the cursor moves
            document.onmousemove = elementDrag.bind(this);
            document.onmouseup = closeDragElement.bind(this);
        }
        
        function elementDrag(e) {
            e.preventDefault();
            
            // Set the dragging flag to true as soon as movement starts
            isDragging = true;
            element.isDragging = true;
            
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Set the element's new position
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            
            // Remove transform if it exists
            element.style.transform = '';
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
            
            // Only update if we actually dragged (not just clicked)
            if (isDragging) {
                // Force explicit pixel values for positions
                if (!element.style.top.endsWith('px')) {
                    element.style.top = element.offsetTop + 'px';
                }
                if (!element.style.left.endsWith('px')) {
                    element.style.left = element.offsetLeft + 'px';
                }
                
                // Save the new position to the annotation data
                this.updateAnnotationPosition(element);
                
                // Immediately persist to storage
                this.persistAnnotations();
                
                console.log(`Dragging ended. New position: left=${element.style.left}, top=${element.style.top}`);
            }
            
            // Reset the dragging flag after a short delay to allow click events to fire first
            setTimeout(() => {
                element.isDragging = false;
            }, 50);
        }
    }
    
    /**
     * Select an annotation
     * @param {HTMLElement} annotation - The annotation to select
     */
    selectAnnotation(annotation) {
        // Deselect any previously selected annotation
        if (this.selectedAnnotation) {
            this.selectedAnnotation.classList.remove('selected');
        }
        
        // Select the new annotation
        annotation.classList.add('selected');
        this.selectedAnnotation = annotation;
    }
    
    /**
     * Update the position of an annotation in the data model
     * @param {HTMLElement} annotationElement - The annotation element that was moved
     */
    updateAnnotationPosition(annotationElement) {
        if (!annotationElement || !annotationElement.dataset.annotationId) {
            console.warn('Cannot update position: Invalid annotation element');
            return;
        }
        
        // Get the current slide index
        const currentSlideIndex = this.slideViewer.getCurrentSlideIndex();
        if (!currentSlideIndex) return;
        
        const slideKey = `slide-${currentSlideIndex}`;
        if (!this.annotations[slideKey]) return;
        
        // Find the annotation data by its unique ID
        const annotationId = annotationElement.dataset.annotationId;
        const annotationData = this.annotations[slideKey].find(a => a.created === annotationId);
        
        if (!annotationData) {
            console.warn(`Annotation data not found for ID: ${annotationId}`);
            return;
        }
        
        // Get the computed position - ensure we have pixel values
        let left = annotationElement.style.left;
        let top = annotationElement.style.top;
        
        // If we don't have explicit pixel values, get them from offsetLeft/offsetTop
        if (!left.endsWith('px')) {
            left = annotationElement.offsetLeft + 'px';
        }
        
        if (!top.endsWith('px')) {
            top = annotationElement.offsetTop + 'px';
        }
        
        // Update the position in the annotation data
        annotationData.position = {
            left: left,
            top: top
        };
        
        console.log(`Updated annotation position in data model: left=${left}, top=${top}`);
    }
    
    /**
     * Save annotations for a specific slide
     * @param {number} slideIndex - The slide index
     */
    saveAnnotationsForSlide(slideIndex) {
        // Save the positions of all visible annotations before switching slides or exiting edit mode
        this.saveAllAnnotationPositions();
        
        console.log(`Annotations for slide ${slideIndex} saved in the data model`);
    }
    
    /**
     * Save the positions of all visible annotations
     */
    saveAllAnnotationPositions() {
        // Get all visible annotation elements
        const annotationElements = document.querySelectorAll('.annotation');
        if (annotationElements.length === 0) {
            console.log('No visible annotations to save positions for');
            return;
        }
        
        console.log(`Saving positions for ${annotationElements.length} visible annotations`);
        
        // For each annotation element, update its position in the data model
        annotationElements.forEach(element => {
            this.updateAnnotationPosition(element);
        });
    }
    
    /**
     * Apply annotations for a specific slide
     * @param {number} slideIndex - The slide index
     */
    applyAnnotationsForSlide(slideIndex) {
        const slideKey = `slide-${slideIndex}`;
        if (!this.annotations[slideKey]) {
            console.log(`No annotations found for slide ${slideIndex}`);
            return;
        }
        
        const svgElement = this.slideViewer.getCurrentSvgElement();
        if (!svgElement) {
            console.warn('No SVG element found when applying annotations');
            return;
        }
        
        console.log(`Applying ${this.annotations[slideKey].length} annotations for slide ${slideIndex}`);
        
        // Clear existing visual annotations
        this.clearAnnotationsFromDisplay();
        
        // Clear any existing HTML indicators
        this.clearExistingIndicators();
        
        // Clear any existing tooltips
        this.tooltipManager.clearAnnotatedElements();
        
        // Remove any existing annotation indicators
        this.removeAnnotationIndicators(svgElement);
        
        // Apply all annotations for this slide
        this.annotations[slideKey].forEach(annotation => {
            if (annotation.type === 'removed') {
                // Handle element removal
                let element = null;
                
                // Try to find the element by ID first (most reliable)
                if (annotation.elementId) {
                    element = svgElement.getElementById(annotation.elementId);
                    if (element) {
                        console.log(`Removing element with ID: ${annotation.elementId}`);
                        element.classList.add('removed');
                    } else {
                        console.warn(`Element with ID ${annotation.elementId} not found`);
                    }
                } 
                // If no ID or element not found, try to find by path and attributes
                else if (annotation.elementPath && annotation.elementTag) {
                    console.log(`Trying to find element by path: ${annotation.elementPath}`);
                    element = this.findElementByPath(svgElement, annotation.elementPath, annotation.elementTag, annotation.elementAttributes);
                    if (element) {
                        console.log(`Found and removing element by path`);
                        element.classList.add('removed');
                    } else {
                        console.warn(`Element not found by path: ${annotation.elementPath}`);
                    }
                }
            } else if (annotation.type === 'annotation') {
                // Find the target element
                let targetElement = null;
                
                // Try to find by ID first
                if (annotation.elementId) {
                    targetElement = svgElement.getElementById(annotation.elementId);
                }
                
                // If not found by ID, try by path
                if (!targetElement && annotation.elementPath) {
                    targetElement = this.findElementByPath(
                        svgElement, 
                        annotation.elementPath, 
                        annotation.elementTag, 
                        annotation.elementAttributes
                    );
                }
                
                // Register with tooltip manager if element found
                if (targetElement) {
                    console.log(`Registering tooltip for element:`, targetElement.tagName, targetElement.id || '');
                    
                    // Pass the full annotation data to the tooltip manager
                    // This helps with proper positioning of indicators
                    this.tooltipManager.registerAnnotatedElement(targetElement, annotation.text, annotation);
                    
                    // If element didn't have an ID but now does, update the annotation
                    if (!annotation.elementId && targetElement.id) {
                        annotation.elementId = targetElement.id;
                        this.persistAnnotations();
                    }
                    
                    // Update the annotation position based on the current element position
                    // This ensures annotations stay with their elements after SVG resizing
                    if (annotation.position) {
                        const newPosition = this.calculatePosition(targetElement);
                        annotation.position = newPosition;
                    }
                }
                
                // Always create visual annotation in edit mode
                if (document.querySelector('.edit-mode')) {
                    this.createVisualAnnotation(annotation);
                }
                // In non-edit mode, we only create tooltips (handled above) and don't need visual annotations
            }
        });
    }
    
    /**
     * Clear all annotations from display
     */
    clearAnnotationsFromDisplay() {
        const annotationElements = document.querySelectorAll('.annotation');
        annotationElements.forEach(el => el.remove());
        this.selectedAnnotation = null;
    }
    
    /**
     * Clear existing HTML annotation indicators
     */
    clearExistingIndicators() {
        // Remove all existing HTML indicators
        const indicators = document.querySelectorAll('.html-annotation-indicator');
        indicators.forEach(indicator => {
            indicator.remove();
        });
        console.log(`Cleared ${indicators.length} existing HTML indicators`);
    }
    
    /**
     * Remove all annotation indicators from SVG elements
     * @param {SVGElement} svgElement - The SVG element to clean up
     */
    removeAnnotationIndicators(svgElement) {
        if (!svgElement) return;
        
        // Remove SVG indicator groups
        const groups = svgElement.querySelectorAll('.annotation-indicator-group');
        groups.forEach(group => group.remove());
        
        // Remove individual SVG circle indicators (for backward compatibility)
        const indicators = svgElement.querySelectorAll('.annotation-indicator-svg');
        indicators.forEach(indicator => indicator.remove());
        
        // Also remove any div indicators
        const divIndicators = document.querySelectorAll('.annotation-indicator');
        divIndicators.forEach(indicator => indicator.remove());
        
        console.log(`Removed ${groups.length + indicators.length + divIndicators.length} annotation indicators`);
    }
    
    /**
     * Get the path of an element relative to its SVG root
     * @param {Element} element - The element to get the path for
     * @returns {string} - The element path
     */
    getElementPath(element) {
        if (!element || !element.parentNode) return '';
        
        let path = '';
        let current = element;
        let root = element.ownerSVGElement || document.querySelector('svg');
        
        while (current && current !== root) {
            let index = 0;
            let sibling = current;
            
            // Count the index among siblings of the same type
            while (sibling.previousElementSibling) {
                if (sibling.previousElementSibling.tagName === current.tagName) {
                    index++;
                }
                sibling = sibling.previousElementSibling;
            }
            
            path = `/${current.tagName}[${index}]${path}`;
            current = current.parentNode;
        }
        
        return path;
    }
    
    /**
     * Get important attributes of an element for identification
     * @param {Element} element - The element to get attributes from
     * @returns {Object} - Object with attribute name-value pairs
     */
    getElementAttributes(element) {
        if (!element || !element.attributes) return {};
        
        const attributes = {};
        const importantAttributes = ['class', 'width', 'height', 'x', 'y', 'd', 'points', 'cx', 'cy', 'r', 'rx', 'ry'];
        
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            if (importantAttributes.includes(attr.name)) {
                attributes[attr.name] = attr.value;
            }
        }
        
        return attributes;
    }
    
    /**
     * Find an element by its path and attributes
     * @param {SVGElement} svgRoot - The SVG root element
     * @param {string} path - The element path
     * @param {string} tagName - The element tag name
     * @param {Object} attributes - The element attributes
     * @returns {Element|null} - The found element or null
     */
    findElementByPath(svgRoot, path, tagName, attributes) {
        // First try to find by path
        try {
            const pathParts = path.split('/').filter(p => p);
            let current = svgRoot;
            
            for (const part of pathParts) {
                const match = part.match(/([^\[]+)\[(\d+)\]/);
                if (!match) continue;
                
                const [_, tag, index] = match;
                const children = Array.from(current.children).filter(c => c.tagName === tag);
                
                if (children.length > parseInt(index)) {
                    current = children[parseInt(index)];
                } else {
                    return null;
                }
            }
            
            return current;
        } catch (e) {
            console.error('Error finding element by path:', e);
        }
        
        // If path-based search fails, try to find by tag and attributes
        try {
            const candidates = Array.from(svgRoot.querySelectorAll(tagName));
            
            // Filter candidates by attributes
            return candidates.find(element => {
                // Check if element attributes match the stored attributes
                for (const [name, value] of Object.entries(attributes)) {
                    if (element.getAttribute(name) !== value) {
                        return false;
                    }
                }
                return true;
            });
        } catch (e) {
            console.error('Error finding element by attributes:', e);
            return null;
        }
    }
    
    /**
     * Persist annotations to localStorage
     */
    persistAnnotations() {
        try {
            // Check if we have any annotations to save
            let hasAnnotations = false;
            let annotationCount = 0;
            
            for (const key in this.annotations) {
                if (this.annotations[key] && this.annotations[key].length > 0) {
                    hasAnnotations = true;
                    annotationCount += this.annotations[key].length;
                    
                    // Log each annotation for debugging
                    console.log(`Slide ${key} has ${this.annotations[key].length} annotations:`);
                    this.annotations[key].forEach((anno, i) => {
                        console.log(`  ${i+1}. Type: ${anno.type}, Text: ${anno.text ? anno.text.substring(0, 30) + '...' : 'none'}`);
                    });
                }
            }
            
            if (!hasAnnotations) {
                console.warn('No annotations to persist!');
                return;
            }
            
            // Convert to JSON and save
            const json = JSON.stringify(this.annotations, null, 2);
            console.log(`Persisting ${annotationCount} annotations to localStorage`);
            localStorage.setItem('slideViewerAnnotations', json);
        } catch (e) {
            console.error('Failed to persist annotations to localStorage:', e);
        }
    }
    
    /**
     * Load annotations from a JSON file in the slides folder
     * @returns {Promise<boolean>} - Promise that resolves to true if annotations were loaded successfully
     */
    async loadAnnotationsFromFile() {
        try {
            console.log('Attempting to load annotations from file...');
            const response = await fetch('slides/slide-annotations.json');
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('No slide-annotations.json file found in slides folder');
                } else {
                    console.warn(`Failed to load annotations file: ${response.status} ${response.statusText}`);
                }
                return false;
            }
            
            const data = await response.json();
            if (data && typeof data === 'object') {
                this.annotations = data;
                
                // Check if we have any annotations
                let annotationCount = 0;
                for (const key in this.annotations) {
                    if (this.annotations[key] && Array.isArray(this.annotations[key])) {
                        annotationCount += this.annotations[key].length;
                    }
                }
                
                console.log(`Loaded ${annotationCount} annotations from file:`, this.annotations);
                return true;
            } else {
                console.warn('Annotations file is not in the expected format:', data);
            }
        } catch (e) {
            console.error('Error loading annotations from file:', e);
        }
        
        return false;
    }
    
    /**
     * Load persisted annotations from localStorage
     */
    loadPersistedAnnotations() {
        try {
            const saved = localStorage.getItem('slideViewerAnnotations');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        this.annotations = parsed;
                        
                        // Check if we have any annotations
                        let annotationCount = 0;
                        for (const key in this.annotations) {
                            if (this.annotations[key] && Array.isArray(this.annotations[key])) {
                                annotationCount += this.annotations[key].length;
                            }
                        }
                        
                        console.log(`Loaded ${annotationCount} persisted annotations from localStorage`);
                        return true;
                    } else {
                        console.warn('Persisted annotations are not in the expected format:', parsed);
                    }
                } catch (parseError) {
                    console.error('Error parsing persisted annotations:', parseError);
                }
            } else {
                console.log('No persisted annotations found in localStorage');
            }
        } catch (e) {
            console.error('Failed to load persisted annotations:', e);
        }
        
        // Initialize with empty object if no annotations were loaded
        this.annotations = {};
        return false;
    }
    
    /**
     * Get all annotations
     * @returns {Object} - All annotations by slide
     */
    getAllAnnotations() {
        // Make sure we have the latest annotations from the current slide
        const currentSlideIndex = this.slideViewer.getCurrentSlideIndex();
        if (currentSlideIndex) {
            // Save any removed elements that might not be in the data model yet
            this.saveRemovedElements(currentSlideIndex);
        }
        
        console.log('Getting all annotations:', this.annotations);
        return this.annotations;
    }
    
    /**
     * Ensure all links in HTML content open in a new tab
     * @param {string} htmlContent - The HTML content to process
     * @returns {string} - The processed HTML content with target="_blank" added to links
     */
    ensureLinksOpenInNewTab(htmlContent) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return htmlContent;
        }
        
        // Create a temporary DOM element to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Find all links in the content
        const links = tempDiv.querySelectorAll('a');
        if (links.length === 0) {
            return htmlContent;
        }
        
        // Add target="_blank" to all links
        links.forEach(link => {
            if (!link.hasAttribute('target') || link.getAttribute('target') !== '_blank') {
                link.setAttribute('target', '_blank');
                console.log('Added target="_blank" to link:', link.href);
            }
        });
        
        // Return the processed HTML
        return tempDiv.innerHTML;
    }
    
    /**
     * Save removed elements for the current slide
     * @param {number} slideIndex - The slide index
     */
    saveRemovedElements(slideIndex) {
        const slideKey = `slide-${slideIndex}`;
        if (!this.annotations[slideKey]) {
            this.annotations[slideKey] = [];
        }
        
        // Get all SVG elements that have been removed
        const svgElement = this.slideViewer.getCurrentSvgElement();
        if (!svgElement) return;
        
        const removedElements = svgElement.querySelectorAll('.removed');
        console.log(`Found ${removedElements.length} removed elements to save`);
        
        // Filter out elements that are already in the annotations
        removedElements.forEach(element => {
            // Check if this element is already in the annotations
            const elementId = element.id;
            const elementPath = this.getElementPath(element);
            
            const alreadySaved = this.annotations[slideKey].some(anno => 
                anno.type === 'removed' && 
                ((elementId && anno.elementId === elementId) || 
                 (elementPath && anno.elementPath === elementPath))
            );
            
            if (!alreadySaved) {
                console.log('Adding removed element to annotations:', element.tagName, element.id || '');
                
                // Create removal data
                const removalData = {
                    type: 'removed',
                    elementTag: element.tagName,
                    elementPath: elementPath,
                    elementAttributes: this.getElementAttributes(element)
                };
                
                // Add ID if available
                if (elementId) {
                    removalData.elementId = elementId;
                }
                
                // Add to annotations
                this.annotations[slideKey].push(removalData);
            }
        });
        
        // Persist the updated annotations
        this.persistAnnotations();
    }
}
