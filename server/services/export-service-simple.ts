/**
 * Simple export service without Puppeteer dependencies
 * Creates clean HTML, LaTeX, and other formats for download
 */
import { preserveMathAndStripMarkdown } from '../utils/markdown-stripper';

/**
 * Export content as HTML with embedded MathJax
 */
export async function exportToHTML(content: string, filename: string): Promise<string> {
  // Strip markdown formatting while preserving math expressions
  const cleanContent = preserveMathAndStripMarkdown(content);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${filename}</title>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['\\\\(', '\\\\)']],
                displayMath: [['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
            }
        };
    </script>
    <style>
        body {
            font-family: 'Georgia', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        
        .math-content {
            font-size: 16px;
        }
        
        mjx-container {
            margin: 0.5em 0;
        }
    </style>
</head>
<body>
    <div class="math-content">
        ${cleanContent.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;
}

/**
 * Export content as LaTeX format
 */
export async function exportToLaTeX(content: string, filename: string): Promise<string> {
  const documentTitle = filename.replace(/\.[^/.]+$/, "");
  // Strip markdown formatting while preserving math expressions
  const cleanContent = preserveMathAndStripMarkdown(content);
  
  return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{${documentTitle}}
\\author{}
\\date{}

\\begin{document}

\\maketitle

${cleanContent}

\\end{document}`;
}