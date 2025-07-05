import { useEffect, useState } from "react";

export default function EmbedDebug() {
  const [headerTest, setHeaderTest] = useState<string>('Testing headers...');
  const [iframeStatus, setIframeStatus] = useState<string>('Loading iframe...');
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    setCurrentUrl(window.location.origin);
    
    // Test headers
    fetch('/')
      .then(response => {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        
        let headerStatus = '<div style="color: green; font-weight: bold;">✅ Headers look good!</div>';
        headerStatus += '<pre>' + JSON.stringify(headers, null, 2) + '</pre>';
        
        // Check critical headers
        if (!headers['content-security-policy'] || !headers['content-security-policy'].includes('frame-ancestors *')) {
          headerStatus += '<div style="color: red; font-weight: bold;">❌ Missing frame-ancestors header</div>';
        }
        if (headers['x-frame-options']) {
          headerStatus += '<div style="color: orange; font-weight: bold;">⚠️ X-Frame-Options header present: ' + headers['x-frame-options'] + '</div>';
        }
        
        setHeaderTest(headerStatus);
      })
      .catch(error => {
        setHeaderTest('<div style="color: red; font-weight: bold;">❌ Header test failed: ' + error.message + '</div>');
      });
  }, []);

  const handleIframeLoad = () => {
    setIframeStatus('<div style="color: green; font-weight: bold;">✅ Iframe loaded successfully!</div>');
  };

  const handleIframeError = () => {
    setIframeStatus('<div style="color: red; font-weight: bold;">❌ Iframe failed to load</div>');
  };

  const wixCode = `<iframe src="${currentUrl}/"
        width="100%" 
        height="600"
        style="border: none; border-radius: 8px; display: block;"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-modals"
        allow="camera; microphone; clipboard-write; clipboard-read"
        loading="lazy">
    <p>Your browser doesn't support iframes.</p>
</iframe>`;

  return (
    <div style={{ margin: 0, padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f0f0f0' }}>
      <h1>🔧 Wix Embedding Debug Tool</h1>
      
      <div style={{ background: 'white', padding: '20px', margin: '10px 0', borderRadius: '8px', border: '2px solid #ddd' }}>
        <h2>Server Headers Test</h2>
        <div dangerouslySetInnerHTML={{ __html: headerTest }} />
      </div>

      <div style={{ background: 'white', padding: '20px', margin: '10px 0', borderRadius: '8px', border: '2px solid #ddd' }}>
        <h2>Iframe Embedding Test</h2>
        <div style={{ width: '100%', height: '600px', border: '3px solid #007bff', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe 
            src="/" 
            width="100%" 
            height="100%" 
            style={{ border: 'none' }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-modals"
            allow="camera; microphone; clipboard-write; clipboard-read"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
        <div style={{ marginTop: '20px' }}>
          <div dangerouslySetInnerHTML={{ __html: iframeStatus }} />
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', margin: '10px 0', borderRadius: '8px', border: '2px solid #ddd' }}>
        <h2>Wix Embedding Code</h2>
        <p>Copy this exact code into your Wix HTML embed:</p>
        <pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
          {wixCode}
        </pre>
        <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
          ⚠️ IMPORTANT: You must use your deployed .replit.app URL, not localhost!
        </p>
      </div>
    </div>
  );
}