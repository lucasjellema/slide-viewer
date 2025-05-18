/**
 * ZipLoader module
 * Handles downloading and extracting zip files containing slides and annotations
 */
export class ZipLoader {
    /**
     * Constructor for ZipLoader
     */
    constructor() {
        this.zipContent = null;
        this.slides = new Map();
        this.annotations = null;
    }

    /**
     * Download and extract a zip file
     * @param {string} url - URL of the zip file to download
     * @returns {Promise<boolean>} - Promise that resolves to true if successful
     */
    async downloadAndExtract(url) {
        try {
            console.log(`Downloading zip file from ${url}...`);
            
            // Fetch the zip file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download zip file: ${response.statusText}`);
            }
            
            // Get the zip file as an array buffer
            const zipData = await response.arrayBuffer();
            
            // Load JSZip dynamically
            if (typeof JSZip === 'undefined') {
                await this.loadJSZip();
            }
            
            // Extract the zip file
            console.log('Extracting zip file...');
            const zip = await JSZip.loadAsync(zipData);
            this.zipContent = zip;
            
            // Process the zip contents
            await this.processZipContents(zip);
            
            console.log('Zip file processed successfully');
            return true;
        } catch (error) {
            console.error('Error downloading or extracting zip file:', error);
            return false;
        }
    }
    
    /**
     * Load JSZip library dynamically
     * @returns {Promise<void>}
     */
    loadJSZip() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Process the contents of the zip file
     * @param {JSZip} zip - The JSZip object
     * @returns {Promise<void>}
     */
    async processZipContents(zip) {
        const filePromises = [];
        
        // Iterate through all files in the zip
        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return; // Skip directories
            
            const fileName = relativePath.split('/').pop().toLowerCase();
            
            // Check if this is an SVG file
            if (fileName.endsWith('.svg')) {
                // Extract slide number from filename (e.g., "slide1.svg" -> 1)
                const slideMatch = fileName.match(/slide(\d+)\.svg/i);
                if (slideMatch && slideMatch[1]) {
                    const slideNumber = parseInt(slideMatch[1], 10);
                    
                    // Add to processing queue
                    filePromises.push(
                        zipEntry.async('text').then(content => {
                            this.slides.set(slideNumber, content);
                            console.log(`Processed slide ${slideNumber}`);
                        })
                    );
                }
            }
            // Check if this is an annotations file
            else if (fileName === 'slide-annotations.json' || fileName === 'annotations.json') {
                filePromises.push(
                    zipEntry.async('text').then(content => {
                        try {
                            this.annotations = JSON.parse(content);
                            console.log('Processed annotations file');
                        } catch (e) {
                            console.error('Error parsing annotations file:', e);
                        }
                    })
                );
            }
        });
        
        // Wait for all files to be processed
        await Promise.all(filePromises);
        
        // Log summary
        console.log(`Processed ${this.slides.size} slides and ${this.annotations ? 1 : 0} annotations file`);
    }
    
    /**
     * Get a slide by index
     * @param {number} index - The slide index
     * @returns {string|null} - The slide content or null if not found
     */
    getSlide(index) {
        return this.slides.get(index) || null;
    }
    
    /**
     * Get the annotations
     * @returns {Object|null} - The annotations object or null if not found
     */
    getAnnotations() {
        return this.annotations;
    }
    
    /**
     * Get the total number of slides
     * @returns {number} - The total number of slides
     */
    getTotalSlides() {
        return this.slides.size;
    }
}
