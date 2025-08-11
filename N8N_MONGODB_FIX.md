# N8N MongoDB Mapping Fix Guide

## Problem Analysis

The issue you're experiencing is that the output shows `[null]` values in the "[object Object]" column, indicating that the data isn't being properly mapped from your application to MongoDB through n8n.

## Root Cause

The original data structure sent to n8n was:

```json
{
  "emails": [...],
  "accountInfo": {...}
}
```

This structure doesn't map well to MongoDB's expected format. The n8n MongoDB node expects a clear, flat structure for insertion.

## Solution: Improved Data Structure

### 1. Updated Data Format

Your application now sends this improved structure:

```json
{
  "data": [
    {
      "email_id": "message_id",
      "snippet": "email content snippet",
      "from_mail": "sender@email.com",
      "account_details": {
        "bankAccount": "1234567890",
        "creditCard": "1234567890123456"
      },
      "bank_details": {
        "detected_keywords": ["balance", "account"],
        "text_length": 150
      },
      "timestamp": "2024-01-01T00:00:00.000Z",
      "processed_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "metadata": {
    "total_emails": 5,
    "account_info": {
      "bankAccount": "1234567890",
      "creditCard": "1234567890123456",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. N8N Workflow Configuration

#### Step 1: Webhook Node

- **Method**: POST
- **Path**: `/your-webhook-path`
- **Response Mode**: Respond to Webhook

#### Step 2: Set Node (Data Processing)

Add a Set node after the webhook to properly structure the data:

**Set Node Configuration:**

```json
{
  "json": {
    "data": "={{ $json.data }}",
    "metadata": "={{ $json.metadata }}"
  }
}
```

#### Step 3: MongoDB Node Configuration

**Connection:**

- Use your MongoDB credentials

**Operation:**

- **Operation**: Insert
- **Collection**: `data` (or your preferred collection name)

**Fields:**

- **Fields**: `{{ $json.data }}`

**Options:**

- **Upsert**: false (or true if you want to update existing records)
- **Ordered**: true

### 3. Alternative: Direct Field Mapping

If you prefer to map individual fields:

**MongoDB Node Fields Configuration:**

```json
{
  "email_id": "={{ $json.data[0].email_id }}",
  "snippet": "={{ $json.data[0].snippet }}",
  "from_mail": "={{ $json.data[0].from_mail }}",
  "account_details": "={{ $json.data[0].account_details }}",
  "bank_details": "={{ $json.data[0].bank_details }}",
  "timestamp": "={{ $json.data[0].timestamp }}",
  "processed_at": "={{ $json.data[0].processed_at }}"
}
```

### 4. For Multiple Records (Recommended)

To handle multiple email records, add a **Split In Batches** node:

1. **Split In Batches Node** (after Set node):

   - **Batch Size**: 1
   - **Options**: Keep Only Set

2. **MongoDB Node** (after Split In Batches):
   - **Fields**: `{{ $json }}`

## Testing the Fix

### 1. Test with Sample Data

Send this test payload to your n8n webhook:

```json
{
  "data": [
    {
      "email_id": "test_123",
      "snippet": "Your bank statement is ready",
      "from_mail": "bank@example.com",
      "account_details": {
        "bankAccount": "1234567890",
        "creditCard": null
      },
      "bank_details": {
        "detected_keywords": ["statement", "bank"],
        "text_length": 25
      },
      "timestamp": "2024-01-01T00:00:00.000Z",
      "processed_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "metadata": {
    "total_emails": 1,
    "account_info": {
      "bankAccount": "1234567890",
      "creditCard": null,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 2. Expected MongoDB Document

After successful insertion, you should see in MongoDB:

```json
{
  "_id": "ObjectId(...)",
  "email_id": "test_123",
  "snippet": "Your bank statement is ready",
  "from_mail": "bank@example.com",
  "account_details": {
    "bankAccount": "1234567890",
    "creditCard": null
  },
  "bank_details": {
    "detected_keywords": ["statement", "bank"],
    "text_length": 25
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processed_at": "2024-01-01T00:00:00.000Z"
}
```

## Debugging Steps

### 1. Check N8N Execution Logs

- Look for the red "Execute step" button error details
- Check the execution log for specific error messages

### 2. Verify Data Structure

- Use the Set node to log the incoming data structure
- Ensure the data matches the expected format

### 3. Test MongoDB Connection

- Verify your MongoDB credentials in n8n
- Test the connection directly in n8n

### 4. Check Collection Permissions

- Ensure your MongoDB user has write permissions to the collection

## Key Changes Made

1. **Structured Data**: Changed from flat array to structured object with `data` and `metadata`
2. **Field Extraction**: Added helper functions to extract email addresses and bank details
3. **Better Logging**: Enhanced logging to track data flow
4. **Type Safety**: Improved TypeScript types (though some linter warnings remain)

## Next Steps

1. Update your n8n workflow with the new configuration
2. Test with the sample data provided
3. Monitor the execution logs for any remaining issues
4. Verify that data is properly inserted into MongoDB

The main issue was that the original data structure wasn't compatible with n8n's MongoDB node expectations. The new structure provides clear, mappable fields that should resolve the `[null]` values you were seeing.
