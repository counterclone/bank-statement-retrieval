const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const app = express();
app.use(bodyParser.json());

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// In-memory token storage for demo (replace with DB/session in production)
let userTokens = null;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Personal Finance Email Reader</title></head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 100px;">
        <h1>Personal Finance Email Reader</h1>
        <p>Read your bank statements and send them to your workflow securely.</p>
        <a href="/auth">
          <button style="padding: 1em 2em; font-size: 1.2em; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">Subscribe with Google</button>
        </a>
      </body>
    </html>
  `);
});

app.get('/auth', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    userTokens = tokens;
    res.send('Authentication successful! You can now <a href="/fetch-emails">fetch emails</a>.');
  } catch (err) {
    res.status(500).send('Authentication failed.');
  }
});

app.get('/fetch-emails', async (req, res) => {
  if (!userTokens) {
    return res.status(401).send('User not authenticated. Please <a href="/auth">login</a>.');
  }
  oAuth2Client.setCredentials(userTokens);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  try {
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:statement OR subject:bank',
      maxResults: 5,
    });
    const messages = result.data.messages || [];
    const emailData = [];
    for (const msg of messages) {
      const msgDetail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      emailData.push({
        id: msg.id,
        snippet: msgDetail.data.snippet,
        payload: msgDetail.data.payload,
      });
    }
    // Send to n8n webhook
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emailData }),
    });
    res.send('Emails sent to n8n!');
  } catch (err) {
    res.status(500).send('Failed to fetch or send emails.');
  }
});

app.listen(3000, () => console.log('Server started on http://localhost:3000')); 