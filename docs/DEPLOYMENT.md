# Backend Deployment Guide

This guide explains how to deploy the backend to a cloud platform so that the email webhook (for receiving teacher replies) works permanently without needing ngrok.

## Why Deploy?

The current setup requires ngrok because:
1. Teachers receive emails when students create tickets
2. Teachers reply to these emails
3. Mailgun forwards these replies via **webhook** to your backend
4. Webhooks require a **publicly accessible URL** (not localhost)

## Option 1: Deploy to Render.com (Recommended - Free)

### Steps:

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment config"
   git push origin master
   ```

2. **Create a Render account** at https://render.com (sign in with GitHub)

3. **Create a new Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: `advising-backend`
     - Region: Hong Kong (or closest)
     - Branch: `master`
     - Build Command: `npm install`
     - Start Command: `npm run start:prod`
   - Click "Advanced" to add Environment Variables

4. **Add Environment Variables** (key = value):
   ```
   MONGODB_URI=mongodb+srv://<your.mongodb connection string>
   JWT_SECRET=<a long random string>
   PORT=10000
   FRONTEND_URL=https://your-frontend.onrender.com
   
   # Mailgun (your existing credentials)
   MAILGUN_API_KEY=key-xxx
   MAILGUN_DOMAIN=sandboxxxx.mailgun.org
   MAILGUN_URL=https://api.mailgun.net
   
   # Email settings
   TEACHER_EMAIL=your-teacher@email.com
   PUBLIC_URL=https://advising-backend.onrender.com
   
   # Dify chat (optional)
   DIFY_API_KEY=app-xxx
   DIFY_BASE_URL=https://api.dify.ai/v1
   ```

5. **Deploy** - Click "Create Web Service"

6. **Update Mailgun Webhook**
   - After deployment, you'll get a URL like: `https://advising-backend.onrender.com`
   - Go to Mailgun Dashboard → Webhooks
   - Update the inbound webhook URL to: `https://advising-backend.onrender.com/api/tickets/webhook/email-reply`

---

## Option 2: Deploy to Railway

1. **Push code to GitHub**

2. **Create Railway project**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"

3. **Add Environment Variables** in Railway dashboard (same as above)

4. **Deploy** - Railway will automatically build and deploy

5. **Update Mailgun Webhook** to: `https://your-railway-app.railway.app/api/tickets/webhook/email-reply`

---

## Option 3: Deploy to Fly.io

1. **Install flyctl**: `brew install flyctl`

2. **Initialize**: `fly launch` in backend directory

3. **Set secrets**:
   ```bash
   fly secrets set MONGODB_URI="..."
   fly secrets set JWT_SECRET="..."
   fly secrets set TEACHER_EMAIL="..."
   # etc.
   ```

4. **Deploy**: `fly deploy`

5. **Update Mailgun Webhook**

---

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for JWT tokens | Random 32+ char string |
| `PORT` | Server port (cloud: 10000) | `10000` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://...vercel.app` |
| `MAILGUN_API_KEY` | Mailgun API key | `key-xxx` |
| `MAILGUN_DOMAIN` | Mailgun domain | `sandboxxxx.mailgun.org` |
| `TEACHER_EMAIL` | Teacher's email | `teacher@polyu.edu.hk` |
| `PUBLIC_URL` | Your deployed backend URL | `https://...onrender.com` |
| `DIFY_API_KEY` | Dify API key (optional) | `app-xxx` |
| `DIFY_BASE_URL` | Dify API URL | `https://api.dify.ai/v1` |

---

## Update Mailgun Webhook

After deploying, you MUST update the webhook URL:

1. Login to Mailgun Dashboard
2. Go to **Webhooks** (or **Routes** for inbound)
3. Find the inbound route/webhook
4. Update the URL to:
   ```
   https://YOUR-DEPLOYED-BACKEND-URL/api/tickets/webhook/email-reply
   ```

---

## Testing Locally with ngrok (for development)

If you still want to test locally:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start ngrok
ngrok http 5001

# Update Mailgun webhook to ngrok URL during testing
```

---

## Troubleshooting

### "MongoDB connection error"
- Check your `MONGODB_URI` is correct
- For MongoDB Atlas, whitelist Render/Railway IP in Atlas Network Access

### "CORS error" in browser
- Ensure `FRONTEND_URL` matches your frontend URL exactly

### "Mailgun webhook not working"
- Check Mailgun webhook logs in Mailgun Dashboard
- Ensure the webhook URL is publicly accessible (not localhost)

### "Token expired" errors
- Ensure `JWT_SECRET` is the same across redeployments
