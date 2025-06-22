# Personal Finance Email Reader Web App

This web application reads personal finance-related emails (such as bank statements) from a user's Gmail account and sends the parsed data to an n8n workflow via webhook.

## Features

- Google OAuth2 authentication (restricted to test users)
- Reads emails with keywords like 'statement' or 'bank' in the subject
- Sends parsed email data to an n8n webhook

## Setup

### 1. Clone the repository and install dependencies

```
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following content:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-endpoint
```

- Replace the values with your Google Cloud and n8n webhook details.

### 3. Start the Application

```
npm start
```

Visit [http://localhost:3000/auth](http://localhost:3000/auth) to begin authentication.

## n8n Workflow Setup

1. In your n8n instance, create a new workflow.
2. Add a **Webhook** node:
   - Set the HTTP Method to `POST`.
   - Copy the webhook URL and use it as `N8N_WEBHOOK_URL` in your `.env` file.
3. Add further nodes to process the incoming email data as needed (e.g., parse, store, notify).
4. Activate the workflow.

## Notes

- Only users added as test users in your Google Cloud OAuth consent screen can authenticate.
- This demo uses in-memory token storage. For production, use a database or session store.
