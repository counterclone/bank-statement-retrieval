# Bank Statement Email Reader - Setup Guide

## Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration (for manual insertion)
MONGODB_URI=mongodb://localhost:27017/bank_statements
MONGODB_DATABASE=bank_statements
MONGODB_COLLECTION=email_data

# Optional: MongoDB Atlas (if using cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bank_statements?retryWrites=true&w=majority
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set Application Type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback` (for development)
   - `https://yourdomain.com/api/auth/callback` (for production)
7. Copy the Client ID and Client Secret to your `.env.local` file

## Installation & Running

### Install Dependencies

```bash
npm install
```

### Run the Application

**Option 1: TypeScript (Recommended)**

```bash
npm run ts:dev
```

**Option 2: JavaScript**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## MongoDB Manual Insertion

The application now stores data as JSON files in the `data/` directory. To manually insert this data into MongoDB:

### 1. MongoDB Setup

Install MongoDB locally or use MongoDB Atlas (cloud).

### 2. Database Structure

The JSON files have this structure:

```json
{
  "emails": [
    {
      "email_id": "message_id",
      "snippet": "email content snippet",
      "from_mail": "sender@email.com",
      "subject": "Email Subject",
      "date": "Email Date",
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
    },
    "fetch_date": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. MongoDB Insertion Script

Create a script to insert JSON files into MongoDB:

```javascript
// insert-to-mongodb.js
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const MONGODB_URI = "mongodb://localhost:27017/bank_statements";
const DATABASE_NAME = "bank_statements";
const COLLECTION_NAME = "email_data";

async function insertJsonFiles() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const dataDir = path.join(__dirname, "data");
    const files = fs
      .readdirSync(dataDir)
      .filter((file) => file.endsWith(".json"));

    for (const file of files) {
      const filepath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filepath, "utf8");
      const data = JSON.parse(fileContent);

      // Insert each email as a separate document
      for (const email of data.emails) {
        const document = {
          ...email,
          source_file: file,
          metadata: data.metadata,
        };

        await collection.insertOne(document);
        console.log(`Inserted email ${email.email_id} from ${file}`);
      }
    }

    console.log("All files processed successfully");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

insertJsonFiles();
```

### 4. Run the Insertion Script

```bash
npm install mongodb
node insert-to-mongodb.js
```

## Features

### Current Functionality

- ✅ Google OAuth authentication
- ✅ Gmail API integration
- ✅ Email fetching with bank statement detection
- ✅ Local JSON file storage
- ✅ Frontend data display
- ✅ Responsive design
- ✅ Account information input
- ✅ Keyword detection for financial terms

### Data Flow

1. **Frontend** → User enters account details
2. **Backend** → Google OAuth authentication
3. **Gmail API** → Fetch emails with "statement" or "bank" in subject
4. **Processing** → Extract email details, detect keywords
5. **Storage** → Save as timestamped JSON file in `data/` directory
6. **Display** → Show stored files and email contents in frontend
7. **Manual DB** → Insert JSON files into MongoDB using provided script

## API Endpoints

| Endpoint                     | Method | Purpose                   |
| ---------------------------- | ------ | ------------------------- |
| `/api/auth`                  | GET    | Initiate Google OAuth     |
| `/api/auth/callback`         | GET    | OAuth callback handler    |
| `/api/fetch-emails`          | POST   | Fetch and store emails    |
| `/api/stored-data`           | GET    | List stored JSON files    |
| `/api/stored-data/:filename` | GET    | Get specific file content |
| `/api/hello`                 | GET    | Health check              |

## Security Notes

- Account numbers and credit cards are masked in logs
- OAuth tokens are stored in HTTP-only cookies
- No sensitive data is logged in plain text
- JSON files contain the same data that would be sent to external services

## Troubleshooting

### Common Issues

1. **OAuth Error**: Check Google Cloud Console credentials and redirect URIs
2. **Gmail API Error**: Ensure Gmail API is enabled in Google Cloud Console
3. **File Permission Error**: Check write permissions for the `data/` directory
4. **MongoDB Connection**: Verify MongoDB is running and connection string is correct

### Logs

The application uses rich logging format:

```
[API] <Routename>: <message>
```

Check console output for detailed error messages and data flow information.
