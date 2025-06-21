import { google } from 'googleapis';
import fetch from 'node-fetch';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// In-memory token storage (not persistent)
let userTokens = null;

export default async function handler(req, res) {
  if (!userTokens) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'text/html');
    res.end('User not authenticated. Please <a href="/api/auth">login</a>.');
    return;
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
    res.setHeader('Content-Type', 'text/html');
    res.end('Emails sent to n8n!');
  } catch (err) {
    res.statusCode = 500;
    res.end('Failed to fetch or send emails.');
  }
} 