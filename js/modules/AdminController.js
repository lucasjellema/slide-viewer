/**
 * AdminController module
 * Handles admin mode functionality including annotations and element removal
 */
import { AnnotationManager } from './AnnotationManager.js';
import { ElementDetector } from './ElementDetector.js';
import { ElementHandleManager } from './ElementHandleManager.js';
import { ZipLoader } from './ZipLoader.js';

export class AdminController {
    /**
     * Constructor for AdminController
     * @param {Object} config - Configuration object
     */
    constructor(config) {
        // DOM elements
        this.adminControls = config.adminControls;
        this.editBtn = config.editBtn;
        this.downloadBtn = config.downloadBtn;
        this.downloadPackageBtn = document.getElementById('download-package-btn');
        this.uploadControls = document.getElementById('upload-controls');
        this.slideUpload = document.getElementById('slide-upload');
        
        // Dependencies
        this.slideViewer = config.slideViewer;
        
        // State
        this.isEditMode = false;
        this.selectedElement = null;
        
        // Initialize annotation manager
        this.annotationManager = new AnnotationManager(this.slideViewer);
        
        // Initialize element detector
        this.elementDetector = new ElementDetector(this.slideViewer);
        
        // Initialize element handle manager
        this.handleManager = new ElementHandleManager(this.slideViewer);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize JSZip
        this.initJSZip();
    }
    
    /**
     * Check if admin mode is enabled in URL
     */
    checkAdminMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const isAdmin = urlParams.get('admin') === 'yes';
        
