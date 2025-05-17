# Slide Viewer

A modern web application for viewing and annotating SVG slides with advanced features for presentation and collaboration.

See demo at https://lucasjellema.github.io/slide-viewer/ . Elements with a red circle have annotations; hover over them to see the tooltip. Some text elements also have an annotation but are not marked with a red circle.



## Features

- Displays SVG slides in numerical order with responsive scaling
- Navigation controls (Previous/Next buttons)
- Keyboard navigation (Left/Right arrow keys)
- Responsive design that adapts to different screen sizes
- Slide counter showing current position
- Admin mode with annotation capabilities
- Rich text annotations with HTML support
- Interactive tooltips that can be hovered and explored
- Ability to remove/hide objects from slides
- Download annotations as JSON file
- Persistent annotations via localStorage and file storage

## Usage

### Basic Usage
1. Place your SVG slides in the `slides` folder
2. Name your slides in the format `Slide##.SVG` where ## is a number
3. Open `index.html` in a web browser to view the slides
4. Hover over annotated elements to see their tooltips

### Admin Mode
1. Add `?admin=yes` to the URL to access admin mode (e.g., `index.html?admin=yes`)
2. Click the "Edit Mode" button to enter edit mode
3. Click on any SVG element to add an annotation
4. Click and drag annotations to reposition them
5. Click on annotations to edit their content
6. Click the "Download Annotations" button to save all annotations as a JSON file

## Advanced Annotation Features

- **Rich Text Editor**: Format text with bold, italic, headings, lists, and more
- **HTML Mode**: Toggle to HTML mode to edit raw HTML for advanced formatting
- **Hyperlinks**: Add links that open in new tabs
- **Drag and Drop**: Reposition annotations anywhere on the slide
- **Visual Indicators**: Red circles show which elements have annotations
- **Interactive Tooltips**: Tooltips remain visible when hovered for easier reading

## Technical Details

- Pure JavaScript with no external dependencies
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
