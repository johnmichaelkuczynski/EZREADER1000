/**
 * Export service using Puppeteer to capture the fully rendered DOM
 * This ensures math formulas render exactly as they appear in the app
 */
import puppeteer from 'puppeteer';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

interface ExportOptions {
  content: string;
  filename: string;
  format: 'pdf' | 'html' | 'png';
  waitForMath?: boolean;
}

/**
 * Export content as PDF using Puppeteer - captures exactly what user sees
 */
export async function exportToPDFWithPuppeteer(options: ExportOptions): Promise<Buffer> {
  const { content, filename, waitForMath = true } = options;
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Create a complete HTML document with MathJax
    const htmlContent = `
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
        
        @media print {
            body {
                margin: 0;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="math-content">
        ${content.replace(/\n/g, '<br>')}
    </div>
    
    <script>
        // Wait for MathJax to finish rendering
        window.addEventListener('load', function() {
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise().then(function() {
                    document.body.setAttribute('data-math-ready', 'true');
                });
            } else {
                document.body.setAttribute('data-math-ready', 'true');
            }
        });
    </script>
</body>
</html>`;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for MathJax to finish rendering if needed
    if (waitForMath) {
        await page.waitForSelector('[data-math-ready="true"]', { timeout: 10000 });
        // Give an extra moment for final rendering
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Export content as HTML with embedded MathJax
 */
export async function exportToHTML(content: string, filename: string): Promise<string> {
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
        ${content.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;
}

/**
 * Export content as LaTeX format
 */
export async function exportToLaTeX(content: string, filename: string): Promise<string> {
  const documentTitle = filename.replace(/\.[^/.]+$/, "");
  
  return `
\\documentclass{article}
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

${content}

\\end{document}`;
}