# Gemini AI Integration for Transaction Processing

## Overview

This project now includes Google's Gemini AI for intelligent extraction and structuring of transaction data from email communications. The integration provides enhanced transaction processing capabilities with structured JSON responses.

## New API Endpoint

### `/api/process-transactions-gemini`

**Method:** POST  
**Authentication:** Required (Google OAuth)  
**Content-Type:** application/json

#### Request Body

```json
{
  "userId": "string",
  "queryType": "all|bank|credit|statements"
}
```

#### Response Format

```json
{
  "success": true,
  "message": "Successfully processed X emails and extracted Y transactions using Gemini AI",
  "filename": "gemini_transactions_all_2025-08-13T08-42-01-786Z.json",
  "data": {
    "transactions": [
      {
        "txn_date": "2024-01-15",
        "utr_number": "123456789012",
        "credit_debit": "credit",
        "rcvd_from_paid_to": "John Doe",
        "narration": "UPI transfer received",
        "txn_amount": 5000.0,
        "source": "gmail-txn-alert",
        "balance": {
          "amount": 15000.0,
          "source": "from-alert"
        },
        "password_combination": "PAN1234567890DOB1990-01-01",
        "email_id": "email_id_here",
        "processed_at": "2025-08-13T08:42:01.786Z"
      }
    ],
    "metadata": {
      "total_emails": 10,
      "total_transactions": 5,
      "queryType": "all",
      "userProfile": {
        "userId": "user_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "processed_at": "2025-08-13T08:42:01.786Z"
    }
  }
}
```

## Transaction Fields

Each transaction processed by Gemini AI includes the following fields:

1. **txn_date**: Transaction date in YYYY-MM-DD format
2. **utr_number**: UTR number or reference number (null if not available)
3. **credit_debit**: "credit" or "debit" based on transaction type
4. **rcvd_from_paid_to**:
   - For credit transactions: Sender's name
   - For debit transactions: Payee's name
5. **narration**: Transaction description or narration
6. **txn_amount**: Transaction amount (numeric value)
7. **source**: Source of transaction data ("gmail-txn-alert" or "gmail-periodic-stmt")
8. **balance**: Balance information with source
   - **amount**: Balance amount
   - **source**: "from-statement", "from-alert", or "derived"
9. **password_combination**: Password combination for PDF attachments (PAN, DOB, email, etc.)

## Balance Logic

- **from-statement/alert**: Balance mentioned in email content
- **derived**: Calculated based on previous transactions when not explicitly mentioned
- Preference order: from-statement/alert >> derived

## Password Combination Logic

- Extracts password hints from email text
- Uses user profile data (PAN, DOB, email) to construct combinations
- Returns the combination that would unlock PDF attachments

## Frontend Integration

### New Tab: "Gemini AI Processing"

The frontend includes a new tab for Gemini AI processing with:

- Data type selection (All, Bank, Credit, Statements)
- Maximum email limit (1-50 for efficiency)
- Real-time processing status
- Structured transaction display with all Gemini-extracted fields
- File management for processed results

### Features

1. **Intelligent Data Extraction**: Uses Gemini AI to understand email content and extract structured transaction data
2. **Enhanced Field Mapping**: Automatically maps transaction types, amounts, and party names
3. **Balance Tracking**: Intelligent balance calculation and source tracking
4. **Password Detection**: Automatic detection of PDF password combinations
5. **Error Handling**: Graceful handling of processing errors with detailed logging

## Environment Variables

Add these to your `.env.local` file:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
```

## Usage Flow

1. **Setup Profile**: Create user profile with PAN, DOB, and other identifiers
2. **Authenticate**: Complete Google OAuth authentication
3. **Process Data**: Use the "Gemini AI Processing" tab to process emails
4. **View Results**: Review structured transaction data with enhanced fields
5. **Export**: Download processed data as JSON files

## Technical Implementation

### Backend Components

1. **Gemini AI Client**: Uses `@google/generative-ai` package
2. **Prompt Engineering**: Structured prompts for consistent JSON responses
3. **Response Parsing**: Robust JSON parsing with error handling
4. **Data Validation**: Ensures all required fields are present
5. **File Storage**: Saves processed data to transactions hub directory

### Frontend Components

1. **Tab Interface**: Dedicated Gemini processing tab
2. **Real-time Status**: Loading indicators and progress updates
3. **Data Display**: Enhanced table view with all Gemini fields
4. **File Management**: Browse and load processed files

## Error Handling

- **Authentication Errors**: Redirects to Google OAuth
- **API Errors**: Detailed error messages with suggestions
- **Processing Errors**: Continues with other emails if one fails
- **JSON Parsing Errors**: Graceful fallback with logging

## Performance Considerations

- Limited to 50 emails per request for efficiency
- Asynchronous processing with progress updates
- Cached results for quick access
- Optimized prompts for faster AI responses

## Security

- User authentication required for all operations
- API keys stored securely in environment variables
- User data isolated by user ID
- No sensitive data logged in production

## Future Enhancements

1. **Batch Processing**: Process larger datasets
2. **Custom Prompts**: User-defined extraction rules
3. **Machine Learning**: Learn from user corrections
4. **Real-time Processing**: WebSocket-based live updates
5. **Export Formats**: CSV, Excel, and other formats
