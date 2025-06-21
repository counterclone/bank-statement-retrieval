import { google } from 'googleapis';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// In-memory token storage (not persistent)
let userTokens = null;

export default async function handler(req, res) {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    userTokens = tokens;
    res.setHeader('Content-Type', 'text/html');
    res.end('Authentication successful! You can now <a href="/api/fetch-emails">fetch emails</a>.');
  } catch (err) {
    res.statusCode = 500;
    res.end('Authentication failed.');
  }
} 