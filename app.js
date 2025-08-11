const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();
app.use(bodyParser.json());

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Serve static files from public directory
app.use(express.static('public'));

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// In-memory token storage for demo (replace with DB/session in production)
let userTokens = null;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Data shape for auth endpoint
// GET /api/auth
// Response: Redirects to Google OAuth

app.get('/api/auth', (req, res) => {
  console.log('[API] auth: Initiating Google OAuth flow');
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// Keep the original auth route for backward compatibility
app.get('/auth', (req, res) => {
  console.log('[API] auth: Redirecting to /api/auth');
  res.redirect('/api/auth');
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  console.log('[API] auth-callback: Processing OAuth callback');
  
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    userTokens = tokens;
    console.log('[API] auth-callback: Authentication successful');
    
    // Return a better success page with redirect
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin-top: 10%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 500px; margin: 0 auto; }
            .btn { background: white; color: #667eea; padding: 15px 30px; border: none; border-radius: 10px; text-decoration: none; display: inline-block; margin: 10px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <p>You can now fetch your bank statement emails.</p>
            <a href="/" class="btn">Return to Home</a>
            <script>
              setTimeout(() => window.location.href = '/', 3000);
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[API] auth-callback: Authentication failed:', err.message);
    res.status(500).send(`
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin-top: 10%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
            .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 500px; margin: 0 auto; }
            .btn { background: white; color: #f5576c; padding: 15px 30px; border: none; border-radius: 10px; text-decoration: none; display: inline-block; margin: 10px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Authentication Failed</h1>
            <p>Please try again.</p>
            <a href="/" class="btn">Return to Home</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Data shape for fetch-emails endpoint
// POST /api/fetch-emails
// Request body: { bankAccount?: string, creditCard?: string }
// Response: { success: boolean, message: string, filename: string, data: object }

app.post('/api/fetch-emails', async (req, res) => {
  console.log('[API] fetch-emails: Processing request with account data');
  
  if (!userTokens) {
    console.log('[API] fetch-emails: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  const { bankAccount, creditCard } = req.body;
  
  // Log account information (masked for security)
  if (bankAccount) {
    const maskedBank = bankAccount.replace(/\d(?=\d{4})/g, '*');
    console.log(`[API] fetch-emails: Bank account provided: ${maskedBank}`);
  }
  if (creditCard) {
    const maskedCard = creditCard.replace(/\d(?=\d{4})/g, '*');
    console.log(`[API] fetch-emails: Credit card provided: ${maskedCard}`);
  }

  oAuth2Client.setCredentials(userTokens);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
  try {
    console.log('[API] fetch-emails: Fetching emails from Gmail');
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:statement OR subject:bank',
      maxResults: 10,
    });
    
    const messages = result.data.messages || [];
    console.log(`[API] fetch-emails: Found ${messages.length} emails`);
    
    const emailData = [];
    for (const msg of messages) {
      const msgDetail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      
      // Extract email details for better processing
      const emailInfo = {
        id: msg.id,
        snippet: msgDetail.data.snippet,
        from_mail: extractEmailFromHeaders(msgDetail.data.payload?.headers),
        account_details: {
          bankAccount: bankAccount || null,
          creditCard: creditCard ? creditCard.replace(/\s/g, '') : null
        },
        bank_details: extractBankDetails(msgDetail.data.snippet),
        timestamp: new Date().toISOString(),
        subject: extractSubjectFromHeaders(msgDetail.data.payload?.headers),
        date: extractDateFromHeaders(msgDetail.data.payload?.headers)
      };
      
      emailData.push(emailInfo);
    }
    
    // Create structured data for storage
    const storageData = {
      emails: emailData.map(email => ({
        email_id: email.id,
        snippet: email.snippet,
        from_mail: email.from_mail,
        subject: email.subject,
        date: email.date,
        account_details: email.account_details,
        bank_details: email.bank_details,
        timestamp: email.timestamp,
        processed_at: new Date().toISOString()
      })),
      metadata: {
        total_emails: emailData.length,
        account_info: {
          bankAccount: bankAccount || null,
          creditCard: creditCard ? creditCard.replace(/\s/g, '') : null,
          timestamp: new Date().toISOString()
        },
        fetch_date: new Date().toISOString()
      }
    };
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bank_emails_${timestamp}.json`;
    const filepath = path.join(dataDir, filename);
    
    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(storageData, null, 2));
    console.log(`[API] fetch-emails: Data saved to ${filename}`);
    
    res.json({ 
      success: true, 
      message: `Successfully fetched ${emailData.length} emails and saved to ${filename}`,
      filename: filename,
      data: storageData
    });
  } catch (error) {
    console.error('[API] fetch-emails: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch or save emails.' 
    });
  }
});

// Get all stored JSON files
app.get('/api/stored-data', (req, res) => {
  console.log('[API] stored-data: Fetching list of stored files');
  
  try {
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(dataDir, file);
        const stats = fs.statSync(filepath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    res.json({ 
      success: true, 
      files: files 
    });
  } catch (error) {
    console.error('[API] stored-data: Error reading files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read stored data files.' 
    });
  }
});

// Get specific JSON file content
app.get('/api/stored-data/:filename', (req, res) => {
  const { filename } = req.params;
  console.log(`[API] stored-data: Fetching content of ${filename}`);
  
  try {
    const filepath = path.join(dataDir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found.' 
      });
    }
    
    const fileContent = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(fileContent);
    
    res.json({ 
      success: true, 
      data: data 
    });
  } catch (error) {
    console.error(`[API] stored-data: Error reading ${filename}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read file content.' 
    });
  }
});

// Helper function to extract email from headers
function extractEmailFromHeaders(headers) {
  if (!headers || !Array.isArray(headers)) return null;
  
  const fromHeader = headers.find(h => h.name === 'From');
  if (fromHeader) {
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.value.match(/<(.+?)>/);
    return emailMatch ? emailMatch[1] : fromHeader.value;
  }
  return null;
}

// Helper function to extract subject from headers
function extractSubjectFromHeaders(headers) {
  if (!headers || !Array.isArray(headers)) return null;
  
  const subjectHeader = headers.find(h => h.name === 'Subject');
  return subjectHeader ? subjectHeader.value : null;
}

// Helper function to extract date from headers
function extractDateFromHeaders(headers) {
  if (!headers || !Array.isArray(headers)) return null;
  
  const dateHeader = headers.find(h => h.name === 'Date');
  return dateHeader ? dateHeader.value : null;
}

// Helper function to extract bank details from snippet
function extractBankDetails(snippet) {
  if (!snippet) return null;
  
  // Common bank keywords to look for
  const bankKeywords = ['balance', 'account', 'statement', 'transaction', 'deposit', 'withdrawal', 'credit', 'debit'];
  const foundKeywords = bankKeywords.filter(keyword => 
    snippet.toLowerCase().includes(keyword)
  );
  
  return foundKeywords.length > 0 ? {
    detected_keywords: foundKeywords,
    text_length: snippet.length
  } : null;
}

// Data shape for hello endpoint
// GET /api/hello
// Response: { message: string }

app.get('/api/hello', (req, res) => {
  console.log('[API] hello: Test endpoint called');
  res.json({ 
    message: 'Hello! The API is working correctly.',
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => console.log('Server started on http://localhost:3000')); 