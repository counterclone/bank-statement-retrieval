import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// Create transactions hub directory
const transactionsHubDir = path.join(__dirname, 'transactions_hub');
if (!fs.existsSync(transactionsHubDir)) {
  fs.mkdirSync(transactionsHubDir, { recursive: true });
}

// Create PDF attachments directory
const pdfAttachmentsDir = path.join(__dirname, 'pdf_attachments');
if (!fs.existsSync(pdfAttachmentsDir)) {
  fs.mkdirSync(pdfAttachmentsDir, { recursive: true });
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

// Enhanced fetch emails with split modules and date filtering
app.post('/api/fetch-emails-enhanced', async (req: Request, res: Response) => {
  console.log('[API] fetch-emails-enhanced: Processing enhanced email fetch request');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] fetch-emails-enhanced: User not authenticated');
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

  const { maxEmails, fromDate, toDate, emailType = 'both' } = req.body;
  
  // Determine fetch method and parameters
  const fetchMethod = maxEmails ? 'count' : 'date';
  const effectiveMaxEmails = maxEmails || 50; // Default to 50 if not provided
  
  console.log(`[API] fetch-emails-enhanced: Fetching ${emailType} emails using ${fetchMethod} method`);
  if (fetchMethod === 'count') {
    console.log(`[API] fetch-emails-enhanced: Max emails: ${effectiveMaxEmails}`);
  } else {
    console.log(`[API] fetch-emails-enhanced: From date: ${fromDate}, To date: ${toDate}`);
  }

  oAuth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  
  try {
    const allEmails = [];
    
    // Build search queries based on email type
    const searchQueries = buildEnhancedSearchQueries(emailType, fromDate, toDate);
    
    for (const query of searchQueries) {
      console.log(`[API] fetch-emails-enhanced: Searching with query: ${query.search}`);
      
      const result = await gmail.users.messages.list({
        userId: 'me',
        q: query.search,
        maxResults: Math.min(effectiveMaxEmails, 100), // Gmail API limit
      });
      
      const messages = result.data.messages || [];
      console.log(`[API] fetch-emails-enhanced: Found ${messages.length} emails for ${query.type}`);
      
      for (const msg of messages) {
        const msgDetail = await gmail.users.messages.get({ 
          userId: 'me', 
          id: msg.id!,
          format: 'full' // Get full message content including attachments
        });
        
        // Extract full email body content
        const fullEmailBody = extractFullEmailBody(msgDetail.data.payload);
        
        // Extract email details
        const emailInfo: any = {
          id: msg.id,
          snippet: msgDetail.data.snippet,
          fullBody: fullEmailBody, // Add full email body for password hint detection
          from_mail: extractEmailFromHeaders(msgDetail.data.payload?.headers),
          subject: extractSubjectFromHeaders(msgDetail.data.payload?.headers),
          date: extractDateFromHeaders(msgDetail.data.payload?.headers),
          emailType: query.type,
          transactionDetails: extractEnhancedTransactionDetails(msgDetail.data.snippet || undefined, msgDetail.data.payload),
          statementDetails: extractEnhancedStatementDetails(msgDetail.data.snippet || undefined, msgDetail.data.payload),
          pdfAttachments: extractPDFAttachments(msgDetail.data.payload),
          timestamp: new Date().toISOString()
        };
        
        // Download and store PDF attachments if any
        if (emailInfo.pdfAttachments && emailInfo.pdfAttachments.length > 0) {
          console.log(`[API] fetch-emails-enhanced: Found ${emailInfo.pdfAttachments.length} PDF attachments in email ${msg.id}`);
          
          const downloadedPDFs = [];
          for (const pdfAttachment of emailInfo.pdfAttachments) {
            const downloadedPDF = await downloadAndStorePDF(gmail, pdfAttachment.attachmentId, msg.id!, pdfAttachment.filename);
            if (downloadedPDF) {
              downloadedPDFs.push(downloadedPDF);
            }
          }
          
          // Update emailInfo with downloaded PDF details
          emailInfo.pdfAttachments = downloadedPDFs;
        }
        
        allEmails.push(emailInfo);
      }
    }
    
    // Create structured data for storage
    const storageData = {
      emails: allEmails.map(email => ({
        email_id: email.id,
        snippet: email.snippet,
        fullBody: email.fullBody, // Include full email body for password hint detection
        from_mail: email.from_mail,
        subject: email.subject,
        date: email.date,
        emailType: email.emailType,
        transactionDetails: email.transactionDetails,
        statementDetails: email.statementDetails,
        pdfAttachments: email.pdfAttachments,
        timestamp: email.timestamp,
        processed_at: new Date().toISOString()
      })),
      metadata: {
        total_emails: allEmails.length,
        emailType: emailType,
        fetchMethod: fetchMethod,
        maxEmails: effectiveMaxEmails,
        fromDate: fromDate,
        toDate: toDate,
        fetch_date: new Date().toISOString()
      }
    };
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced_emails_${emailType}_${timestamp}.json`;
    const filepath = path.join(dataDir, filename);
    
    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(storageData, null, 2));
    console.log(`[API] fetch-emails-enhanced: Data saved to ${filename}`);
    
    // Automatically process with Gemini AI
    console.log(`[API] fetch-emails-enhanced: Automatically processing ${allEmails.length} emails with Gemini AI`);
    let geminiData = null;
    let geminiFilename = null;
    
    try {
      // Load user profile for Gemini processing
      const { userId } = req.body;
      if (userId) {
        const userFilePath = path.join(usersDir, `${userId}.json`);
        if (fs.existsSync(userFilePath)) {
          const userData = fs.readFileSync(userFilePath, 'utf8');
          const userProfile = JSON.parse(userData);
          
          // Process emails with Gemini AI
          let processedTransactions = [];
          let geminiProcessingSuccess = true;
          
          try {
            processedTransactions = await processEmailsWithGemini(allEmails, userProfile);
          } catch (error) {
            console.error('[API] fetch-emails-enhanced: Gemini processing failed, falling back to basic processing:', error);
            geminiProcessingSuccess = false;
            // Fallback: Extract basic transaction info without Gemini
            processedTransactions = allEmails.map(email => ({
              txn_date: email.date,
              utr_number: null,
              credit_debit: 'unknown',
              rcvd_from_paid_to: 'Unknown',
              narration: email.snippet || 'Transaction notification',
              txn_amount: 0,
              source: email.queryType || 'gmail-txn-alert',
              pdf_attached: email.pdfAttachments && email.pdfAttachments.length > 0,
              pdf_password_protected: false,
              pdf_password: null,
              email_id: email.id,
              processed_at: new Date().toISOString()
            }));
          }
          
          // Extract balance information from emails (fallback)
          const balanceInfo = extractBalanceFromEmails(allEmails, userProfile);
          
          // Extract balance from Gemini processed data
          const geminiBalanceInfo = extractBalanceFromGeminiData(processedTransactions, balanceInfo);
          
          // Create Gemini processed data
          geminiData = {
            transactions: processedTransactions,
            metadata: {
              total_emails: allEmails.length,
              total_transactions: processedTransactions.length,
              emailType: emailType,
              userProfile: {
                userId: userProfile.userId,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                email: userProfile.email,
                panNumber: userProfile.panNumber,
                dateOfBirth: userProfile.dateOfBirth,
                phoneNumber: userProfile.phoneNumber
              },
              balance: geminiBalanceInfo,
              geminiProcessingSuccess: geminiProcessingSuccess,
              processed_at: new Date().toISOString()
            }
          };
          
          // Save Gemini processed data
          geminiFilename = `gemini_transactions_${emailType}_${timestamp}.json`;
          const geminiFilepath = path.join(transactionsHubDir, geminiFilename);
          fs.writeFileSync(geminiFilepath, JSON.stringify(geminiData, null, 2));
          console.log(`[API] fetch-emails-enhanced: Gemini data saved to ${geminiFilename}`);
        }
      }
    } catch (error) {
      console.error('[API] fetch-emails-enhanced: Error processing with Gemini:', error);
      // Continue without Gemini processing if it fails
    }
    
    res.json({ 
      success: true, 
      message: `Successfully fetched ${allEmails.length} emails and saved to ${filename}${geminiData ? `, processed ${geminiData.metadata.total_transactions} transactions with Gemini AI` : ''}`,
      filename: filename,
      data: storageData,
      geminiData: geminiData,
      geminiFilename: geminiFilename
    });
  } catch (error) {
    console.error('[API] fetch-emails-enhanced: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch or save emails.' 
    });
  }
});

// Create transactions hub
app.post('/api/create-transactions-hub', async (req: Request, res: Response) => {
  console.log('[API] create-transactions-hub: Creating transactions hub');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] create-transactions-hub: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  const { userId, fromDate, toDate } = req.body;
  
  // Default to last 6 months if no dates provided
  const defaultFromDate = new Date();
  defaultFromDate.setMonth(defaultFromDate.getMonth() - 6);
  const defaultToDate = new Date();
  
  const startDate = fromDate ? new Date(fromDate) : defaultFromDate;
  const endDate = toDate ? new Date(toDate) : defaultToDate;
  
  console.log(`[API] create-transactions-hub: Processing transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    // Load user profile
    const userFilePath = path.join(usersDir, `${userId}.json`);
    if (!fs.existsSync(userFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please set up your profile first.'
      });
    }
    
    const userData = fs.readFileSync(userFilePath, 'utf8');
    const userProfile = JSON.parse(userData);
    console.log(`[API] create-transactions-hub: Loaded profile for ${userProfile.email}`);

    // Load all stored email data files
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statsA = fs.statSync(path.join(dataDir, a));
        const statsB = fs.statSync(path.join(dataDir, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });

    // Load Gemini processed data files
    const geminiFiles = fs.readdirSync(transactionsHubDir)
      .filter(file => file.startsWith('gemini_transactions_') && file.endsWith('.json'))
      .sort((a, b) => {
        const statsA = fs.statSync(path.join(transactionsHubDir, a));
        const statsB = fs.statSync(path.join(transactionsHubDir, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });

    const allTransactions = [];
    
    // First, load Gemini processed transactions (preferred)
    for (const file of geminiFiles) {
      const filepath = path.join(transactionsHubDir, file);
      const fileContent = fs.readFileSync(filepath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (data.transactions && Array.isArray(data.transactions)) {
        for (const transaction of data.transactions) {
          // Check if transaction is within date range
          const txnDate = new Date(transaction.txn_date);
          if (txnDate >= startDate && txnDate <= endDate) {
            // Convert Gemini format to transactions hub format
            const hubTransaction = {
              txnDate: transaction.txn_date,
              utrNumber: transaction.utr_number,
              type: transaction.credit_debit,
              partyName: transaction.rcvd_from_paid_to,
              narration: transaction.narration,
              amount: transaction.txn_amount,
              source: transaction.source,
              balance: transaction.balance,
              passwordCombination: transaction.password_combination,
              emailId: transaction.email_id,
              processedAt: transaction.processed_at
            };
            allTransactions.push(hubTransaction);
          }
        }
      }
    }
    
    // If no Gemini data, fall back to regular email processing
    if (allTransactions.length === 0) {
      for (const file of files) {
        const filepath = path.join(dataDir, file);
        const fileContent = fs.readFileSync(filepath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (data.emails && Array.isArray(data.emails)) {
          for (const email of data.emails) {
            // Check if email is within date range
            const emailDate = new Date(email.date);
            if (emailDate >= startDate && emailDate <= endDate) {
              // Extract transactions from email
              const transactions = extractTransactionsFromEmail(email, userProfile);
              allTransactions.push(...transactions);
            }
          }
        }
      }
    }
    
    // Sort transactions by date
    allTransactions.sort((a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime());
    
    // Create transactions hub data
    const transactionsHubData = {
      transactions: allTransactions,
      metadata: {
        total_transactions: allTransactions.length,
        fromDate: startDate.toISOString(),
        toDate: endDate.toISOString(),
        userProfile: {
          userId: userProfile.userId,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email
        },
        created_at: new Date().toISOString()
      }
    };
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transactions_hub_${timestamp}.json`;
    const filepath = path.join(transactionsHubDir, filename);
    
    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(transactionsHubData, null, 2));
    console.log(`[API] create-transactions-hub: Transactions hub saved to ${filename}`);
    
    res.json({ 
      success: true, 
      message: `Successfully created transactions hub with ${allTransactions.length} transactions`,
      filename: filename,
      data: transactionsHubData
    });
  } catch (error) {
    console.error('[API] create-transactions-hub: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create transactions hub.' 
    });
  }
});

// Read PDF statement
app.post('/api/read-pdf-statement', async (req: Request, res: Response) => {
  console.log('[API] read-pdf-statement: Reading PDF statement');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] read-pdf-statement: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  const { emailId, password } = req.body;
  
  if (!emailId) {
    return res.status(400).json({
      success: false,
      error: 'Email ID is required.'
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
    console.log(`[API] read-pdf-statement: Fetching email ${emailId}`);
    
    const msgDetail = await gmail.users.messages.get({ userId: 'me', id: emailId });
    const pdfData = await extractAndReadPDF(msgDetail.data, password);
    
    if (pdfData) {
      console.log('[API] read-pdf-statement: Successfully extracted PDF data');
      res.json({
        success: true,
        message: 'Successfully read PDF statement',
        data: pdfData
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No PDF attachment found or failed to read PDF'
      });
    }
  } catch (error) {
    console.error('[API] read-pdf-statement: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read PDF statement.' 
    });
  }
});

// Get transactions hub files
app.get('/api/transactions-hub', (req: Request, res: Response) => {
  console.log('[API] transactions-hub: Fetching transactions hub files');
  
  try {
    const files = fs.readdirSync(transactionsHubDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filepath = path.join(transactionsHubDir, file);
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
    console.error('[API] transactions-hub: Error reading files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read transactions hub files.' 
    });
  }
});

// Get specific transactions hub file content
app.get('/api/transactions-hub/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  console.log(`[API] transactions-hub: Fetching content of ${filename}`);
  
  try {
    const filepath = path.join(transactionsHubDir, filename);
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
    console.error(`[API] transactions-hub: Error reading ${filename}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read file content.' 
    });
  }
});

// Serve stored PDF attachments
app.get('/api/pdf-attachments/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  console.log(`[API] pdf-attachments: Serving PDF ${filename}`);
  
  try {
    const filepath = path.join(pdfAttachmentsDir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'PDF file not found.' 
      });
    }
    
    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the PDF file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error(`[API] pdf-attachments: Error serving ${filename}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to serve PDF file.' 
    });
  }
});

// Helper function to get PDF password information from Gemini processed data
function getPDFPasswordInfo(filename: string): { password: string | null, isProtected: boolean } {
  try {
    // Extract the original filename from the stored filename
    // Stored format: emailId_timestamp_originalFilename.pdf
    const originalFilename = filename.split('_').slice(2).join('_');
    console.log(`[API] getPDFPasswordInfo: Looking for original filename: ${originalFilename} in stored file: ${filename}`);
    
    // Read all Gemini processed files to find password info
    const transactionsDir = path.join(__dirname, 'transactions_hub');
    if (!fs.existsSync(transactionsDir)) {
      return { password: null, isProtected: false };
    }

    const geminiFiles = fs.readdirSync(transactionsDir)
      .filter(file => file.startsWith('gemini_') && file.endsWith('.json'));

    for (const geminiFile of geminiFiles) {
      const filepath = path.join(transactionsDir, geminiFile);
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);

      if (data.transactions && Array.isArray(data.transactions)) {
        for (const transaction of data.transactions) {
          if (transaction.pdf_filename === originalFilename) {
            console.log(`[API] getPDFPasswordInfo: Found match for ${originalFilename}, password: ${transaction.pdf_password}, protected: ${transaction.pdf_password_protected}`);
            return {
              password: transaction.pdf_password || null,
              isProtected: transaction.pdf_password_protected || false
            };
          }
        }
      }
    }

    console.log(`[API] getPDFPasswordInfo: No match found for ${originalFilename}`);
    return { password: null, isProtected: false };
  } catch (error) {
    console.error('[API] getPDFPasswordInfo: Error getting password info:', error);
    return { password: null, isProtected: false };
  }
}

// Get list of stored PDF attachments
app.get('/api/pdf-attachments', (req: Request, res: Response) => {
  console.log('[API] pdf-attachments: Fetching list of stored PDFs');
  
  try {
    const files = fs.readdirSync(pdfAttachmentsDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filepath = path.join(pdfAttachmentsDir, file);
        const stats = fs.statSync(filepath);
        const passwordInfo = getPDFPasswordInfo(file);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          password: passwordInfo.password,
          isProtected: passwordInfo.isProtected
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    res.json({ 
      success: true, 
      files: files 
    });
  } catch (error) {
    console.error('[API] pdf-attachments: Error reading files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read PDF attachments.' 
    });
  }
});

// Debug endpoint to test PDF detection on a specific email
app.post('/api/debug-pdf-detection', async (req: Request, res: Response) => {
  console.log('[API] debug-pdf-detection: Testing PDF detection');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] debug-pdf-detection: User not authenticated');
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated. Please login first.' 
    });
  }

  const { emailId } = req.body;
  
  if (!emailId) {
    return res.status(400).json({
      success: false,
      error: 'Email ID is required.'
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
    console.log(`[API] debug-pdf-detection: Fetching email ${emailId}`);
    
    const msgDetail = await gmail.users.messages.get({ 
      userId: 'me', 
      id: emailId,
      format: 'full'
    });
    
    const pdfAttachments = extractPDFAttachments(msgDetail.data.payload);
    
    res.json({
      success: true,
      emailId: emailId,
      subject: extractSubjectFromHeaders(msgDetail.data.payload?.headers),
      from: extractEmailFromHeaders(msgDetail.data.payload?.headers),
      pdfAttachments: pdfAttachments,
      payloadStructure: {
        mimeType: msgDetail.data.payload?.mimeType,
        hasParts: !!msgDetail.data.payload?.parts,
        partsCount: msgDetail.data.payload?.parts?.length || 0
      }
    });
  } catch (error) {
    console.error('[API] debug-pdf-detection: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to debug PDF detection.' 
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

// Helper function to extract full email body content
function extractFullEmailBody(payload: any): string {
  if (!payload) return '';
  
  let emailBody = '';
  
  // Recursively extract text content from payload parts
  function extractTextFromPart(part: any): string {
    if (!part) return '';
    
    let text = '';
    
    // If this part has body data, decode it
    if (part.body && part.body.data) {
      try {
        const decodedData = Buffer.from(part.body.data, 'base64').toString('utf-8');
        text += decodedData;
      } catch (error) {
        console.log('[API] extractFullEmailBody: Error decoding part body:', error);
      }
    }
    
    // If this part has parts, recursively process them
    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        text += extractTextFromPart(subPart);
      }
    }
    
    return text;
  }
  
  // Start extraction from the main payload
  emailBody = extractTextFromPart(payload);
  
  // Clean up the email body
  emailBody = emailBody
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  return emailBody;
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

// Enhanced helper functions for new features

// Build enhanced search queries for split modules
function buildEnhancedSearchQueries(emailType: string, fromDate?: string, toDate?: string) {
  const queries = [];
  let dateFilter = '';
  
  // Add date filters if provided
  if (fromDate || toDate) {
    const dateParts = [];
    if (fromDate) dateParts.push(`after:${fromDate.split('T')[0]}`);
    if (toDate) dateParts.push(`before:${toDate.split('T')[0]}`);
    dateFilter = dateParts.join(' ');
  }
  
  if (emailType === 'transaction_alerts' || emailType === 'both') {
    // Transaction alert queries
    queries.push({
      type: 'gmail-txn-alert',
      search: `(subject:(transaction OR debit OR credit OR withdrawal OR deposit OR payment) OR subject:(alert OR notification)) AND (from:bank OR from:sbi OR from:hdfc OR from:icici OR from:axis OR from:kotak OR from:pnb OR from:canara OR from:union OR from:central) ${dateFilter}`.trim()
    });
    
    queries.push({
      type: 'gmail-txn-alert',
      search: `(subject:(transaction OR payment OR alert) OR subject:(notification OR sms)) AND (from:credit OR from:visa OR from:mastercard OR from:amex OR from:rupay) ${dateFilter}`.trim()
    });
  }
  
  if (emailType === 'periodic_statements' || emailType === 'both') {
    // Periodic statement queries
    queries.push({
      type: 'gmail-periodic-stmt',
      search: `(subject:(statement OR summary OR report) OR subject:(monthly OR quarterly OR annual)) AND (from:bank OR from:sbi OR from:hdfc OR from:icici OR from:axis OR from:kotak OR from:pnb OR from:canara OR from:union OR from:central) ${dateFilter}`.trim()
    });
    
    queries.push({
      type: 'gmail-periodic-stmt',
      search: `(subject:(statement OR bill OR summary) OR subject:(monthly OR quarterly OR annual)) AND (from:credit OR from:visa OR from:mastercard OR from:amex OR from:rupay) ${dateFilter}`.trim()
    });
  }
  
  return queries;
}

// Enhanced transaction details extraction
function extractEnhancedTransactionDetails(snippet: string | undefined, payload: any) {
  if (!snippet) return null;
  
  const content = snippet.toLowerCase();
  const details: any = {
    type: null,
    amount: null,
    merchant: null,
    date: null,
    location: null,
    utrNumber: null,
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
  
  // Extract UTR number
  const utrMatch = content.match(/utr\s*(?:no|number)?\s*:?\s*([a-z0-9]+)/i) ||
                  content.match(/reference\s*(?:no|number)?\s*:?\s*([a-z0-9]+)/i) ||
                  content.match(/transaction\s*(?:id|no|number)?\s*:?\s*([a-z0-9]+)/i);
  if (utrMatch) {
    details.utrNumber = utrMatch[1].toUpperCase();
  }
  
  // Extract merchant/terminal name
  const merchantMatch = content.match(/terminal\s+owner\s+name\s+([^,\n]+)/i) ||
                       content.match(/merchant\s*:\s*([^,\n]+)/i) ||
                       content.match(/at\s+([^,\n]+)/i) ||
                       content.match(/to\s+([^,\n]+)/i);
  if (merchantMatch) {
    details.merchant = merchantMatch[1].trim();
  }
  
  // Extract date
  const dateMatch = content.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
                   content.match(/(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i);
  if (dateMatch) {
    details.date = dateMatch[1];
  }
  
  // Extract keywords
  const keywords = ['transaction', 'debit', 'credit', 'withdrawal', 'deposit', 'payment', 'atm', 'pos', 'online'];
  details.keywords = keywords.filter(keyword => content.includes(keyword));
  
  return details;
}

// Enhanced statement details extraction
function extractEnhancedStatementDetails(snippet: string | undefined, payload: any) {
  if (!snippet) return null;
  
  const content = snippet.toLowerCase();
  const details: any = {
    statementType: null,
    period: null,
    passwordHint: null,
    identifiers: [],
    pdfPassword: null
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
    'password is your customer id',
    'password is your name',
    'password is your dob'
  ];
  
  for (const hint of passwordHints) {
    if (content.includes(hint.toLowerCase())) {
      details.passwordHint = hint;
      break;
    }
  }
  
  return details;
}

// Extract PDF attachments
function extractPDFAttachments(payload: any) {
  const attachments = [];
  
  function traverseParts(parts: any[]) {
    for (const part of parts) {
      console.log(`[DEBUG] Checking part: mimeType=${part.mimeType}, filename=${part.filename}`);
      
      // Check for PDF attachments
      if (part.mimeType === 'application/pdf') {
        console.log(`[DEBUG] Found PDF attachment: ${part.filename}`);
        if (part.body && part.body.attachmentId) {
          attachments.push({
            filename: part.filename || 'statement.pdf',
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        }
      }
      
      // Check for multipart messages that might contain PDFs
      if (part.mimeType === 'multipart/mixed' || part.mimeType === 'multipart/related') {
        console.log(`[DEBUG] Found multipart: ${part.mimeType}`);
        if (part.parts) {
          traverseParts(part.parts);
        }
      }
      
      // Check for alternative content types that might be PDFs
      if (part.mimeType === 'application/octet-stream' && part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
        console.log(`[DEBUG] Found PDF as octet-stream: ${part.filename}`);
        if (part.body && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        }
      }
      
      // Recursively check nested parts
      if (part.parts) {
        traverseParts(part.parts);
      }
    }
  }
  
  console.log(`[DEBUG] Extracting PDFs from payload: mimeType=${payload.mimeType}`);
  
  if (payload.parts) {
    traverseParts(payload.parts);
  } else if (payload.mimeType === 'application/pdf') {
    console.log(`[DEBUG] Found direct PDF: ${payload.filename}`);
    if (payload.body && payload.body.attachmentId) {
      attachments.push({
        filename: payload.filename || 'statement.pdf',
        size: payload.body.size || 0,
        attachmentId: payload.body.attachmentId
      });
    }
  }
  
  console.log(`[DEBUG] Total PDF attachments found: ${attachments.length}`);
  return attachments;
}

// Download and store PDF attachment
async function downloadAndStorePDF(gmail: any, attachmentId: string, emailId: string, filename: string) {
  try {
    console.log(`[API] downloadAndStorePDF: Downloading PDF ${filename} from email ${emailId}`);
    
    // Get the attachment data
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: emailId,
      id: attachmentId
    });
    
    if (!attachment.data.data) {
      console.log(`[API] downloadAndStorePDF: No attachment data found for ${filename}`);
      return null;
    }
    
    // Decode the base64 data
    const pdfData = Buffer.from(attachment.data.data, 'base64');
    
    // Create a unique filename to avoid conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${emailId}_${timestamp}_${safeFilename}`;
    const filepath = path.join(pdfAttachmentsDir, uniqueFilename);
    
    // Save the PDF file
    fs.writeFileSync(filepath, pdfData);
    
    console.log(`[API] downloadAndStorePDF: PDF saved to ${uniqueFilename}`);
    
    return {
      originalFilename: filename,
      storedFilename: uniqueFilename,
      filepath: filepath,
      size: pdfData.length,
      emailId: emailId,
      downloadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[API] downloadAndStorePDF: Error downloading PDF ${filename}:`, error);
    return null;
  }
}

// Extract transactions from email for transactions hub
function extractTransactionsFromEmail(email: any, userProfile: any) {
  const transactions = [];
  
  // Extract from transaction details
  if (email.transactionDetails) {
    const txn = {
      txnDate: email.transactionDetails.date || email.date,
      utrNumber: email.transactionDetails.utrNumber || null,
      type: email.transactionDetails.type || 'unknown',
      partyName: email.transactionDetails.merchant || 'Unknown',
      narration: email.snippet || 'Transaction notification',
      amount: email.transactionDetails.amount || 0,
      source: email.emailType || 'gmail-txn-alert'
    };
    
    // Determine party name based on transaction type
    if (txn.type === 'credit') {
      txn.partyName = email.transactionDetails.merchant || 'Received from';
    } else if (txn.type === 'debit') {
      txn.partyName = email.transactionDetails.merchant || 'Paid to';
    }
    
    transactions.push(txn);
  }
  
  // Extract from statement details (if it's a statement email)
  if (email.statementDetails && email.emailType === 'gmail-periodic-stmt') {
    // This would typically require PDF parsing, but for now we'll create a placeholder
    const stmtTxn = {
      txnDate: email.date,
      utrNumber: null,
      type: 'statement',
      partyName: 'Bank Statement',
      narration: `Periodic statement - ${email.statementDetails.statementType || 'monthly'}`,
      amount: 0,
      source: 'gmail-periodic-stmt'
    };
    
    transactions.push(stmtTxn);
  }
  
  return transactions;
}

// Extract and read PDF content
async function extractAndReadPDF(messageData: any, password?: string) {
  try {
    // Find PDF attachment
    const pdfAttachment = extractPDFAttachments(messageData.payload)[0];
    if (!pdfAttachment) {
      return null;
    }
    
    // For now, return basic PDF info since actual PDF reading requires more complex setup
    return {
      filename: pdfAttachment.filename,
      size: pdfAttachment.size,
      attachmentId: pdfAttachment.attachmentId,
      passwordRequired: password ? false : true,
      message: 'PDF extraction requires additional setup for full text reading'
    };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    return null;
  }
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Gemini-powered transaction processing API
app.post('/api/process-transactions-gemini', async (req: Request, res: Response) => {
  console.log('[API] process-transactions-gemini: Processing transaction data with Gemini AI');
  
  const tokenStr = req.cookies.google_tokens;
  if (!tokenStr) {
    console.log('[API] process-transactions-gemini: User not authenticated');
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
      console.log(`[API] process-transactions-gemini: Loaded profile for ${userProfile.email}`);
    } else {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please set up your profile first.'
      });
    }
  } catch (error) {
    console.error('[API] process-transactions-gemini: Error loading user profile:', error);
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
    console.log(`[API] process-transactions-gemini: Fetching ${queryType} emails from Gmail`);
    
    // Build search queries based on query type
    const searchQueries = buildSearchQueries(queryType, userProfile);
    const allEmails = [];
    
    for (const query of searchQueries) {
      console.log(`[API] process-transactions-gemini: Searching with query: ${query.search}`);
      
      const result = await gmail.users.messages.list({
        userId: 'me',
        q: query.search,
        maxResults: 20,
      });
      
      const messages = result.data.messages || [];
      console.log(`[API] process-transactions-gemini: Found ${messages.length} emails for ${query.type}`);
      
      for (const msg of messages) {
        const msgDetail = await gmail.users.messages.get({ 
          userId: 'me', 
          id: msg.id!,
          format: 'full' // Get full message content including attachments
        });
        
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
            email: userProfile.email,
            pan: userProfile.pan,
            dob: userProfile.dob
          },
          transactionDetails: extractTransactionDetails(msgDetail.data.snippet || undefined, msgDetail.data.payload),
          statementDetails: extractStatementDetails(msgDetail.data.snippet || undefined, msgDetail.data.payload, userProfile),
          pdfAttachments: extractPDFAttachments(msgDetail.data.payload),
          timestamp: new Date().toISOString()
        };
        
        // Add account mapping after emailInfo is fully created
        emailInfo.accountMapping = mapAccountToEmail(emailInfo, userProfile);
        
        allEmails.push(emailInfo);
      }
    }
    
    console.log(`[API] process-transactions-gemini: Processing ${allEmails.length} emails with Gemini AI`);
    
    // Process emails with Gemini AI
    const processedTransactions = await processEmailsWithGemini(allEmails, userProfile);
    
    // Create structured data for storage
    const storageData = {
      transactions: processedTransactions,
      metadata: {
        total_emails: allEmails.length,
        total_transactions: processedTransactions.length,
        queryType: queryType,
        userProfile: {
          userId: userProfile.userId,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email
        },
        processed_at: new Date().toISOString()
      }
    };
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gemini_transactions_${queryType}_${timestamp}.json`;
    const filepath = path.join(transactionsHubDir, filename);
    
    // Save to JSON file
    fs.writeFileSync(filepath, JSON.stringify(storageData, null, 2));
    console.log(`[API] process-transactions-gemini: Data saved to ${filename}`);
    
    res.json({ 
      success: true, 
      message: `Successfully processed ${allEmails.length} emails and extracted ${processedTransactions.length} transactions using Gemini AI`,
      filename: filename,
      data: storageData
    });
  } catch (error) {
    console.error('[API] process-transactions-gemini: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process transactions with Gemini AI.' 
    });
  }
});

