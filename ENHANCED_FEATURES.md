# Enhanced Bank Statement Reader Features

## Overview

This document describes the new enhanced features that have been added to the Bank Statement Reader application.

## New Features

### 1. Split Gmail Modules

The Gmail fetching functionality has been split into two distinct modules:

#### Transaction Alerts (`gmail-txn-alert`)

- Fetches real-time transaction notifications
- Searches for emails with subjects containing: transaction, debit, credit, withdrawal, deposit, payment, alert, notification
- From banks: SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, Union, Central
- From credit card providers: Visa, Mastercard, American Express, RuPay

#### Periodic Statements (`gmail-periodic-stmt`)

- Fetches monthly, quarterly, and annual statements
- Searches for emails with subjects containing: statement, summary, report, bill, monthly, quarterly, annual
- Same bank and credit card provider sources as transaction alerts

### 2. Date Range Filtering

- **From Date**: Optional start date for email fetching
- **To Date**: Optional end date for email fetching
- **Default Period**: Last 6 months if no dates specified
- Uses Gmail's built-in date filtering: `after:YYYY-MM-DD` and `before:YYYY-MM-DD`

### 3. Enhanced Email Fetching Options

- **Fetch Method**: Choose between two mutually exclusive methods:
  - **By Number of Emails**: Configurable number of emails to fetch (1-100, default: 50)
  - **By Date Range**: Fetch emails within a specific date range
- **Email Type**: Choose between:
  - `both`: Both transaction alerts and periodic statements
  - `transaction_alerts`: Only transaction alerts
  - `periodic_statements`: Only periodic statements

### 4. Transactions Hub

A consolidated view of all transactions with the following fields:

#### Transaction Fields

- **Transaction Date**: Date of the transaction
- **UTR Number/Reference**: Unique transaction reference number
- **Type**: Credit/Debit/Statement
- **Party Name**:
  - For credit transactions: "Received from [sender]"
  - For debit transactions: "Paid to [payee]"
- **Narration**: Transaction description
- **Amount**: Transaction amount in INR
- **Source**: Origin of the transaction data:
  - `gmail-txn-alert`: From transaction alert emails
  - `gmail-periodic-stmt`: From periodic statement emails

#### Features

- **6-Month Default**: Automatically pulls data from the last 6 months
- **Custom Date Range**: Optional from/to date selection
- **Consolidated View**: All transactions in one place regardless of source
- **Sorting**: Transactions sorted by date (newest first)

### 5. PDF Statement Reading

- **PDF Detection**: Automatically detects PDF attachments in emails
- **Password Support**: Handles password-protected PDFs
- **Password Hints**: Extracts password hints from email content
- **Common Passwords**: Supports common password patterns:
  - PAN number
  - Date of birth
  - Phone number
  - Account number
  - Customer ID
  - Name

### 6. Enhanced Data Extraction

- **UTR Numbers**: Extracts UTR/reference numbers from transaction emails
- **Merchant Names**: Identifies merchant/terminal names
- **Transaction Types**: Automatically categorizes as credit/debit
- **Amount Extraction**: Parses amounts in various formats (Rs., ₹, INR)
- **Date Parsing**: Extracts transaction dates from email content

## API Endpoints

### New Endpoints

#### 1. Enhanced Email Fetching

```
POST /api/fetch-emails-enhanced
```

**Request Body:**

```json
{
  "maxEmails": 50, // OR use fromDate/toDate, not both
  "fromDate": "2024-01-01", // Optional when using maxEmails
  "toDate": "2024-06-30", // Optional when using maxEmails
  "emailType": "both"
}
```

#### 2. Create Transactions Hub

```
POST /api/create-transactions-hub
```

**Request Body:**

```json
{
  "userId": "user_123",
  "fromDate": "2024-01-01",
  "toDate": "2024-06-30"
}
```

#### 3. Read PDF Statement

```
POST /api/read-pdf-statement
```

**Request Body:**

```json
{
  "emailId": "email_123",
  "password": "optional_password"
}
```

#### 4. Get Transactions Hub Files

```
GET /api/transactions-hub
```

#### 5. Get Specific Transactions Hub File

