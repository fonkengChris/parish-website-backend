# Notification Service

A unified notification service that supports both email and SMS notifications.

## Overview

The notification service consists of three main components:

1. **EmailService** (`emailService.js`) - Handles email notifications via SMTP
2. **SMSService** (`smsService.js`) - Handles SMS notifications via Twilio
3. **NotificationService** (`notificationService.js`) - Unified interface for sending notifications

## Configuration

### Email Configuration (SMTP)

Set the following environment variables in your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Parish Website
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASSWORD`

**Other SMTP Providers:**
- Outlook: `smtp-mail.outlook.com:587`
- SendGrid: `smtp.sendgrid.net:587`
- Custom SMTP: Use your provider's settings

### SMS Configuration (Twilio)

Set the following environment variables in your `.env` file:

```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Twilio Setup:**
1. Sign up at https://www.twilio.com
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number or use a trial number
4. Use E.164 format for phone numbers (e.g., +1234567890)

## Usage

### Import the Service

```javascript
import notificationService from './services/notificationService.js';
```

### Send a Single Notification

```javascript
// Send email
const result = await notificationService.sendNotification({
  type: 'email',
  recipient: {
    email: 'user@example.com',
    name: 'John Doe'
  },
  subject: 'Welcome to Our Parish',
  message: 'Thank you for joining our parish community!',
  htmlMessage: '<h1>Welcome!</h1><p>Thank you for joining!</p>' // Optional
});

// Send SMS
const result = await notificationService.sendNotification({
  type: 'sms',
  recipient: {
    phone: '+1234567890',
    name: 'John Doe'
  },
  subject: '', // Not used for SMS
  message: 'Your prayer request has been received. Thank you!'
});

// Send both email and SMS
const result = await notificationService.sendNotification({
  type: 'both',
  recipient: {
    email: 'user@example.com',
    phone: '+1234567890',
    name: 'John Doe'
  },
  subject: 'Important Announcement',
  message: 'Mass schedule has been updated for this weekend.'
});
```

### Send Bulk Notifications

```javascript
const recipients = [
  { email: 'user1@example.com', phone: '+1234567890', name: 'User 1' },
  { email: 'user2@example.com', phone: '+1234567891', name: 'User 2' }
];

const result = await notificationService.sendBulkNotifications(recipients, {
  type: 'email',
  subject: 'Parish Announcement',
  message: 'Join us for special Mass this Sunday!'
});
```

### Get Notification History

```javascript
const history = await notificationService.getNotificationHistory(
  { status: 'sent' }, // filters
  { limit: 50, skip: 0 } // options
);
```

### Check Service Status

```javascript
const status = await notificationService.getServiceStatus();
// Returns: { email: {...}, sms: {...}, available: { email: true, sms: true } }
```

## API Endpoints

### GET /api/notifications/status
Get the status of email and SMS services. Requires admin authentication.

### GET /api/notifications/history
Get notification history with optional filters:
- `status` - Filter by status (pending, sent, failed, partially_sent)
- `type` - Filter by type (email, sms, both)
- `email` - Filter by recipient email
- `phone` - Filter by recipient phone
- `limit` - Number of results (default: 50)
- `skip` - Number of results to skip (default: 0)

### POST /api/notifications/send
Send a single notification. Requires admin authentication.

Request body:
```json
{
  "type": "email",
  "recipient": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "subject": "Welcome",
  "message": "Thank you for joining!",
  "htmlMessage": "<h1>Welcome!</h1>",
  "metadata": {}
}
```

### POST /api/notifications/send-bulk
Send notifications to multiple recipients. Requires admin authentication.

Request body:
```json
{
  "recipients": [
    { "email": "user1@example.com", "name": "User 1" },
    { "email": "user2@example.com", "name": "User 2" }
  ],
  "type": "email",
  "subject": "Announcement",
  "message": "Important update"
}
```

## Notification Model

Notifications are stored in the database with the following schema:

- `type` - 'email', 'sms', or 'both'
- `recipient` - Object with email, phone, and name
- `subject` - Notification subject
- `message` - Notification message
- `status` - Overall status (pending, sent, failed, partially_sent)
- `emailStatus` - Email delivery status
- `smsStatus` - SMS delivery status
- `error` - Error message if failed
- `metadata` - Additional metadata
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

## Error Handling

The service gracefully handles missing configuration. If email or SMS services are not configured, they will log a warning but not crash the application. When sending notifications:

- If a service is not configured, it will throw an error
- Partial failures are tracked (e.g., email sent but SMS failed)
- All notifications are logged in the database for audit purposes

## Integration Examples

### Send notification when announcement is created

```javascript
// In your announcement route
import notificationService from '../services/notificationService.js';

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const announcement = new Announcement(req.body);
  await announcement.save();
  
  // Notify parishioners
  if (req.body.notifyParishioners) {
    const parishioners = await Parishioner.find({ isActive: true })
      .populate('user', 'email');
    
    const recipients = parishioners
      .filter(p => p.user?.email)
      .map(p => ({ email: p.user.email, name: `${p.firstName} ${p.lastName}` }));
    
    await notificationService.sendBulkNotifications(recipients, {
      type: 'email',
      subject: `New Announcement: ${announcement.title}`,
      message: announcement.content
    });
  }
  
  res.json(announcement);
});
```

### Send SMS reminder for events

```javascript
// In your event route or scheduler
const result = await notificationService.sendNotification({
  type: 'sms',
  recipient: {
    phone: parishioner.phone,
    name: `${parishioner.firstName} ${parishioner.lastName}`
  },
  subject: '',
  message: `Reminder: ${event.title} is tomorrow at ${event.time}`
});
```

