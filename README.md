# Reeni Backend 🚀

A Node.js/Express backend for the Reeni App - a loan/borrow tracking application with email reminders.

## 🌐 Live URL

**Backend:** https://reeni-server.vercel.app

## ✨ Features

- 📝 CRUD operations for loan/borrow items
- 👤 User-based data isolation (Firebase UID)
- 📧 Automated email reminders for overdue items
- 📜 History tracking
- 🔒 MongoDB Atlas integration

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Email:** Nodemailer (Gmail)
- **Scheduler:** node-cron + cron-job.org
- **Hosting:** Vercel

## 📡 API Endpoints

### Items (Loans/Borrows)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/new-list?userId=xxx` | Get all items for a user |
| POST | `/new-list` | Create new item |
| PUT | `/new-list/:id` | Update item |
| DELETE | `/new-list/:id` | Delete item |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/history?userId=xxx` | Get history for a user |
| POST | `/history` | Add to history |
| DELETE | `/history/:id` | Delete history item |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/check-overdue` | Manually trigger overdue check |
| POST | `/test-email` | Test email configuration |

## 📦 Data Structure

```json
{
  "userId": "firebase-user-uid",
  "amount": 100,
  "person": "Tanjim",
  "dueDate": "2025-12-25",
  "returnDate": "2025-01-10",
  "category": "lent",
  "returned": false,
  "email": "example@email.com"
}
```


## 🚀 Local Development

```bash
# Install dependencies
npm install

# Run with nodemon
npm run dev

# Or run directly
node index.js
```

## 📧 Email Reminders

- Automated daily check at 9:00 AM (Asia/Dhaka)
- Sends Bengali email reminders for overdue items
- Powered by cron-job.org for Vercel serverless

## 👨‍💻 Author

**Mehedi**

---

Made with ❤️ for Reeni App
