document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const slideDisplay = document.getElementById('slide-display');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const slideCounter = document.getElementById('slide-counter');
    const adminControls = document.getElementById('admin-controls');
    const editBtn = document.getElementById('edit-btn');
    const downloadBtn = document.getElementById('download-btn');
    const annotationTools = document.getElementById('annotation-tools');
    const selectTool = document.getElementById('select-tool');
    const annotateTool = document.getElementById('annotate-tool');
    const removeTool = document.getElementById('remove-tool');
    const annotationText = document.getElementById('annotation-text');
    
    // Slide state
    let currentSlideIndex = 1;
    const totalSlides = 26; // Based on the files we found
    let isEditMode = false;
    let currentTool = 'select';
    let selectedElement = null;
    
    // Annotations storage
    const annotations = {};
    
    // Check for admin mode in URL
    function checkAdminMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const isAdmin = urlParams.get('admin') === 'yes';
        
        if (isAdmin) {
            adminControls.style.display = 'flex';
        }
    }
    
    // Function to load a slide by index
    async function loadSlide(index) {
        try {
            // Save any annotations for the current slide before changing
            if (isEditMode) {
                saveAnnotationsForCurrentSlide();
            }
            
            const response = await fetch(`slides/Slide${index}.SVG`);
            if (!response.ok) {
                throw new Error(`Failed to load slide ${index}`);
            }
            
            const svgContent = await response.text();
            slideDisplay.innerHTML = svgContent;
            
            // Update counter
            slideCounter.textContent = `Slide ${index} of ${totalSlides}`;
            
            // Update button states
            prevBtn.disabled = index === 1;
            nextBtn.disabled = index === totalSlides;
            
            // Update current index
            currentSlideIndex = index;
            
            // Apply any existing annotations for this slide
            if (isEditMode) {
                applyAnnotationsForCurrentSlide();
            }
        } catch (error) {
            console.error(error);
            slideDisplay.innerHTML = `<p class="error">Error loading slide ${index}</p>`;
        }
    }
    
    // Function to save annotations for the current slide
    function saveAnnotationsForCurrentSlide() {
        const slideKey = `slide-${currentSlideIndex}`;
        const currentAnnotations = [];
        
        // Get all SVG elements that have been modified
        const svgElement = slideDisplay.querySelector('svg');
        if (svgElement) {
            // Save removed elements
            const removedElements = svgElement.querySelectorAll('.removed');
            removedElements.forEach(element => {
                if (element.id) {
                    currentAnnotations.push({
                        type: 'removed',
                        elementId: element.id
                    });
                }
            });
        }
        
        // Get all annotation elements
        const annotationElements = document.querySelectorAll('.annotation');
        annotationElements.forEach(annotation => {
            const annotationData = {
                type: 'annotation',
                text: annotation.querySelector('.annotation-text').textContent,
                position: {
                    left: annotation.style.left,
                    top: annotation.style.top
                },
                targetElement: annotation.dataset.targetElement || null
            };
            currentAnnotations.push(annotationData);
        });
        
        // Save annotations for this slide
        annotations[slideKey] = currentAnnotations;
    }
    
    // Function to apply annotations for the current slide
    function applyAnnotationsForCurrentSlide() {
        const slideKey = `slide-${currentSlideIndex}`;
        if (!annotations[slideKey]) return;
        
        const svgElement = slideDisplay.querySelector('svg');
        if (!svgElement) return;
        
        // Apply all annotations for this slide
        annotations[slideKey].forEach(annotation => {
            if (annotation.type === 'removed' && annotation.elementId) {
                const element = svgElement.getElementById(annotation.elementId);
                if (element) {
                    element.classList.add('removed');
                }
            } else if (annotation.type === 'annotation') {
                createAnnotationElement(annotation.text, annotation.position, annotation.targetElement);
            }
        });
    }
    
    // Function to create an annotation element
    function createAnnotationElement(text, position = null, targetElementId = null) {
        const annotation = document.createElement('div');
        annotation.className = 'annotation';
        
        if (targetElementId) {
            annotation.dataset.targetElement = targetElementId;
        }
        
        const textElement = document.createElement('div');
        textElement.className = 'annotation-text';
        textElement.textContent = text;
        annotation.appendChild(textElement);
        
        // Set position
        if (position) {
            annotation.style.left = position.left;
            annotation.style.top = position.top;
        } else {
            // Default position in the center
            annotation.style.left = '50%';
            annotation.style.top = '50%';
            annotation.style.transform = 'translate(-50%, -50%)';
        }
        
        // Make annotation draggable
        makeElementDraggable(annotation);
        
        // Add click handler for selection
        annotation.addEventListener('click', (e) => {
            if (currentTool === 'select') {
                selectAnnotation(annotation);
                e.stopPropagation();
            }
        });
        
        slideDisplay.appendChild(annotation);
        return annotation;
    }
    
    // Function to make an element draggable
    function makeElementDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            if (currentTool !== 'select') return;
            
            e.preventDefault();
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // Call a function whenever the cursor moves
            document.onmousemove = elementDrag;
            
            // Select this annotation
            selectAnnotation(element);
        }
        
        function elementDrag(e) {
            e.preventDefault();
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
        }
    }
    
    // Function to select an annotation
    function selectAnnotation(annotation) {
        // Deselect any previously selected annotation
        if (selectedElement) {
            selectedElement.classList.remove('selected');
        }
        
        // Select the new annotation
        annotation.classList.add('selected');
        selectedElement = annotation;
    }
    
    // Function to toggle edit mode
    function toggleEditMode() {
        isEditMode = !isEditMode;
        
        if (isEditMode) {
            // Enter edit mode
            editBtn.classList.add('active');
            editBtn.textContent = 'Exit Edit Mode';
            annotationTools.style.display = 'block';
            slideDisplay.classList.add('edit-mode');
            downloadBtn.style.display = 'block';
            
            console.log('Entering edit mode');
            
            // Add click handlers to SVG elements
            setupSvgElementHandlers();
            
            // Apply any existing annotations
            applyAnnotationsForCurrentSlide();
            
            // Set the default tool
            setActiveTool('select');
        } else {
            // Exit edit mode
            editBtn.classList.remove('active');
            editBtn.textContent = 'Edit Mode';
            annotationTools.style.display = 'none';
            slideDisplay.classList.remove('edit-mode');
            
            // Save annotations before exiting
            saveAnnotationsForCurrentSlide();
            
            // Clear all annotations from display
            const annotationElements = document.querySelectorAll('.annotation');
            annotationElements.forEach(el => el.remove());
            
            // Reset any removed elements
            const svgElement = slideDisplay.querySelector('svg');
            if (svgElement) {
                const removedElements = svgElement.querySelectorAll('.removed');
                removedElements.forEach(el => el.classList.remove('removed'));
            }
            
            // Reset selected element
            selectedElement = null;
        }
    }
    
    // Function to set up SVG element handlers
    function setupSvgElementHandlers() {
        const svgElement = slideDisplay.querySelector('svg');
        if (!svgElement) return;
        
        // Add click handlers to all SVG elements
        const svgChildren = svgElement.querySelectorAll('*');
        svgChildren.forEach(element => {
            element.style.cursor = 'pointer';
            // We'll handle all clicks through the container click handler
            // to ensure we can show the list of elements
        });
        
        // Add click handler to the SVG container for object detection
        slideDisplay.addEventListener('click', handleSvgContainerClick);
        
        // Store a reference to the SVG element globally
        window.currentSvgElement = svgElement;
        
        console.log('SVG element handlers set up');
    }
    
    // Function to handle SVG container click for object detection
    function handleSvgContainerClick(e) {
        if (!isEditMode) return;
        
        console.log('Container click detected in edit mode');
        
        // Get the SVG element
        const svgElement = window.currentSvgElement;
        if (!svgElement) {
            console.error('No SVG element found');
            return;
        }
        
        // Get click coordinates relative to the slide display
        const displayRect = slideDisplay.getBoundingClientRect();
        const x = e.clientX - displayRect.left;
        const y = e.clientY - displayRect.top;
        
        console.log(`Click at coordinates: x=${x}, y=${y}`);
        
        // Find all elements at the click position
        const elementsAtPoint = findElementsAtPoint(svgElement, x, y);
        console.log('Elements found at point:', elementsAtPoint.length);
        
        // Display the list of elements
        if (elementsAtPoint.length > 0) {
            showElementsList(elementsAtPoint, e.clientX, e.clientY);
        } else {
            // If no elements found with our custom detection, try DOM method
            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (element && element.tagName && element !== slideDisplay && !element.classList.contains('annotation')) {
                console.log('Found element with DOM method:', element.tagName);
                showElementsList([element], e.clientX, e.clientY);
            } else {
                console.log('No elements found at click position');
            }
        }
        
        // Don't stop propagation to allow normal click handling
    }
    
    // Function to find all SVG elements at a specific point
    function findElementsAtPoint(svgElement, x, y) {
        const elements = [];
        const allElements = svgElement.querySelectorAll('*');
        
        // Convert coordinates to be relative to the SVG viewBox if needed
        const svgRect = svgElement.getBoundingClientRect();
        const viewBoxX = x * (svgElement.viewBox.baseVal.width / svgRect.width);
        const viewBoxY = y * (svgElement.viewBox.baseVal.height / svgRect.height);
        
        console.log(`Checking ${allElements.length} SVG elements at viewBox coordinates: x=${viewBoxX}, y=${viewBoxY}`);
        
        // First try using the browser's elementFromPoint
        const clickedElement = document.elementFromPoint(x + svgRect.left, y + svgRect.top);
        if (clickedElement && clickedElement.tagName && clickedElement !== svgElement && clickedElement !== slideDisplay) {
            console.log('Direct hit on element:', clickedElement.tagName);
            elements.push(clickedElement);
        }
        
        // Then check all elements using bounding box
        allElements.forEach(element => {
            // Skip elements that are already removed
            if (element.classList.contains('removed')) return;
            
            try {
                // Simple bounding box check for all elements
                const bbox = element.getBBox();
                if (bbox) {
                    // Check if point is in bounding box (in SVG coordinates)
                    if (viewBoxX >= bbox.x && 
                        viewBoxX <= bbox.x + bbox.width && 
                        viewBoxY >= bbox.y && 
                        viewBoxY <= bbox.y + bbox.height) {
                        
                        // Only add if not already in the array
                        if (!elements.includes(element)) {
                            elements.push(element);
                            console.log('Found element via bounding box:', element.tagName, element.id || '');
                        }
                    }
                }
            } catch (e) {
                // Some elements might not support getBBox
            }
        });
        
        return elements;
    }
    
    // Function to check if a point is inside an SVG element
    function isPointInElement(element, x, y) {
        // Get the SVG root element
        const svgRoot = element.ownerSVGElement || element.closest('svg');
        if (!svgRoot) return false;
        
        // For simple shapes like rect, circle, etc.
        try {
            const bbox = element.getBBox();
            if (bbox) {
                // Get element's transform to viewport
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
            }
        } catch (e) {
            // Some elements might not support getBBox
            console.log('getBBox error:', e);
        }
        
        // Fallback to standard hit testing
        try {
            if (element.isPointInFill) {
                const pt = svgRoot.createSVGPoint();
                pt.x = x;
                pt.y = y;
                const hit = element.isPointInFill(pt);
                if (hit !== undefined) return hit;
            }
        } catch (e) {
            console.log('isPointInFill error:', e);
        }
        
        // Last resort: check if element is at point using DOM method
        const svgRect = svgRoot.getBoundingClientRect();
        return document.elementFromPoint(x + svgRect.left, y + svgRect.top) === element;
    }
    
    // Function to show the list of elements at the click position
    function showElementsList(elements, clientX, clientY) {
        console.log('Showing elements list with', elements.length, 'elements');
        
        // Remove any existing element list
        const existingList = document.getElementById('elements-list');
        if (existingList) {
            existingList.remove();
        }
        
        // Create a new list container
        const listContainer = document.createElement('div');
        listContainer.id = 'elements-list';
        listContainer.className = 'elements-list';
        
        // Position the list - ensure it stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        let left = clientX + 10;
        let top = clientY + 10;
        
        // Adjust position if it would go off-screen
        if (left + 250 > viewportWidth) { // Assuming max width of 250px
            left = viewportWidth - 260;
        }
        if (top + 300 > viewportHeight) { // Assuming max height of 300px
            top = viewportHeight - 310;
        }
        
        listContainer.style.left = left + 'px';
        listContainer.style.top = top + 'px';
        
        // Add a title
        const title = document.createElement('h3');
        title.textContent = 'SVG Elements at Click Position';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '14px';
        listContainer.appendChild(title);
        
        // Create the list
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';
        list.style.margin = '0';
        
        // Add each element to the list
        elements.forEach((element, index) => {
            const listItem = document.createElement('li');
            listItem.style.padding = '5px';
            listItem.style.cursor = 'pointer';
            listItem.style.borderBottom = index < elements.length - 1 ? '1px solid #eee' : 'none';
            
            // Create element info
            let elementInfo = element.tagName;
            if (element.id) elementInfo += ` (id: ${element.id})`;
            if (element.classList.length > 0) elementInfo += ` (class: ${element.classList.value})`;
            
            listItem.textContent = elementInfo;
            
            // Highlight element on hover
            listItem.addEventListener('mouseover', () => {
                element.setAttribute('data-original-stroke', element.getAttribute('stroke') || 'none');
                element.setAttribute('data-original-stroke-width', element.getAttribute('stroke-width') || '1');
                element.setAttribute('stroke', '#ff0000');
                element.setAttribute('stroke-width', '2');
            });
            
            listItem.addEventListener('mouseout', () => {
                element.setAttribute('stroke', element.getAttribute('data-original-stroke'));
                element.setAttribute('stroke-width', element.getAttribute('data-original-stroke-width'));
            });
            
            // Add action buttons
            const actionContainer = document.createElement('div');
            actionContainer.style.marginTop = '5px';
            
            // Annotate button
            const annotateBtn = document.createElement('button');
            annotateBtn.textContent = 'Annotate';
            annotateBtn.style.marginRight = '5px';
            annotateBtn.style.padding = '3px 8px';
            annotateBtn.style.fontSize = '12px';
            annotateBtn.addEventListener('click', () => {
                const text = annotationText.value || 'Annotation';
                const annotation = createAnnotationElement(text);
                
                // Position annotation near the element
                const rect = element.getBoundingClientRect();
                const displayRect = slideDisplay.getBoundingClientRect();
                
                annotation.style.left = (rect.left - displayRect.left + rect.width/2) + 'px';
                annotation.style.top = (rect.top - displayRect.top + rect.height/2) + 'px';
                annotation.style.transform = '';
                
                // Store reference to the target element
                if (element.id) {
                    annotation.dataset.targetElement = element.id;
                }
                
                // Select the new annotation
                selectAnnotation(annotation);
                
                // Close the list
                listContainer.remove();
            });
            
            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.padding = '3px 8px';
            removeBtn.style.fontSize = '12px';
            removeBtn.addEventListener('click', () => {
                element.classList.add('removed');
                listContainer.remove();
            });
            
            actionContainer.appendChild(annotateBtn);
            actionContainer.appendChild(removeBtn);
            listItem.appendChild(actionContainer);
            
            list.appendChild(listItem);
        });
        
        // Add a close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.className = 'close-btn';
        closeBtn.addEventListener('click', () => {
            listContainer.remove();
        });
        
        listContainer.appendChild(list);
        listContainer.appendChild(closeBtn);
        
        // Add the list to the document
        document.body.appendChild(listContainer);
        
        // Prevent immediate closing due to the same click event
        setTimeout(() => {
            // Close the list when clicking outside
            const closeListHandler = function(e) {
                if (!listContainer.contains(e.target) && e.target !== listContainer) {
                    listContainer.remove();
                    document.removeEventListener('click', closeListHandler);
                }
            };
            
            document.addEventListener('click', closeListHandler);
        }, 100);
        
        console.log('Elements list displayed');
    }
    
    // Function to handle SVG element click
    function handleSvgElementClick(e) {
        if (!isEditMode) return;
        
        const element = e.currentTarget;
        
        if (currentTool === 'annotate') {
            // Create annotation for this element
            const text = annotationText.value || 'Annotation';
            const annotation = createAnnotationElement(text);
            
            // Position annotation near the clicked element
            const rect = element.getBoundingClientRect();
            const displayRect = slideDisplay.getBoundingClientRect();
            
            annotation.style.left = (rect.left - displayRect.left + rect.width/2) + 'px';
            annotation.style.top = (rect.top - displayRect.top + rect.height/2) + 'px';
            annotation.style.transform = '';
            
            // Store reference to the target element
            if (element.id) {
                annotation.dataset.targetElement = element.id;
            }
            
            // Select the new annotation
            selectAnnotation(annotation);
            
        } else if (currentTool === 'remove') {
            // Mark element as removed
            element.classList.add('removed');
        }
        
        e.stopPropagation();
    }
    
    // Function to download annotations as JSON
    function downloadAnnotations() {
        // Save current slide annotations before downloading
        saveAnnotationsForCurrentSlide();
        
        // Create a JSON blob
        const annotationsJson = JSON.stringify(annotations, null, 2);
        const blob = new Blob([annotationsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'slide-annotations.json';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    
    // Tool selection handlers
    function setActiveTool(tool) {
        currentTool = tool;
        
        // Update UI
        selectTool.classList.remove('active');
        annotateTool.classList.remove('active');
        removeTool.classList.remove('active');
        
        switch(tool) {
            case 'select':
                selectTool.classList.add('active');
                slideDisplay.style.cursor = 'default';
                break;
            case 'annotate':
                annotateTool.classList.add('active');
                slideDisplay.style.cursor = 'crosshair';
                break;
            case 'remove':
                removeTool.classList.add('active');
                slideDisplay.style.cursor = 'not-allowed';
                break;
        }
    }
    
    // Initialize
    checkAdminMode();
    loadSlide(currentSlideIndex);
    
    // Event listeners for navigation buttons
    prevBtn.addEventListener('click', () => {
        if (currentSlideIndex > 1) {
            loadSlide(currentSlideIndex - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentSlideIndex < totalSlides) {
            loadSlide(currentSlideIndex + 1);
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' && currentSlideIndex > 1) {
            loadSlide(currentSlideIndex - 1);
        } else if (event.key === 'ArrowRight' && currentSlideIndex < totalSlides) {
            loadSlide(currentSlideIndex + 1);
        }
    });
    
    // Admin mode event listeners
    editBtn.addEventListener('click', toggleEditMode);
    downloadBtn.addEventListener('click', downloadAnnotations);
    
    // Tool selection event listeners
    selectTool.addEventListener('click', () => setActiveTool('select'));
    annotateTool.addEventListener('click', () => setActiveTool('annotate'));
    removeTool.addEventListener('click', () => setActiveTool('remove'));
});
