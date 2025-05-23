# Slide Viewer

A modern web application for viewing and annotating SVG slides with advanced features for presentation and collaboration.

See demo at https://lucasjellema.github.io/slide-viewer/ . Elements with a red circle have annotations; hover over them to see the tooltip. Some text elements also have an annotation but are not marked with a red circle.

You can also load a zip file of slides and annotations from a remote URL:
https://lucasjellema.github.io/slide-viewer/?slidesZipUrl=https://raw.githubusercontent.com/lucasjellema/slide-viewer/refs/heads/main/book-print-short-pres.zip

## Features

- Displays SVG slides in numerical order with responsive scaling
- Navigation controls (Previous/Next buttons)
- Keyboard navigation (Left/Right arrow keys)
- Responsive design that adapts to different screen sizes
- Slide counter showing current position
- Collapsible slide navigator with thumbnails and large previews
- Admin mode with annotation capabilities
- Rich text annotations with HTML support
- Interactive tooltips that can be hovered and explored
- Ability to remove/hide objects from slides
- Download annotations as JSON file
- Download complete package (slides + annotations) as a zip file
- Upload slides and annotations from a local zip file
- Persistent annotations via localStorage and file storage
- Dynamic loading of slides and annotations from remote zip files

## Usage

### Basic Usage
1. Place your SVG slides in the `slides` folder
2. Name your slides in the format `Slide##.SVG` where ## is a number
3. Open `index.html` in a web browser to view the slides
4. Hover over annotated elements to see their tooltips

### Admin Mode
1. Add `?admin=yes` to the URL to access admin mode (e.g., `index.html?admin=yes`)
2. Click the "Edit Mode" button to enable editing
3. Click on any SVG element to add an annotation
4. Click and drag annotations to reposition them
5. Click on annotations to edit their content
6. Click the "Download Annotations" button to save all annotations as a JSON file
7. Click the "Download Complete Package" button to download all slides and annotations as a zip file
8. Use the file upload control to upload a zip file containing SVG slides and optional annotations

### Upload and Download Slides

#### Upload Slides from Local Zip File
In admin mode, you can upload a zip file containing SVG slides and optional annotations:

1. Access admin mode by adding `?admin=yes` to the URL
2. Use the file upload control labeled "Upload Slides+Annotations Zip" to select a zip file
3. The application will process the zip file and load the slides and annotations

Requirements for the zip file:
- SVG files must be named in the format `Slide1.SVG`, `Slide2.SVG`, etc.
- Optional annotations file named either `slide-annotations.json` or `annotations.json`

#### Download Complete Package
In admin mode, when in edit mode, you can download all slides and annotations as a complete package:

1. Click the "Download Complete Package" button
2. The application will create a zip file containing all slides and annotations
3. The zip file will be downloaded to your device

### Remote Slides
You can load slides and annotations from a remote zip file using the `slidesZipUrl` parameter:

```
index.html?slidesZipUrl=https://example.com/slides.zip
```

Example with a sample presentation:
```
https://lucasjellema.github.io/slide-viewer/?slidesZipUrl=https://raw.githubusercontent.com/lucasjellema/slide-viewer/refs/heads/main/book-print-short-pres.zip
```

The zip file should contain:
1. SVG files named `Slide1.SVG`, `Slide2.SVG`, etc.
2. Optionally, an annotation file named either `slide-annotations.json` or `annotations.json`

**Note:** When using a remote zip file, local annotations will not be loaded. The application will only use annotations included in the zip file or those created during the current session.

This feature allows you to:
- Host slide content on different servers
- Distribute presentations as single zip files
- Update content dynamically without changing the application
- Share specific slide sets with custom annotations

You can combine parameters (e.g., `index.html?slidesZipUrl=https://example.com/slides.zip&admin=yes`)

## Advanced Annotation Features

- **Rich Text Editor**: Format text with bold, italic, headings, lists, and more
- **HTML Mode**: Toggle to HTML mode to edit raw HTML for advanced formatting
- **Hyperlinks**: Add links that open in new tabs
- **Drag and Drop**: Reposition annotations anywhere on the slide
- **Visual Indicators**: Red circles show which elements have annotations
- **Interactive Tooltips**: Tooltips remain visible when hovered for easier reading

## Slide Navigator Features

- **Collapsible Panel**: Expandable panel showing thumbnails of all slides
- **Simplified Thumbnails**: Compact view of slides with text elements removed for clarity
- **Large Preview on Hover**: Hover over thumbnails to see full slide content at 50% size
- **Isolated Previews**: Each preview is completely isolated to prevent content spillover
- **Active Slide Highlighting**: Current slide is highlighted in the navigator
- **Direct Navigation**: Click any thumbnail to jump directly to that slide

## Technical Details

- Pure JavaScript with JSZip library for zip file operations (loaded dynamically when needed)
- No other external dependencies
- Modular architecture with separate components
- SVG manipulation for indicators and element handling
- Responsive design that works on various devices
- Annotations persist between sessions via localStorage
- Annotations are saved per slide and persist when navigating between slides
- All changes can be downloaded as a JSON file for later use

## File Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styling
- `script.js` - JavaScript for slide navigation, annotation, and admin functionality
- `slides/` - Directory containing SVG slides

## Future Features

- Slideshow (automated navigation)
- Support for click actions on elements: navigate to slide, open URL, show image in modal 
- Add multi-user comment management
- Support for simple animations: elements appearing/disappearing, perhaps moving?
- Support for more advanced animations: transitions, perhaps even custom JavaScript?

