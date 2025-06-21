export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <html>
      <head><title>Personal Finance Email Reader</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 100px;">
        <h1>Personal Finance Email Reader</h1>
        <p>Read your bank statements and send them to your workflow securely.</p>
        <a href="/api/auth">
          <button style="padding: 1em 2em; font-size: 1.2em; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">Subscribe with Google</button>
        </a>
      </body>
    </html>
  `);
} 