        if (isAdmin) {
            this.adminControls.style.display = 'flex';
            this.uploadControls.style.display = 'flex';
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Edit mode toggle
        this.editBtn.addEventListener('click', () => this.toggleEditMode());
        
        // Download annotations
        this.downloadBtn.addEventListener('click', () => this.downloadAnnotations());
        
        // Download complete package (slides + annotations)
        this.downloadPackageBtn.addEventListener('click', () => this.downloadCompletePackage());
        
        // Upload slides zip file
        this.slideUpload.addEventListener('change', (e) => this.handleZipUpload(e));
        
        // Listen for slide changes to update annotations
        this.slideViewer.on('beforeSlideLoad', (e) => {
            if (this.isEditMode) {
                this.annotationManager.saveAnnotationsForSlide(e.detail.currentIndex);
            }
        });
        
        this.slideViewer.on('afterSlideLoad', (e) => {
            // Always apply annotations for tooltip display, regardless of edit mode
            this.annotationManager.applyAnnotationsForSlide(e.detail.currentIndex);
            
            // Only set up SVG element handlers in edit mode
            if (this.isEditMode) {
                this.setupSvgElementHandlers();
            }
        });
    }
    
    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        
        if (this.isEditMode) {
            // Enter edit mode
            this.editBtn.classList.add('active');
            this.editBtn.textContent = 'Exit Edit Mode';
            this.slideViewer.slideDisplay.classList.add('edit-mode');
            this.downloadBtn.style.display = 'block';
            this.downloadPackageBtn.style.display = 'block';
            
            console.log('Entering edit mode');
            
            // Add click handlers to SVG elements
            this.setupSvgElementHandlers();
            
            // Apply any existing annotations (with visual indicators in edit mode)
            this.annotationManager.applyAnnotationsForSlide(this.slideViewer.getCurrentSlideIndex());
        } else {
            // Exit edit mode
            this.editBtn.classList.remove('active');
            this.editBtn.textContent = 'Edit Mode';
            this.slideViewer.slideDisplay.classList.remove('edit-mode');
            this.downloadBtn.style.display = 'none';
            this.downloadPackageBtn.style.display = 'none';
            
            // Save all annotation positions before exiting edit mode
            // This ensures positions are properly saved after dragging
            this.annotationManager.saveAllAnnotationPositions();
            
            // Persist annotations to storage
            this.annotationManager.persistAnnotations();
            
            // Clear all annotations from display
            this.annotationManager.clearAnnotationsFromDisplay();
            
            // Clear any element handles
            this.handleManager.clearHandles();
            
            // Reset any removed elements
            const svgElement = this.slideViewer.getCurrentSvgElement();
            if (svgElement) {
                const removedElements = svgElement.querySelectorAll('.removed');
                removedElements.forEach(el => el.classList.remove('removed'));
            }
            
            // Reset selected element
            this.selectedElement = null;
            
            // Reapply annotations for view mode (tooltips only, no visual indicators)
            // This ensures tooltips are properly initialized for view mode
            this.annotationManager.applyAnnotationsForSlide(this.slideViewer.getCurrentSlideIndex());
            
            console.log('Exited edit mode, tooltips should now be active for annotated elements');
        }
    }
    
    /**
     * Set up SVG element handlers
     */
    setupSvgElementHandlers() {
        const svgElement = this.slideViewer.getCurrentSvgElement();
        if (!svgElement) return;
        
        // Add click handlers to all SVG elements
        const svgChildren = svgElement.querySelectorAll('*');
        svgChildren.forEach(element => {
            element.style.cursor = 'pointer';
        });
        
        // Add click handler to the slide display for object detection
        this.slideViewer.slideDisplay.addEventListener('click', (e) => this.handleContainerClick(e));
        
        // Store a reference to the SVG element globally for element detection
        window.currentSvgElement = svgElement;
        
        console.log('SVG element handlers set up');
    }
    
    /**
     * Handle container click for object detection
     * @param {MouseEvent} e - Click event
     */
    handleContainerClick(e) {
        if (!this.isEditMode) return;
        
        console.log('Container click detected in edit mode');
        
        // Get elements at click position
        const elements = this.elementDetector.findElementsAtPoint(e.clientX, e.clientY);
        
        // Clear any existing handles
        this.handleManager.clearHandles();
        
        // Display the list of elements and show handles
        if (elements.length > 0) {
            // Show handles for all elements at the click position
            this.handleManager.showHandlesForElements(elements);
            
            // Display the list of elements
            this.showElementsList(elements, e.clientX, e.clientY);
        } else {
            console.log('No elements found at click position');
        }
    }
    
    /**
     * Show the list of elements at the click position
     * @param {Array} elements - Array of SVG elements
     * @param {number} clientX - X coordinate of click
     * @param {number} clientY - Y coordinate of click
     */
    showElementsList(elements, clientX, clientY) {
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
            
            // Highlight element on hover by showing a single handle for it
            listItem.addEventListener('mouseover', () => {
                // Clear existing handles and show only this element's handle
                this.handleManager.clearHandles();
                this.handleManager.showHandlesForElements([element], false);
            });
            
            listItem.addEventListener('mouseout', () => {
                // Restore all handles when mouse leaves
                this.handleManager.clearHandles();
                this.handleManager.showHandlesForElements(elements, false);
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
                // Open the rich text editor for this element
                this.annotationManager.openRichTextEditor('', element, (content) => {
                    console.log('Creating annotation from list with content:', content);
                    
                    // Explicitly create the annotation with the content
                    const annotation = this.annotationManager.createAnnotation(content, element);
                    console.log('Created annotation:', annotation);
                    
                    // After saving, clear handles
                    this.handleManager.clearHandles();
                });
                
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
                this.handleManager.clearHandles();
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
            this.handleManager.clearHandles();
        });
        
        listContainer.appendChild(list);
        listContainer.appendChild(closeBtn);
        
        // Add the list to the document
        document.body.appendChild(listContainer);
        
        // Prevent immediate closing due to the same click event
        setTimeout(() => {
            // Close the list when clicking outside
            const closeListHandler = (e) => {
                if (!listContainer.contains(e.target) && e.target !== listContainer) {
                    listContainer.remove();
                    this.handleManager.clearHandles();
                    document.removeEventListener('click', closeListHandler);
                }
            };
            
            document.addEventListener('click', closeListHandler);
        }, 100);
        
        console.log('Elements list displayed');
    }
    
    // setActiveTool method has been removed
    
    /**
     * Download annotations as JSON
     */
    downloadAnnotations() {
        // First make sure we save any current annotations
        const currentSlideIndex = this.slideViewer.getCurrentSlideIndex();
        this.annotationManager.saveRemovedElements(currentSlideIndex);
        
        // Get all annotations from the annotation manager
        const annotations = this.annotationManager.getAllAnnotations();
        
        // Log the annotations for debugging
        console.log('Annotations to download:', annotations);
        
        // Count the total number of annotations
        let totalAnnotations = 0;
        for (const key in annotations) {
            if (annotations[key] && Array.isArray(annotations[key])) {
                totalAnnotations += annotations[key].length;
            }
        }
        
        if (totalAnnotations === 0) {
            alert('No annotations to download. Please create some annotations first.');
            return;
        }
        
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
        

        
        console.log(`Downloaded ${totalAnnotations} annotations`);
    }
    
    /**
     * Initialize JSZip library
     */
    initJSZip() {
        return new Promise((resolve, reject) => {
            if (typeof JSZip === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
                script.crossOrigin = 'anonymous';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Handle upload of a zip file containing slides and annotations
     * @param {Event} e - File input change event
     */
    async handleZipUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
            alert('Please upload a valid ZIP file');
            return;
        }
        
        try {
            // Show loading message
            this.slideViewer.slideDisplay.innerHTML = '<div class="loading">Loading slides from uploaded zip file...</div>';
            
            // Make sure JSZip is loaded
            if (typeof JSZip === 'undefined') {
                await this.initJSZip();
            }
            
            // Read the zip file
            const zipData = await this.readFileAsArrayBuffer(file);
            const zip = await JSZip.loadAsync(zipData);
            
            // Create a ZipLoader instance and process the zip contents
            const zipLoader = new ZipLoader();
            await zipLoader.processZipContents(zip);
            
            if (zipLoader.getTotalSlides() === 0) {
                this.slideViewer.slideDisplay.innerHTML = '<div class="error">No SVG slides found in the zip file. Make sure slides are named as Slide1.SVG, Slide2.SVG, etc.</div>';
                return;
            }
            
            // Initialize the application with the loaded zip content
            this.slideViewer.zipLoader = zipLoader;
            this.slideViewer.totalSlides = zipLoader.getTotalSlides();
            this.annotationManager.zipLoader = zipLoader;
            
            // Load annotations from the zip file if available
            const annotations = zipLoader.getAnnotations();
            if (annotations) {
                // Directly set the annotations property
                this.annotationManager.annotations = annotations;
                console.log('Loaded annotations from uploaded zip file');
            }
            
            // Reset the file input to allow re-uploading the same file
            this.slideUpload.value = '';
            
            // Load the first slide
            this.slideViewer.loadSlide(1);
            
            console.log(`Successfully loaded ${zipLoader.getTotalSlides()} slides from zip file`);
        } catch (error) {
            console.error('Error processing zip file:', error);
            this.slideViewer.slideDisplay.innerHTML = '<div class="error">Failed to process the uploaded zip file. See console for details.</div>';
        }
    }
    
    /**
     * Read a file as an ArrayBuffer
     * @param {File} file - The file to read
     * @returns {Promise<ArrayBuffer>} - Promise that resolves to the file contents as ArrayBuffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Download a complete package containing all slides and annotations
     */
    async downloadCompletePackage() {
        try {
            // First make sure we save any current annotations
            const currentSlideIndex = this.slideViewer.getCurrentSlideIndex();
            this.annotationManager.saveRemovedElements(currentSlideIndex);
            
            // Get all annotations from the annotation manager
            const annotations = this.annotationManager.getAllAnnotations();
            
            // Create a new JSZip instance
            if (typeof JSZip === 'undefined') {
                await this.initJSZip();
            }
            const zip = new JSZip();
            
            // Add the annotations to the zip file
            const annotationsJson = JSON.stringify(annotations, null, 2);
            zip.file('slide-annotations.json', annotationsJson);
            
            // Add all slides to the zip file
            await this.addSlidesToZip(zip);
            
            // Generate the zip file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Create a download link
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'slides-package.zip';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
            
            console.log('Downloaded complete package with slides and annotations');
        } catch (error) {
            console.error('Error creating package for download:', error);
            alert('Error creating package for download. See console for details.');
        }
    }
    
    /**
     * Add slides to a zip file
     * @param {JSZip} zip - The JSZip instance to add slides to
     */
    async addSlidesToZip(zip) {
        const totalSlides = this.slideViewer.totalSlides;
        const promises = [];
        
        for (let i = 1; i <= totalSlides; i++) {
            // If using zipLoader, get slides from there
            if (this.slideViewer.zipLoader) {
                const slideContent = this.slideViewer.zipLoader.getSlide(i);
                if (slideContent) {
                    zip.file(`Slide${i}.SVG`, slideContent);
                    continue;
                }
            }
            
            // Otherwise fetch slides from the server
            promises.push(
                fetch(`slides/Slide${i}.SVG`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch Slide${i}.SVG`);
                        }
                        return response.text();
                    })
                    .then(content => {
                        zip.file(`Slide${i}.SVG`, content);
                    })
                    .catch(error => {
                        console.error(`Error adding Slide${i}.SVG to package:`, error);
                    })
            );
        }
        
        await Promise.all(promises);
    }
    
    /**
     * Save annotations to a file in the slides folder
     * @param {string} annotationsJson - The JSON string to save
     */
    saveAnnotationsToFile(annotationsJson) {
        // This function was keeping a placeholder for server-side implementation
        // Removed server-side related code and using client-side file APIs instead
        try {
            const formData = new FormData();
            const blob = new Blob([annotationsJson], { type: 'application/json' });
            formData.append('file', blob, 'slide-annotations.json');
            
            
            console.log('Annotations prepared for saving to file');
            
            // Note: In a real application with a backend server, you would use:
            // fetch('/save-annotations', {
            //     method: 'POST',
            //     body: formData
            // })
            // .then(response => response.json())
            // .then(data => {
            //     console.log('Annotations saved to file:', data);
            //     alert('Annotations saved successfully to slides folder!');
            // })
            // .catch(error => {
            //     console.error('Error saving annotations to file:', error);
            //     alert('Failed to save annotations to slides folder. Please save the file manually.');
            // });
        } catch (e) {
            console.error('Error preparing annotations for file save:', e);
            alert('Failed to prepare annotations for saving. Please save the file manually.');
        }
    }
}
