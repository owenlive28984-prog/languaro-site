# Languaro Waitlist Page

A modern, minimal waitlist landing page for Languaro - Universal translation for your desktop.

## Features

- **Dark Mode First**: Grayscale-only design inspired by the Languaro app UI
- **No Scrolling**: Single-page design that fits perfectly on screen
- **Responsive**: Adapts beautifully to mobile, tablet, and desktop
- **Modern UI**: Clean, containerless design with subtle animations
- **Form Validation**: Real-time email validation with loading states
- **Accessibility**: Semantic HTML, ARIA labels, and keyboard shortcuts

## Design Principles

### Grayscale Theme
- Background: Radial gradient from `#1a1a1a` to `#0d0d0d`
- Text: `#e6e6e6` (primary), `#bfbfbf` (secondary), `#999999` (tertiary)
- Borders: Subtle white opacity overlays
- No colors except grayscale

### Inspired by Languaro UI
- Dark background with high opacity (95%+)
- Minimal containers - let content breathe
- Subtle hover states with `rgba(255, 255, 255, 0.05)`
- Modern scrollbars (minimal, no arrows)
- Clean typography with Inter font

## File Structure

```
languaro-waitlist/
├── index.html          # Main HTML structure
├── styles.css          # Dark mode grayscale styling
├── script.js           # Form handling and interactions
├── logo.png            # Languaro logo (copied from project)
└── README.md           # This file
```

## Quick Start

### Option 1: Direct File Opening
Simply open `index.html` in any modern web browser.

### Option 2: Local Web Server (Recommended)

**Using Python:**
```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

**Using Node.js:**
```bash
npx serve .

# Or with http-server
npx http-server -p 8000
```

**Using PHP:**
```bash
php -S localhost:8000
```

## Features Breakdown

### Hero Section
- Languaro logo with floating animation
- Clear value proposition
- Tagline: "Universal translation for your desktop"

### Preview Placeholder
- 16:9 aspect ratio placeholder for software GIF
- Simply replace the `.preview-placeholder` content with:
  ```html
  <img src="your-demo.gif" alt="Languaro in action" style="width: 100%; border-radius: 16px;" />
  ```

### Features Grid
- 6 key features in responsive grid
- Icon + Title + Description format
- Subtle hover animations
- Features:
  1. Instant Translation (double-tap Ctrl)
  2. Multi-Language Support (Chinese, Japanese, Korean, Spanish, Arabic)
  3. Works Everywhere (Discord, PDFs, games, browsers)
  4. Offline Capable
  5. Advanced Breakdown (word-by-word analysis)
  6. Privacy First

### Waitlist Form
- Email input with validation
- Submit button with loading state
- Success/error messages
- Platform badges (Windows/macOS)
- Stores emails in localStorage (for demo)

## Customization

### Adding Your Backend

Replace the `simulateAPICall` function in `script.js`:

```javascript
async function submitToBackend(email) {
    const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
        throw new Error('Failed to submit');
    }
    
    return response.json();
}
```

### Adding Demo GIF

In `index.html`, replace the `.preview-placeholder` div:

```html
<div class="preview-container">
    <img 
        src="demo.gif" 
        alt="Languaro software demonstration" 
        style="width: 100%; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.15);"
    />
</div>
```

### Changing Colors

All colors are defined in CSS variables in `styles.css`:

```css
:root {
    --bg-primary: #0d0d0d;      /* Main background */
    --text-primary: #e6e6e6;    /* Main text */
    /* ... etc */
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **No external dependencies** (except Google Fonts)
- **Minimal JavaScript** (~5KB)
- **Optimized CSS** (~8KB)
- **Fast load time** (<500ms)

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Focus email input

## Analytics Integration

To add analytics, add this before `</body>` in `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'YOUR_GA_ID');
</script>
```

## Deployment

### Netlify
1. Drag and drop the folder to Netlify
2. Done!

### Vercel
```bash
vercel --prod
```

### GitHub Pages
1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Select `main` branch

### Custom Server
Upload all files to your web server's public directory.

## License

This waitlist page is part of the Languaro project.

## Support

For questions or issues, contact: hello@languaro.com

---

**Built with ❤️ for Languaro**
