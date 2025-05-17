/**
 * RichTextEditor module
 * Provides a rich text editor for annotations
 */
export class RichTextEditor {
    /**
     * Constructor for RichTextEditor
     */
    constructor() {
        this.modal = null;
        this.editor = null;
        this.htmlEditor = null; // For raw HTML editing
        this.isHtmlMode = false; // Track current editing mode
        this.callback = null;
        this.targetElement = null;
    }
    
    /**
     * Open the rich text editor modal
     * @param {string} initialContent - Initial HTML content
     * @param {Element} targetElement - The target element being annotated
     * @param {Function} callback - Callback function when content is saved
     */
    open(initialContent = '', targetElement = null, callback = null) {
        this.callback = callback;
        this.targetElement = targetElement;
        
        // Create modal if it doesn't exist
        if (!this.modal) {
            this.createModal();
        }
        
        // Set initial content
        this.setContent(initialContent);
        
        // Show the modal
        document.body.appendChild(this.modal);
        
        // Focus the editor
        setTimeout(() => {
            this.editor.focus();
        }, 100);
    }
    
    /**
     * Create the modal and editor
     */
    createModal() {
        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        
        // Create modal container
        const container = document.createElement('div');
        container.className = 'modal-container';
        
        // Create modal header
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Edit Annotation';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.close());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create modal body
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        // Create rich text editor
        const editorContainer = document.createElement('div');
        editorContainer.className = 'rich-text-editor';
        
        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        
        // Add toolbar buttons
        const toolbarButtons = [
            { command: 'bold', icon: 'B', title: 'Bold' },
            { command: 'italic', icon: 'I', title: 'Italic' },
            { command: 'underline', icon: 'U', title: 'Underline' },
            { command: 'formatBlock', value: 'H1', icon: 'H1', title: 'Heading 1' },
            { command: 'formatBlock', value: 'H2', icon: 'H2', title: 'Heading 2' },
            { command: 'formatBlock', value: 'P', icon: '¶', title: 'Paragraph' },
            { command: 'insertOrderedList', icon: '1.', title: 'Numbered List' },
            { command: 'insertUnorderedList', icon: '•', title: 'Bullet List' },
            { command: 'createLink', icon: '🔗', title: 'Insert Link' },
            { command: 'foreColor', value: '#ff0000', icon: 'A', title: 'Text Color' },
            { command: 'insertHTML', value: '<hr>', icon: '―', title: 'Horizontal Line' }
        ];
        
        toolbarButtons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'editor-btn';
            button.textContent = btn.icon;
            button.title = btn.title;
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                // Only execute commands in visual mode
                if (!this.isHtmlMode) {
                    this.execCommand(btn.command, btn.value);
                }
            });
            
            toolbar.appendChild(button);
        });
        
        // Add HTML mode toggle button
        const htmlToggleBtn = document.createElement('button');
        htmlToggleBtn.className = 'editor-btn html-toggle';
        htmlToggleBtn.textContent = '</>';
        htmlToggleBtn.title = 'Toggle HTML Mode';
        htmlToggleBtn.style.marginLeft = 'auto'; // Push to the right
        htmlToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleHtmlMode();
        });
        toolbar.appendChild(htmlToggleBtn);
        
        // Create visual editor (WYSIWYG)
        this.editor = document.createElement('div');
        this.editor.className = 'editor-content';
        this.editor.contentEditable = true;
        
        // Create HTML editor (raw code)
        this.htmlEditor = document.createElement('textarea');
        this.htmlEditor.className = 'editor-html-content';
        this.htmlEditor.style.display = 'none'; // Hidden by default
        this.htmlEditor.style.width = '100%';
        this.htmlEditor.style.height = '200px';
        this.htmlEditor.style.fontFamily = 'monospace';
        this.htmlEditor.style.padding = '10px';
        
        editorContainer.appendChild(toolbar);
        editorContainer.appendChild(this.editor);
        editorContainer.appendChild(this.htmlEditor);
        body.appendChild(editorContainer);
        
        // Create modal footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn modal-btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this.close());
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'modal-btn modal-btn-primary';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', () => this.save());
        
        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
        
        // Assemble modal
        container.appendChild(header);
        container.appendChild(body);
        container.appendChild(footer);
        this.modal.appendChild(container);
        
        // Prevent clicks on the modal from closing it
        container.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close when clicking outside
        this.modal.addEventListener('click', () => {
            this.close();
        });
    }
    
    /**
     * Execute a command on the editor
     * @param {string} command - The command to execute
     * @param {string} value - The value for the command
     */
    execCommand(command, value = null) {
        // Special handling for certain commands
        if (command === 'createLink') {
            const url = prompt('Enter the URL:', 'https://');
            if (url) {
                // Create the link
                document.execCommand(command, false, url);
                
                // Find the newly created link and set target="_blank"
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const links = this.editor.querySelectorAll('a');
                    
                    // Find links that might be in the current selection
                    links.forEach(link => {
                        if (link.href === url || !link.hasAttribute('target')) {
                            link.setAttribute('target', '_blank');
                            console.log('Set target="_blank" for link:', link.href);
                        }
                    });
                }
            }
            return;
        }
        
        // Execute the command
        document.execCommand(command, false, value);
        
        // Focus back on the editor
        this.editor.focus();
    }
    
    /**
     * Set the content of the editor
     * @param {string} content - HTML content
     */
    setContent(content) {
        if (this.isHtmlMode && this.htmlEditor) {
            this.htmlEditor.value = content;
        } else if (this.editor) {
            this.editor.innerHTML = content;
        }
    }
    
    /**
     * Get the content of the editor
     * @returns {string} - HTML content
     */
    getContent() {
        if (this.isHtmlMode && this.htmlEditor) {
            return this.htmlEditor.value;
        } else if (this.editor) {
            return this.editor.innerHTML;
        }
        return '';
    }
    
    /**
     * Save the content and close the modal
     */
    save() {
        const content = this.getContent();
        console.log('RichTextEditor saving content:', content);
        
        // Call the callback with the content
        if (this.callback && typeof this.callback === 'function') {
            console.log('Calling callback with content and target element:', this.targetElement);
            this.callback(content, this.targetElement);
        } else {
            console.warn('No callback provided for rich text editor');
        }
        
        // Close the modal
        this.close();
    }
    
    /**
     * Close the modal
     */
    close() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
    }
    
    /**
     * Toggle between visual and HTML editing modes
     */
    toggleHtmlMode() {
        // Toggle the mode flag
        this.isHtmlMode = !this.isHtmlMode;
        
        // Update the toggle button appearance
        const htmlToggleBtn = this.modal.querySelector('.html-toggle');
        if (htmlToggleBtn) {
            if (this.isHtmlMode) {
                htmlToggleBtn.classList.add('active');
            } else {
                htmlToggleBtn.classList.remove('active');
            }
        }
        
        if (this.isHtmlMode) {
            // Switching to HTML mode
            // Copy content from visual editor to HTML editor
            this.htmlEditor.value = this.editor.innerHTML;
            
            // Show HTML editor, hide visual editor
            this.editor.style.display = 'none';
            this.htmlEditor.style.display = 'block';
            
            // Focus the HTML editor
            this.htmlEditor.focus();
        } else {
            // Switching to visual mode
            // Copy content from HTML editor to visual editor
            this.editor.innerHTML = this.htmlEditor.value;
            
            // Show visual editor, hide HTML editor
            this.htmlEditor.style.display = 'none';
            this.editor.style.display = 'block';
            
            // Focus the visual editor
            this.editor.focus();
        }
        
        console.log(`Switched to ${this.isHtmlMode ? 'HTML' : 'Visual'} editing mode`);
    }
}