// Function to process emails with Gemini AI using batching
async function processEmailsWithGemini(emails: any[], userProfile: any) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const allTransactions = [];
  
  // Debug: Log user profile data for password generation
  console.log(`[API] processEmailsWithGemini: User Profile Debug - PAN: ${userProfile.panNumber || userProfile.pan || 'N/A'}, DOB: ${userProfile.dateOfBirth || userProfile.dob || 'N/A'}, Mobile: ${userProfile.phoneNumber || 'N/A'}`);
  console.log(`[API] processEmailsWithGemini: Full User Profile:`, JSON.stringify(userProfile, null, 2));
  
  // Batch processing: Process multiple emails in a single request
  const batchSize = 10; // Process 10 emails per request
  const maxRetries = 3;
  
  console.log(`[API] processEmailsWithGemini: Processing ${emails.length} emails in batches of ${batchSize}`);
  
  // Split emails into batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(emails.length / batchSize);
    
    console.log(`[API] processEmailsWithGemini: Processing batch ${batchNumber}/${totalBatches} with ${batch.length} emails`);
    
    let retryCount = 0;
    let batchProcessed = false;
    
    while (retryCount < maxRetries && !batchProcessed) {
      try {
        // Create a batch prompt with multiple emails
        const batchPrompt = createBatchGeminiPrompt(batch, userProfile);
        
        // Generate content with Gemini for the entire batch
        const result = await model.generateContent(batchPrompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the batch response
        const batchTransactions = parseBatchGeminiResponse(text, batch);
        
        if (batchTransactions && batchTransactions.length > 0) {
          allTransactions.push(...batchTransactions);
          console.log(`[API] processEmailsWithGemini: Extracted ${batchTransactions.length} transactions from batch ${batchNumber}`);
        }
        
        batchProcessed = true;
        
        // Add small delay between batches to be respectful
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
        }
        
      } catch (error: any) {
        retryCount++;
        console.error(`[API] processEmailsWithGemini: Error processing batch ${batchNumber} (attempt ${retryCount}):`, error);
        
        // Handle rate limit errors
        if (error.status === 429) {
          const retryDelay = Math.min(60 * retryCount, 300); // Exponential backoff, max 5 minutes
          console.log(`[API] processEmailsWithGemini: Rate limit hit, waiting ${retryDelay} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        } else if (error.status === 503) {
          // Service unavailable, wait and retry
          const retryDelay = 30 * retryCount;
          console.log(`[API] processEmailsWithGemini: Service unavailable, waiting ${retryDelay} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        } else {
          // Other errors, break and continue with next batch
          console.log(`[API] processEmailsWithGemini: Skipping batch ${batchNumber} due to error`);
          break;
        }
      }
    }
    
    if (!batchProcessed) {
      console.log(`[API] processEmailsWithGemini: Failed to process batch ${batchNumber} after ${maxRetries} attempts`);
    }
  }
  
  console.log(`[API] processEmailsWithGemini: Completed processing ${emails.length} emails in ${Math.ceil(emails.length / batchSize)} batches, extracted ${allTransactions.length} total transactions`);
  
  // Post-process to ensure consistent SBI password generation
  const processedTransactions = allTransactions.map(transaction => {
    if (transaction.type === 'statement' && transaction.pdf_password_protected && transaction.pdf_password === '{missing info} needed') {
      // Check if this is an SBI statement
      const sourceEmail = emails.find(email => email.id === transaction.email_id);
      if (sourceEmail && sourceEmail.from_mail && sourceEmail.from_mail.includes('sbi.co.in')) {
        // Generate SBI password
        const mobileLast5 = userProfile.phoneNumber ? userProfile.phoneNumber.slice(-5) : null;
        const dobFormatted = userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '') : null;
        
        if (mobileLast5 && dobFormatted) {
          transaction.pdf_password = mobileLast5 + dobFormatted;
          console.log(`[API] processEmailsWithGemini: Fixed SBI password for ${transaction.email_id}: ${transaction.pdf_password}`);
        } else {
          transaction.pdf_password = mobileLast5 ? `{DOB} needed (mobile: ${mobileLast5})` : dobFormatted ? `{Mobile} needed (DOB: ${dobFormatted})` : '{Mobile + DOB} needed';
        }
      }
    }
    return transaction;
  });
  
  return processedTransactions;
}

