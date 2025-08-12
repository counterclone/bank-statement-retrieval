import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const app = express();
app.use(express.json());
app.use(cookieParser());

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create users directory for storing user profiles
const usersDir = path.join(__dirname, 'users');
if (!fs.existsSync(usersDir)) {
  fs.mkdirSync(usersDir, { recursive: true });
}

// Serve static homepage
app.use(express.static('public'));

// Auth route
app.get('/api/auth', (req: Request, res: Response) => {
  console.log('[API] auth: Initiating Google OAuth flow');
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// Auth callback
app.get('/api/auth/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  console.log('[API] auth-callback: Processing OAuth callback');
  
  try {
    const { tokens } = await oAuth2Client.getToken(code as string);
    oAuth2Client.setCredentials(tokens);
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,
      sameSite: 'lax',
    });
    console.log('[API] auth-callback: Authentication successful');
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
    console.error('[API] auth-callback: Authentication failed:', err instanceof Error ? err.message : String(err));
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

// Add legacy auth callback route for backward compatibility
app.get('/auth/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  console.log('[API] auth-callback: Processing OAuth callback (legacy route)');
  
  try {
    const { tokens } = await oAuth2Client.getToken(code as string);
    oAuth2Client.setCredentials(tokens);
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,
      sameSite: 'lax',
    });
    console.log('[API] auth-callback: Authentication successful (legacy route)');
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
    console.error('[API] auth-callback: Authentication failed (legacy route):', err instanceof Error ? err.message : String(err));
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
            <a href="/" class="home">Return to Home</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Fetch emails and store as JSON
app.post('/api/fetch-emails', async (req: Request, res: Response) => {
  console.log('[API] fetch-emails: Processing request with account data');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] fetch-emails: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  let tokens;
  try {
    tokens = JSON.parse(tokenStr);
  } catch {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid token format. Please login again.' 
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

  oAuth2Client.setCredentials(tokens);
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
      const msgDetail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      
      // Extract email details for better processing
      const emailInfo = {
        id: msg.id,
        snippet: msgDetail.data.snippet,
        from_mail: extractEmailFromHeaders(msgDetail.data.payload?.headers) || null,
        account_details: {
          bankAccount: bankAccount || null,
          creditCard: creditCard ? creditCard.replace(/\s/g, '') : null
        },
        bank_details: extractBankDetails(msgDetail.data.snippet || undefined),
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

// Data shape for user setup endpoint
// POST /api/setup-user
// Request body: { 
//   firstName: string, 
//   lastName: string, 
//   email: string,
//   bankAccounts: [{ accountNumber: string, bankName: string, accountType: string }],
//   creditCards: [{ cardNumber: string, provider: string, cardType: string }],
//   identifiers: { panNumber: string, dateOfBirth: string, phoneNumber: string }
// }
// Response: { success: boolean, message: string, userId: string }

app.post('/api/setup-user', (req: Request, res: Response) => {
  console.log('[API] setup-user: Processing user setup request');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] setup-user: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  const { firstName, lastName, email, bankAccounts, creditCards, identifiers } = req.body;
  
  // Validate required fields
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      success: false,
      error: 'First name, last name, and email are required.'
    });
  }

  try {
    // Create user profile
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userProfile = {
      userId,
      firstName,
      lastName,
      email,
      bankAccounts: bankAccounts || [],
      creditCards: creditCards || [],
      identifiers: identifiers || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save user profile to file
    const userFilePath = path.join(usersDir, `${userId}.json`);
    fs.writeFileSync(userFilePath, JSON.stringify(userProfile, null, 2));
    
    console.log(`[API] setup-user: User profile created for ${email} (ID: ${userId})`);
    
    res.json({
      success: true,
      message: 'User profile created successfully',
      userId: userId,
      profile: userProfile
    });
  } catch (error) {
    console.error('[API] setup-user: Error creating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user profile.'
    });
  }
});

// Data shape for fetch-transactions endpoint
// POST /api/fetch-transactions
// Request body: { userId: string, queryType: 'bank' | 'credit' | 'statements' | 'all' }
// Response: { success: boolean, message: string, filename: string, data: object }

app.post('/api/fetch-transactions', async (req: Request, res: Response) => {
  console.log('[API] fetch-transactions: Processing transaction fetch request');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] fetch-transactions: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  const { userId, queryType = 'all' } = req.body;
  
  // Load user profile
  let userProfile = null;
  try {
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (fs.existsSync(userFilePath)) {
      const userData = fs.readFileSync(userFilePath, 'utf8');
      userProfile = JSON.parse(userData);
      console.log(`[API] fetch-transactions: Loaded profile for ${userProfile.email}`);
    } else {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please set up your profile first.'
      });
    }
  } catch (error) {
    console.error('[API] fetch-transactions: Error loading user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load user profile.'
    });
  }

  let tokens;
  try {
    tokens = JSON.parse(tokenStr);
  } catch {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid token format. Please login again.' 
    });
  }

  oAuth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
  try {
    console.log(`[API] fetch-transactions: Fetching ${queryType} emails from Gmail`);
    
    // Build search queries based on query type
    const searchQueries = buildSearchQueries(queryType, userProfile);
    const allEmails = [];
    
    for (const query of searchQueries) {
      console.log(`[API] fetch-transactions: Searching with query: ${query.search}`);
      
      const result = await gmail.users.messages.list({
        userId: 'me',
        q: query.search,
        maxResults: 20,
      });
      
      const messages = result.data.messages || [];
      console.log(`[API] fetch-transactions: Found ${messages.length} emails for ${query.type}`);
      
      for (const msg of messages) {
        const msgDetail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        
        // Extract email details
        const emailInfo: any = {
          id: msg.id,
          snippet: msgDetail.data.snippet,
          from_mail: extractEmailFromHeaders(msgDetail.data.payload?.headers),
          subject: extractSubjectFromHeaders(msgDetail.data.payload?.headers),
          date: extractDateFromHeaders(msgDetail.data.payload?.headers),
          queryType: query.type,
          userProfile: {
            userId: userProfile.userId,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            email: userProfile.email
          },
          transactionDetails: extractTransactionDetails(msgDetail.data.snippet || undefined, msgDetail.data.payload),
          statementDetails: extractStatementDetails(msgDetail.data.snippet || undefined, msgDetail.data.payload, userProfile),
          timestamp: new Date().toISOString()
        };
        
        // Add account mapping after emailInfo is fully created
        emailInfo.accountMapping = mapAccountToEmail(emailInfo, userProfile);
        
        allEmails.push(emailInfo);
      }
    }
    
    // Create structured data for storage
    const storageData = {
      emails: allEmails.map(email => ({
        email_id: email.id,
        snippet: email.snippet,
        from_mail: email.from_mail,
        subject: email.subject,
        date: email.date,
        queryType: email.queryType,
        userProfile: email.userProfile,
        accountMapping: email.accountMapping,
        transactionDetails: email.transactionDetails,
        statementDetails: email.statementDetails,
        timestamp: email.timestamp,
        processed_at: new Date().toISOString()
      })),
      metadata: {
        total_emails: allEmails.length,
        queryType: queryType,
        userProfile: {
          userId: userProfile.userId,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email
        },
        fetch_date: new Date().toISOString()
      }
    };
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transactions_${queryType}_${timestamp}.json`;
    const filepath = path.join(dataDir, filename);
    
    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(storageData, null, 2));
    console.log(`[API] fetch-transactions: Data saved to ${filename}`);
    
    res.json({ 
      success: true, 
      message: `Successfully fetched ${allEmails.length} emails and saved to ${filename}`,
      filename: filename,
      data: storageData
    });
  } catch (error) {
    console.error('[API] fetch-transactions: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch or save transactions.' 
    });
  }
});

// Get all stored JSON files
app.get('/api/stored-data', (req: Request, res: Response) => {
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
app.get('/api/stored-data/:filename', (req: Request, res: Response) => {
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
function extractEmailFromHeaders(headers: any[] | undefined): string | null {
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
function extractSubjectFromHeaders(headers: any[] | undefined): string | null {
  if (!headers || !Array.isArray(headers)) return null;
  
  const subjectHeader = headers.find(h => h.name === 'Subject');
  return subjectHeader ? subjectHeader.value : null;
}

// Helper function to extract date from headers
function extractDateFromHeaders(headers: any[] | undefined): string | null {
  if (!headers || !Array.isArray(headers)) return null;
  
  const dateHeader = headers.find(h => h.name === 'Date');
  return dateHeader ? dateHeader.value : null;
}

// Helper function to extract bank details from snippet
function extractBankDetails(snippet: string | undefined): any {
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

// Helper function to build search queries
function buildSearchQueries(queryType: string, userProfile: any) {
  const queries = [];
  
  if (queryType === 'all' || queryType === 'bank') {
    // Bank transaction queries
    queries.push({
      type: 'bank_transactions',
      search: 'subject:(transaction OR debit OR credit OR withdrawal OR deposit) AND (from:bank OR from:sbi OR from:hdfc OR from:icici OR from:axis OR from:kotak OR from:pnb OR from:canara OR from:union OR from:central)'
    });
  }
  
  if (queryType === 'all' || queryType === 'credit') {
    // Credit card transaction queries
    queries.push({
      type: 'credit_transactions',
      search: 'subject:(transaction OR payment OR statement OR bill) AND (from:credit OR from:visa OR from:mastercard OR from:amex OR from:rupay OR from:hdfc OR from:icici OR from:axis OR from:kotak OR from:sbi)'
    });
  }
  
  if (queryType === 'all' || queryType === 'statements') {
    // Statement queries
    queries.push({
      type: 'bank_statements',
      search: 'subject:(statement OR summary OR report) AND (from:bank OR from:sbi OR from:hdfc OR from:icici OR from:axis OR from:kotak OR from:pnb OR from:canara OR from:union OR from:central)'
    });
    
    queries.push({
      type: 'credit_statements',
      search: 'subject:(statement OR bill OR summary) AND (from:credit OR from:visa OR from:mastercard OR from:amex OR from:rupay)'
    });
  }
  
  return queries;
}

// Helper function to map account to email
function mapAccountToEmail(emailInfo: any, userProfile: any) {
  const mapping = {
    bankAccount: null,
    creditCard: null,
    confidence: 0
  };
  
  // Extract account numbers from email content
  const content = (emailInfo.snippet || '').toLowerCase();
  
  // Map bank accounts
  for (const account of userProfile.bankAccounts || []) {
    const accountNumber = account.accountNumber.replace(/\s/g, '');
    if (content.includes(accountNumber.slice(-4)) || content.includes(accountNumber.slice(-6))) {
      mapping.bankAccount = account;
      mapping.confidence += 0.5;
    }
  }
  
  // Map credit cards
  for (const card of userProfile.creditCards || []) {
    const cardNumber = card.cardNumber.replace(/\s/g, '');
    if (content.includes(cardNumber.slice(-4))) {
      mapping.creditCard = card;
      mapping.confidence += 0.5;
    }
  }
  
  return mapping;
}

// Helper function to extract transaction details
function extractTransactionDetails(snippet: string | undefined, payload: any) {
  if (!snippet) return null;
  
  const content = snippet.toLowerCase();
  const details: any = {
    type: null,
    amount: null,
    merchant: null,
    date: null,
    location: null,
    keywords: []
  };
  
  // Detect transaction type
  if (content.includes('debit') || content.includes('withdrawal') || content.includes('paid')) {
    details.type = 'debit';
  } else if (content.includes('credit') || content.includes('deposit') || content.includes('received')) {
    details.type = 'credit';
  }
  
  // Extract amount (look for patterns like "Rs. 1000" or "₹1000" or "1000.00")
  const amountMatch = content.match(/(?:rs\.?|₹|inr)\s*([0-9,]+\.?[0-9]*)/i) || 
                     content.match(/([0-9,]+\.?[0-9]*)\s*(?:rs\.?|₹|inr)/i) ||
                     content.match(/([0-9,]+\.?[0-9]*)/);
  if (amountMatch) {
    details.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract merchant/terminal name
  const merchantMatch = content.match(/terminal\s+owner\s+name\s+([^,\n]+)/i) ||
                       content.match(/merchant\s*:\s*([^,\n]+)/i) ||
                       content.match(/at\s+([^,\n]+)/i);
  if (merchantMatch) {
    details.merchant = merchantMatch[1].trim();
  }
  
  // Extract keywords
  const keywords = ['transaction', 'debit', 'credit', 'withdrawal', 'deposit', 'payment', 'atm', 'pos'];
  details.keywords = keywords.filter(keyword => content.includes(keyword));
  
  return details;
}

// Helper function to extract statement details
function extractStatementDetails(snippet: string | undefined, payload: any, userProfile: any) {
  if (!snippet) return null;
  
  const content = snippet.toLowerCase();
  const details: any = {
    statementType: null,
    period: null,
    passwordHint: null,
    identifiers: []
  };
  
  // Detect statement type
  if (content.includes('monthly statement') || content.includes('account statement')) {
    details.statementType = 'monthly';
  } else if (content.includes('quarterly statement')) {
    details.statementType = 'quarterly';
  } else if (content.includes('annual statement')) {
    details.statementType = 'annual';
  }
  
  // Extract period
  const periodMatch = content.match(/(?:for|period|month|quarter|year)\s+([^,\n]+)/i);
  if (periodMatch) {
    details.period = periodMatch[1].trim();
  }
  
  // Extract password hints
  const passwordHints = [
    'password is your pan number',
    'password is your date of birth',
    'password is your phone number',
    'password is your account number',
    'password is your customer id'
  ];
  
  for (const hint of passwordHints) {
    if (content.includes(hint.toLowerCase())) {
      details.passwordHint = hint;
      break;
    }
  }
  
  // Check for identifiers in user profile
  if (userProfile.identifiers) {
    if (userProfile.identifiers.panNumber && content.includes('pan')) {
      details.identifiers.push('panNumber');
    }
    if (userProfile.identifiers.dateOfBirth && content.includes('dob') || content.includes('birth')) {
      details.identifiers.push('dateOfBirth');
    }
    if (userProfile.identifiers.phoneNumber && content.includes('phone') || content.includes('mobile')) {
      details.identifiers.push('phoneNumber');
    }
  }
  
  return details;
}

// Get user profile
app.get('/api/user-profile/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[API] user-profile: Fetching profile for ${userId}`);
  
  try {
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (!fs.existsSync(userFilePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'User profile not found.' 
      });
    }
    
    const fileContent = fs.readFileSync(userFilePath, 'utf8');
    const userProfile = JSON.parse(fileContent);
    
    res.json({ 
      success: true, 
      profile: userProfile 
    });
  } catch (error) {
    console.error(`[API] user-profile: Error reading profile for ${userId}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read user profile.' 
    });
  }
});

// Get all saved user profiles
app.get('/api/user-profiles', (req: Request, res: Response) => {
  console.log('[API] user-profiles: Fetching all saved profiles');
  
  try {
    const files = fs.readdirSync(usersDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(usersDir, file);
        const stats = fs.statSync(filepath);
        const fileContent = fs.readFileSync(filepath, 'utf8');
        const profile = JSON.parse(fileContent);
        
        return {
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          bankAccountsCount: profile.bankAccounts ? profile.bankAccounts.length : 0,
          creditCardsCount: profile.creditCards ? profile.creditCards.length : 0,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    res.json({ 
      success: true, 
      profiles: files 
    });
  } catch (error) {
    console.error('[API] user-profiles: Error reading profiles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read user profiles.' 
    });
  }
});

// Update user profile
app.put('/api/user-profile/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[API] user-profile: Updating profile for ${userId}`);
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] user-profile: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  try {
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (!fs.existsSync(userFilePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'User profile not found.' 
      });
    }
    
    const fileContent = fs.readFileSync(userFilePath, 'utf8');
    const existingProfile = JSON.parse(fileContent);
    
    // Update profile with new data
    const updatedProfile = {
      ...existingProfile,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated profile
    fs.writeFileSync(userFilePath, JSON.stringify(updatedProfile, null, 2));
    
    console.log(`[API] user-profile: Profile updated for ${userId}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error(`[API] user-profile: Error updating profile for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile.'
    });
  }
});

// Delete user profile
app.delete('/api/user-profile/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  console.log(`[API] user-profile: Deleting profile for ${userId}`);
  
  try {
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (!fs.existsSync(userFilePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'User profile not found.' 
      });
    }
    
    fs.unlinkSync(userFilePath);
    
    console.log(`[API] user-profile: Profile deleted for ${userId}`);
    
    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error(`[API] user-profile: Error deleting profile for ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user profile.'
    });
  }
});

// Hello route
app.get('/api/hello', (req: Request, res: Response) => {
  console.log('[API] hello: Test endpoint called');
  res.json({ 
    message: 'Hello! The API is working correctly.',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 