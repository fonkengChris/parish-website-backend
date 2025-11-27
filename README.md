# Parish Website Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB Atlas connection string and JWT secret.

### Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

Optional - Email Service (SMTP):
- `SMTP_HOST` - SMTP server host (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASSWORD` - SMTP password or app password
- `SMTP_FROM_EMAIL` - From email address (defaults to SMTP_USER)
- `SMTP_FROM_NAME` - From name (defaults to "Parish Website")

Optional - WhatsApp Messaging (Twilio):
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - WhatsApp-enabled Twilio number (E.164 format)
- `TWILIO_PHONE_NUMBER` - Optional fallback voice/SMS number

4. Run the server:
```bash
npm run dev
```

## API Endpoints

- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token
- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create announcement (admin)
- `GET /api/events` - Get all events
- `POST /api/events` - Create event (admin)
- `GET /api/mass-schedule` - Get mass schedule
- `POST /api/mass-schedule` - Create schedule (admin)
- `GET /api/ministries` - Get all ministries
- `POST /api/ministries` - Create ministry (admin)
- `GET /api/gallery` - Get gallery items
- `POST /api/gallery` - Create gallery item (admin)
- `POST /api/prayer-requests` - Submit prayer request
- `GET /api/prayer-requests` - Get all requests (admin)
- `GET /api/notifications/status` - Get notification service status (admin)
- `GET /api/notifications/history` - Get notification history (admin)
- `POST /api/notifications/send` - Send notification (admin)
- `POST /api/notifications/send-bulk` - Send bulk notifications (admin)