```
GET /api/transactions-hub/:filename
```

## Usage Instructions

### 1. Set Up User Profile

1. Go to "Profile Setup" tab
2. Fill in personal details and account information
3. Add bank accounts and credit cards
4. Add identifiers (PAN, DOB, phone) for PDF passwords
5. Save profile

### 2. Fetch Enhanced Emails

1. Go to "Fetch Data" tab
2. Select email type (transaction alerts, statements, or both)
3. Set maximum number of emails (1-100)
4. Optionally set from/to dates
5. Click "Fetch Enhanced Emails"

### 3. Create Transactions Hub

1. After fetching emails, click "Create Transactions Hub"
2. Optionally set custom date range
3. View consolidated transactions in "Transactions Hub" tab

### 4. View Transactions Hub

1. Go to "Transactions Hub" tab
2. Click "Load Transactions Hub"
3. Select a transactions hub file to view
4. View transactions in a table format with all details

## Data Structure

### Enhanced Email Data

```json
{
  "emails": [
    {
      "email_id": "string",
      "snippet": "string",
      "from_mail": "string",
      "subject": "string",
      "date": "string",
      "emailType": "gmail-txn-alert|gmail-periodic-stmt",
      "transactionDetails": {
        "type": "credit|debit",
        "amount": "number",
        "merchant": "string",
        "date": "string",
        "utrNumber": "string",
        "keywords": ["string"]
      },
      "statementDetails": {
        "statementType": "monthly|quarterly|annual",
        "period": "string",
        "passwordHint": "string",
        "identifiers": ["string"]
      },
      "pdfAttachments": [
        {
          "filename": "string",
          "size": "number",
          "attachmentId": "string"
        }
      ]
    }
  ],
  "metadata": {
    "total_emails": "number",
    "emailType": "string",
    "maxEmails": "number",
    "fromDate": "string",
    "toDate": "string",
    "fetch_date": "string"
  }
}
```

### Transactions Hub Data

```json
{
  "transactions": [
    {
      "txnDate": "string",
      "utrNumber": "string|null",
      "type": "credit|debit|statement",
      "partyName": "string",
      "narration": "string",
      "amount": "number",
      "source": "gmail-txn-alert|gmail-periodic-stmt"
    }
  ],
  "metadata": {
    "total_transactions": "number",
    "fromDate": "string",
    "toDate": "string",
    "userProfile": {
      "userId": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string"
    },
    "created_at": "string"
  }
}
```

## Technical Implementation

### File Structure

```
bank_statement/
├── data/                    # Stored email data
├── transactions_hub/        # Transactions hub files
├── users/                   # User profiles
├── server.ts               # Enhanced server with new endpoints
├── public/index.html       # Enhanced UI with new features
└── package.json            # Updated dependencies
```

### Dependencies Added

- `pdf-lib`: PDF manipulation library
- `pdf.js-extract`: PDF text extraction library

### Key Functions

- `buildEnhancedSearchQueries()`: Builds Gmail search queries for split modules
- `extractEnhancedTransactionDetails()`: Enhanced transaction data extraction
- `extractEnhancedStatementDetails()`: Enhanced statement data extraction
- `extractPDFAttachments()`: PDF attachment detection
- `extractTransactionsFromEmail()`: Transaction extraction for hub
- `extractAndReadPDF()`: PDF reading functionality

## Benefits

1. **Better Organization**: Split modules make it easier to manage different types of financial data
2. **Flexible Fetching**: Date ranges and email limits provide better control
3. **Consolidated View**: Transactions hub provides a single view of all financial activity
4. **Enhanced Data**: More detailed transaction information with UTR numbers and better categorization
5. **PDF Support**: Ability to read password-protected bank statements
6. **Scalable**: Can handle larger volumes of emails with configurable limits

## Future Enhancements

1. **Advanced PDF Parsing**: Full text extraction from PDF statements
2. **Transaction Categorization**: Automatic categorization of transactions by type
3. **Data Export**: Export transactions to CSV/Excel
4. **Analytics**: Spending patterns and financial insights
5. **Real-time Updates**: WebSocket support for real-time transaction updates