// Function to create batch Gemini prompt
function createBatchGeminiPrompt(emails: any[], userProfile: any) {
  // Debug: Log what data is being used in the prompt
  console.log(`[API] createBatchGeminiPrompt: Using PAN: ${userProfile.panNumber || userProfile.pan || 'N/A'}, DOB: ${userProfile.dateOfBirth || userProfile.dob || 'N/A'}, Mobile: ${userProfile.phoneNumber || 'N/A'}`);
  
  const emailData = emails.map((email, index) => `
Email ${index + 1}:
- ID: ${email.id}
- Subject: ${email.subject || 'N/A'}
- From: ${email.from_mail || 'N/A'}
- Date: ${email.date || 'N/A'}
- Snippet: ${email.snippet || 'N/A'}
- Full Email Body: ${email.fullBody || email.snippet || 'N/A'}
- Email Type: ${email.queryType || 'N/A'}
- PDF Attachments: ${email.pdfAttachments && email.pdfAttachments.length > 0 ? `${email.pdfAttachments.length} PDF(s) attached` : 'No PDF attachments'}
${email.pdfAttachments && email.pdfAttachments.length > 0 ? `- PDF Files: ${email.pdfAttachments.map((pdf: any) => (pdf as any).originalFilename || (pdf as any).storedFilename || (pdf as any).filename || (pdf as any).name || 'Unknown').join(', ')}` : ''}
`).join('\n');

  const prompt = `
You are a financial data extraction expert. Analyze the following batch of email data and extract BOTH transaction information AND statement information in a structured JSON format.

User Profile:
- Name: ${userProfile.firstName} ${userProfile.lastName}
- Email: ${userProfile.email}
- PAN: ${userProfile.panNumber || userProfile.pan || 'N/A'}
- DOB: ${userProfile.dateOfBirth || userProfile.dob || 'N/A'}

Email Data (${emails.length} emails):
${emailData}

Instructions:
1. Process ALL emails and extract TWO types of data:
   A) TRANSACTION DATA: For emails with financial transactions
   B) STATEMENT DATA: For emails with PDF statements/attachments

2. For TRANSACTION emails, provide:
   - email_id: The email ID from the source email
   - txn_date: Transaction date (YYYY-MM-DD format)
   - utr_number: UTR number or reference number (null if not available)
   - credit_debit: "credit" or "debit" based on transaction type
   - rcvd_from_paid_to: IMPORTANT - For CREDIT transactions (money received), record WHO SENT the money. For DEBIT transactions (money sent), record WHO RECEIVED the money
   - narration: Transaction description or narration
   - txn_amount: Transaction amount (numeric value)
   - source: Source of this transaction ("gmail-txn-alert" or "gmail-periodic-stmt")
   - pdf_attached: Boolean indicating if PDF is attached (true/false)
   - pdf_password_protected: Boolean indicating if PDF is password protected (true/false)
   - pdf_password: Password combination for PDF if protected
   - available_balance: Balance amount if mentioned in email (e.g., "Avl Balance INR 65371.94")

3. For STATEMENT emails (with PDFs), provide:
   - email_id: The email ID from the source email
   - statement_type: Type of statement (monthly, quarterly, annual, loan, etc.)
   - statement_date: Statement date (YYYY-MM-DD format)
   - pdf_attached: true (since these have PDFs)
   - pdf_filename: Name of the PDF file
   - pdf_password_protected: Boolean indicating if PDF is password protected
   - pdf_password: Password combination based on email hints and user profile
   - source: "gmail-periodic-stmt"

4. PDF Password Analysis (CRITICAL):
   - ALWAYS check if PDF is password protected by looking for these indicators in the FULL EMAIL BODY (not just snippet):
     * "password protected", "password is", "use password", "protected with", "secured with"
     * "PAN as password", "DOB as password", "email as password", "date of birth as password"
     * "combination of", "password combination", "use your", "enter your"
     * "password required", "enter password", "password field", "password prompt"
     * "password hint", "password information", "password details", "password instructions"
     * "to open the PDF", "to access the statement", "to view the document"
   - COMMON INDIAN BANK PATTERNS: Many Indian bank statements are password protected by default
     * SBI statements often use PAN as password
     * HDFC statements often use DOB as password  
     * ICICI statements often use PAN+DOB combination
     * Loan statements are typically password protected
     * Credit card statements are usually password protected
   - If ANY of these indicators are found OR if it's a statement from a major Indian bank, set pdf_password_protected: true
   - For password hints, look for these specific patterns:
     * "password is your PAN" → use PAN value
     * "use your DOB" or "date of birth as password" → use DOB value  
     * "email as password" → use email value
     * "PAN+DOB" or "PAN and DOB" → combine PAN+DOB
     * "DOB+PAN" → combine DOB+PAN
     * "email+DOB" → combine email+DOB
     * "PAN+email" → combine PAN+email
     * "first 4 digits of PAN" → use first 4 chars of PAN
     * "last 4 digits of PAN" → use last 4 chars of PAN
     * "DDMMYYYY" → format DOB as DDMMYYYY
     * "MMDDYYYY" → format DOB as MMDDYYYY
     * "YYYYMMDD" → format DOB as YYYYMMDD
   - User profile data available: PAN: ${userProfile.pan || 'N/A'}, DOB: ${userProfile.dob || 'N/A'}, Email: ${userProfile.email}
   - If password hint is found but user data is missing, return "{missing info} needed"
   - Examples:
     * Email says "password is your PAN" + PAN available → return "ABCDE1234F"
     * Email says "use DOB as password" + DOB available → return "1990-01-01"
     * Email says "PAN+DOB" + both available → return "ABCDE1234F1990-01-01"
     * Email says "password is your PAN" + PAN missing → return "{PAN} needed"
     * Email says "use DOB" + DOB missing → return "{DOB} needed"
     * **SBI SPECIFIC**: Email says "last five digits of mobile number and DOB in DDMMYY format" → use last 5 digits of mobile + DOB in DDMMYY format
     * **SBI SPECIFIC**: Example: mobile "09022128064" + DOB "1997-01-01" → password "28064010197" (last 5 digits + DDMMYY)
     * **CRITICAL**: For SBI statements with "last five digits of customer registered mobile number and date of birth (DOB) in DDMMYY format":
       - Use last 5 digits of mobile number: ${userProfile.phoneNumber ? userProfile.phoneNumber.slice(-5) : 'N/A'}
       - Use DOB in DDMMYY format: ${userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '') : 'N/A'}
       - Combined password: ${userProfile.phoneNumber && userProfile.dateOfBirth ? userProfile.phoneNumber.slice(-5) + new Date(userProfile.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '') : 'N/A'}
     * **MANDATORY**: ALL SBI statement emails with PDF attachments MUST use this password pattern
     * **CONSISTENCY**: Apply this password pattern to EVERY SBI statement email in the batch

5. Balance Extraction:
   - Look for balance patterns: "Avl Balance INR 65371.94", "Available Balance Rs.50000", etc.
   - Extract the latest balance from transaction emails
   - Include balance in transaction records

6. Return ONLY valid JSON array with both transaction and statement objects. No additional text.

Example Response Format:
[
  {
    "email_id": "email_id_1",
    "txn_date": "2024-01-15",
    "utr_number": "123456789012",
    "credit_debit": "credit",
    "rcvd_from_paid_to": "John Doe",
    "narration": "UPI transfer received from John Doe",
    "txn_amount": 5000.00,
    "source": "gmail-txn-alert",
    "pdf_attached": false,
    "pdf_password_protected": false,
    "pdf_password": null,
    "available_balance": 65371.94
  },
  {
    "email_id": "email_id_2",
    "txn_date": "2024-01-16",
    "utr_number": null,
    "credit_debit": "debit",
    "rcvd_from_paid_to": "Amazon",
    "narration": "Online purchase to Amazon",
    "txn_amount": 1500.00,
    "source": "gmail-txn-alert",
    "pdf_attached": false,
    "pdf_password_protected": false,
    "pdf_password": null,
    "available_balance": 63730.94
  },
  {
    "email_id": "email_id_3",
    "statement_type": "monthly",
    "statement_date": "2024-01-31",
    "pdf_attached": true,
    "pdf_filename": "8544264213731072025.pdf",
    "pdf_password_protected": true,
    "pdf_password": "ABCDE1234F1990-01-01",
    "source": "gmail-periodic-stmt"
  }
]

Analyze all emails and return the transaction information in the exact JSON format above.`;
  
  return prompt;
}

