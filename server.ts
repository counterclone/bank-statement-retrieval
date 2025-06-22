import express from 'express';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Serve static homepage
app.use(express.static('public'));

// Auth route
app.get('/api/auth', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// Auth callback
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code as string);
    oAuth2Client.setCredentials(tokens);
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,
      sameSite: 'lax',
    });
    res.send('Authentication successful! You can now <a href="/api/fetch-emails">fetch emails</a>.');
  } catch {
    res.status(500).send('Authentication failed.');
  }
});

// Fetch emails
app.get('/api/fetch-emails', async (req, res) => {
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    res.status(401).send('User not authenticated. Please <a href="/api/auth">login</a>.');
    return;
  }
  let tokens;
  try {
    tokens = JSON.parse(tokenStr);
  } catch {
    res.status(400).send('Invalid token format. Please <a href="/api/auth">login again</a>.');
    return;
  }
  oAuth2Client.setCredentials(tokens);
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
      const msgDetail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      emailData.push({
        id: msg.id,
        snippet: msgDetail.data.snippet,
        payload: msgDetail.data.payload,
      });
    }
    await fetch(process.env.N8N_WEBHOOK_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emailData }),
    });
    res.send('Emails sent to n8n!');
  } catch {
    res.status(500).send('Failed to fetch or send emails.');
  }
});

// Hello route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express TypeScript!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 