// Function to create single email Gemini prompt (for backward compatibility)
function createGeminiPrompt(email: any, userProfile: any) {
  const prompt = `
You are a financial data extraction expert. Analyze the following email data and extract transaction information in a structured JSON format.

Email Data:
- Subject: ${email.subject || 'N/A'}
- From: ${email.from_mail || 'N/A'}
- Date: ${email.date || 'N/A'}
- Snippet: ${email.snippet || 'N/A'}
- Email Type: ${email.queryType || 'N/A'}

User Profile:
- Name: ${userProfile.firstName} ${userProfile.lastName}
- Email: ${userProfile.email}
- PAN: ${userProfile.panNumber || userProfile.pan || 'N/A'}
- DOB: ${userProfile.dateOfBirth || userProfile.dob || 'N/A'}

Instructions:
1. Extract all transaction information from the email data
2. For each transaction, provide the following fields:
   - txn_date: Transaction date (YYYY-MM-DD format)
   - utr_number: UTR number or reference number (null if not available)
   - credit_debit: "credit" or "debit" based on transaction type
   - rcvd_from_paid_to: IMPORTANT - For CREDIT transactions (money received), record WHO SENT the money. For DEBIT transactions (money sent), record WHO RECEIVED the money
   - narration: Transaction description or narration
   - txn_amount: Transaction amount (numeric value)
   - source: Source of this transaction ("gmail-txn-alert" or "gmail-periodic-stmt")
   - pdf_attached: Boolean indicating if PDF is attached (true/false)
   - pdf_password_protected: Boolean indicating if PDF is password protected (true/false)
   - pdf_password: Password combination for PDF if protected (read email hints carefully)

3. PDF Password Analysis (CRITICAL):
   - ALWAYS check if PDF is password protected by looking for these indicators in email text:
     * "password protected", "password is", "use password", "protected with", "secured with"
     * "PAN as password", "DOB as password", "email as password", "date of birth as password"
     * "combination of", "password combination", "use your", "enter your"
     * "password required", "enter password", "password field", "password prompt"
   - COMMON INDIAN BANK PATTERNS: Many Indian bank statements are password protected by default
     * SBI statements often use PAN as password
     * HDFC statements often use DOB as password  
     * ICICI statements often use PAN+DOB combination
     * Loan statements are typically password protected
     * Credit card statements are usually password protected
   - If ANY of these indicators are found OR if it's a statement from a major Indian bank, set pdf_password_protected: true
   - For password hints, look for these specific patterns:
     * "password is your PAN" → use PAN value
     * "use your DOB" or "date of birth as password" → use DOB value  
     * "email as password" → use email value
     * "PAN+DOB" or "PAN and DOB" → combine PAN+DOB
     * "DOB+PAN" → combine DOB+PAN
     * "email+DOB" → combine email+DOB
     * "PAN+email" → combine PAN+email
     * "first 4 digits of PAN" → use first 4 chars of PAN
     * "last 4 digits of PAN" → use last 4 chars of PAN
     * "DDMMYYYY" → format DOB as DDMMYYYY
     * "MMDDYYYY" → format DOB as MMDDYYYY
     * "YYYYMMDD" → format DOB as YYYYMMDD
   - User profile data available: PAN: ${userProfile.pan || 'N/A'}, DOB: ${userProfile.dob || 'N/A'}, Email: ${userProfile.email}
   - If password hint is found but user data is missing, return "{missing info} needed"
   - Examples:
     * Email says "password is your PAN" + PAN available → return "ABCDE1234F"
     * Email says "use DOB as password" + DOB available → return "1990-01-01"
     * Email says "PAN+DOB" + both available → return "ABCDE1234F1990-01-01"
     * Email says "password is your PAN" + PAN missing → return "{PAN} needed"
     * Email says "use DOB" + DOB missing → return "{DOB} needed"

4. Party Name Logic:
   - CREDIT transaction: Money received → record WHO SENT the money (sender/payer)
   - DEBIT transaction: Money sent → record WHO RECEIVED the money (recipient/payee)

5. Return ONLY valid JSON array with transaction objects. No additional text.

Example Response Format:
[
  {
    "txn_date": "2024-01-15",
    "utr_number": "123456789012",
    "credit_debit": "credit",
    "rcvd_from_paid_to": "John Doe",
    "narration": "UPI transfer received from John Doe",
    "txn_amount": 5000.00,
    "source": "gmail-txn-alert",
    "pdf_attached": true,
    "pdf_password_protected": true,
    "pdf_password": "ABCDE1234F1990-01-01"
  }
]

Analyze the email data and return the transaction information in the exact JSON format above.`;
  
  return prompt;
}

// Function to extract balance information from emails
function extractBalanceFromEmails(emails: any[], userProfile: any) {
  let latestBalance = null;
  let balanceSource = 'derived';
  let balanceEmail = null;
  
  // Sort emails by date (newest first) to get the latest balance
  const sortedEmails = [...emails].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Look for balance information in emails
  for (const email of sortedEmails) {
    const emailText = `${email.subject || ''} ${email.snippet || ''}`.toLowerCase();
    
    // Look for balance patterns with more comprehensive matching
    const balancePatterns = [
      /balance[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /available[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /current[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /total[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /closing[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /ending[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /account[:\s]*(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)[\s]*balance/i,
      /(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)[\s]*available/i,
      /(?:₹|inr|rs\.?)\s*([0-9,]+\.?[0-9]*)[\s]*current/i,
      /avl\s+balance\s+(?:inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i,
      /available\s+balance\s+(?:inr|rs\.?)\s*([0-9,]+\.?[0-9]*)/i
    ];
    
    for (const pattern of balancePatterns) {
      const match = emailText.match(pattern);
      if (match) {
        const balanceAmount = parseFloat(match[1].replace(/,/g, ''));
        if (balanceAmount > 0) {
          latestBalance = balanceAmount;
          balanceSource = email.queryType === 'gmail-periodic-stmt' ? 'from-statement' : 'from-alert';
          balanceEmail = email;
          console.log(`[API] extractBalanceFromEmails: Found balance ₹${balanceAmount} in ${email.queryType} email from ${email.date}`);
          break;
        }
      }
    }
    
    if (latestBalance) break;
  }
  
  // If no balance found in emails, try to extract from Gemini processed data
  if (!latestBalance) {
    console.log(`[API] extractBalanceFromEmails: No balance found in emails, will rely on Gemini processing`);
  }
  
  return {
    amount: latestBalance,
    source: balanceSource,
    lastUpdated: latestBalance ? new Date().toISOString() : null,
    emailDate: balanceEmail ? balanceEmail.date : null,
    emailType: balanceEmail ? balanceEmail.queryType : null
  };
}

// Function to extract balance from Gemini processed data
function extractBalanceFromGeminiData(transactions: any[], fallbackBalance: any) {
  let latestBalance = fallbackBalance.amount;
  let balanceSource = fallbackBalance.source;
  let balanceDate = fallbackBalance.emailDate;
  
  // Look for balance in transaction data (from Gemini processing)
  for (const txn of transactions) {
    if (txn.available_balance && txn.available_balance > 0) {
      latestBalance = txn.available_balance;
      balanceSource = 'from-gemini-processing';
      balanceDate = txn.txn_date;
      console.log(`[API] extractBalanceFromGeminiData: Found balance ₹${latestBalance} from Gemini processing`);
      break;
    }
  }
  
  return {
    amount: latestBalance,
    source: balanceSource,
    lastUpdated: latestBalance ? new Date().toISOString() : null,
    emailDate: balanceDate,
    emailType: balanceSource === 'from-gemini-processing' ? 'gmail-txn-alert' : fallbackBalance.emailType
  };
}

// Function to parse batch Gemini response
function parseBatchGeminiResponse(response: string, emails: any[]) {
  try {
    // Clean the response to extract JSON
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`[API] parseBatchGeminiResponse: No valid JSON array found in batch response`);
      return [];
    }
    
    const data = JSON.parse(jsonMatch[0]);
    
    // Process both transaction and statement data
    return data.map((item: any) => {
      // Find the corresponding email for this item
      const sourceEmail = emails.find(email => email.id === item.email_id);
      
      // Check if this is a transaction or statement
      if (item.txn_date || item.txn_amount !== undefined) {
        // This is a transaction
        return {
          txn_date: item.txn_date || (sourceEmail ? sourceEmail.date : new Date().toISOString()),
          utr_number: item.utr_number || null,
          credit_debit: item.credit_debit || 'unknown',
          rcvd_from_paid_to: item.rcvd_from_paid_to || 'Unknown',
          narration: item.narration || (sourceEmail ? sourceEmail.snippet : 'Transaction notification'),
          txn_amount: parseFloat(item.txn_amount) || 0,
          source: item.source || (sourceEmail ? sourceEmail.queryType : 'gmail-txn-alert'),
          pdf_attached: item.pdf_attached || false,
          pdf_password_protected: item.pdf_password_protected || false,
          pdf_password: item.pdf_password || null,
          available_balance: item.available_balance || null,
          email_id: item.email_id,
          processed_at: new Date().toISOString(),
          type: 'transaction'
        };
      } else if (item.statement_type || item.pdf_filename) {
        // This is a statement
        return {
          statement_type: item.statement_type || 'unknown',
          statement_date: item.statement_date || (sourceEmail ? sourceEmail.date : new Date().toISOString()),
          pdf_attached: item.pdf_attached || false,
          pdf_filename: item.pdf_filename || null,
          pdf_password_protected: item.pdf_password_protected || false,
          pdf_password: item.pdf_password || null,
          source: item.source || (sourceEmail ? sourceEmail.queryType : 'gmail-periodic-stmt'),
          email_id: item.email_id,
          processed_at: new Date().toISOString(),
          type: 'statement'
        };
      } else {
        // Fallback for unknown type
        return {
          txn_date: item.txn_date || (sourceEmail ? sourceEmail.date : new Date().toISOString()),
          utr_number: item.utr_number || null,
          credit_debit: item.credit_debit || 'unknown',
          rcvd_from_paid_to: item.rcvd_from_paid_to || 'Unknown',
          narration: item.narration || (sourceEmail ? sourceEmail.snippet : 'Transaction notification'),
          txn_amount: parseFloat(item.txn_amount) || 0,
          source: item.source || (sourceEmail ? sourceEmail.queryType : 'gmail-txn-alert'),
          pdf_attached: item.pdf_attached || false,
          pdf_password_protected: item.pdf_password_protected || false,
          pdf_password: item.pdf_password || null,
          email_id: item.email_id,
          processed_at: new Date().toISOString(),
          type: 'unknown'
        };
      }
    });
  } catch (error) {
    console.error(`[API] parseBatchGeminiResponse: Error parsing batch response:`, error);
    return [];
  }
}

// Function to parse single email Gemini response (for backward compatibility)
function parseGeminiResponse(response: string, email: any) {
  try {
    // Clean the response to extract JSON
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`[API] parseGeminiResponse: No valid JSON array found in response for email ${email.id}`);
      return [];
    }
    
    const transactions = JSON.parse(jsonMatch[0]);
    
    // Validate and enhance transactions
    return transactions.map((txn: any) => ({
      txn_date: txn.txn_date || email.date,
      utr_number: txn.utr_number || null,
      credit_debit: txn.credit_debit || 'unknown',
      rcvd_from_paid_to: txn.rcvd_from_paid_to || 'Unknown',
      narration: txn.narration || email.snippet || 'Transaction notification',
      txn_amount: parseFloat(txn.txn_amount) || 0,
      source: txn.source || email.queryType || 'gmail-txn-alert',
      pdf_attached: txn.pdf_attached || false,
      pdf_password_protected: txn.pdf_password_protected || false,
      pdf_password: txn.pdf_password || null,
      email_id: email.id,
      processed_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[API] parseGeminiResponse: Error parsing response for email ${email.id}:`, error);
    return [];
  }
}

// Delete all data (PDFs, data files, and transactions)
app.delete('/api/delete-all-data', async (req: Request, res: Response) => {
  console.log('[API] delete-all-data: Deleting all stored data');
  
  try {
    let deletedCount = 0;
    
    // Delete PDF attachments
    if (fs.existsSync(pdfAttachmentsDir)) {
      const pdfFiles = fs.readdirSync(pdfAttachmentsDir);
      for (const file of pdfFiles) {
        const filepath = path.join(pdfAttachmentsDir, file);
        fs.unlinkSync(filepath);
        deletedCount++;
      }
      console.log(`[API] delete-all-data: Deleted ${pdfFiles.length} PDF files`);
    }
    
    // Delete data files
    if (fs.existsSync(dataDir)) {
      const dataFiles = fs.readdirSync(dataDir);
      for (const file of dataFiles) {
        if (file.endsWith('.json')) {
          const filepath = path.join(dataDir, file);
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }
      console.log(`[API] delete-all-data: Deleted ${dataFiles.filter(f => f.endsWith('.json')).length} data files`);
    }
    
    // Delete transaction hub files
    if (fs.existsSync(transactionsHubDir)) {
      const transactionFiles = fs.readdirSync(transactionsHubDir);
      for (const file of transactionFiles) {
        if (file.endsWith('.json')) {
          const filepath = path.join(transactionsHubDir, file);
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }
      console.log(`[API] delete-all-data: Deleted ${transactionFiles.filter(f => f.endsWith('.json')).length} transaction files`);
    }
    
    res.json({ 
      success: true, 
      message: `Successfully deleted ${deletedCount} files`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('[API] delete-all-data: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete data.' 
    });
  }
});

// Delete specific file
app.delete('/api/delete-file/:type/:filename', async (req: Request, res: Response) => {
  const { type, filename } = req.params;
  console.log(`[API] delete-file: Deleting ${type} file: ${filename}`);
  
  try {
    let filepath: string;
    
    switch (type) {
      case 'pdf':
        filepath = path.join(pdfAttachmentsDir, filename);
        break;
      case 'data':
        filepath = path.join(dataDir, filename);
        break;
      case 'transaction':
        filepath = path.join(transactionsHubDir, filename);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid file type. Must be pdf, data, or transaction.' 
        });
    }
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`[API] delete-file: Deleted ${filepath}`);
      res.json({ 
        success: true, 
        message: `Successfully deleted ${filename}` 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }
  } catch (error) {
    console.error('[API] delete-file: Error occurred:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete file.' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 