﻿# 🧠 Agentic Onboarding Portal

A full-stack, chatbot-powered web platform to help users seamlessly apply for **Credit Cards**, **Personal Loans**, and **Bank Accounts** — featuring document upload, smart validation, and secure authentication.

---

### 🌍 Live Demo
🔗 [Access the Deployed Application](https://agentic-onboarding-portal.vercel.app/)

---

## 🚀 Features

- 💬 **Chatbot Interaction**  
  Guides users step-by-step for Credit Card, Loan, and Account onboarding using dynamic prompts.

- 🧾 **Smart Form Submission**  
  Separate forms for:
  - Credit Card Applications
  - Personal Financing / Loan
  - Account Opening

- 📁 **Document Upload & Validation**  
  Users can upload Aadhaar, PAN, Passport, Payslip, and more.  
  Integrated with ABBYY OCR (or mock/optional Tesseract fallback).

- 🔒 **Authentication**  
  - Secure user login and signup  
  - JWT-based token system with refresh handling  
  - Tokens managed via HTTP-only cookies

- 📧 **Email Notifications**  
  Automatic email confirmations with application status

- ☁️ **Cloud Storage**  
  Document uploads saved to Cloudinary (temporary local fallback also supported)

---

## 🛠️ Tech Stack

**Frontend:**
- React.js + Vite
- React Router
- Axios

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Multer for file uploads
- Nodemailer for email services
- Cloudinary SDK
- ABBYY OCR (mocked or real)

---

## ⚙️ Environment Variables

Create a `.env` file inside the `/backend` directory:

```env
PORT=7000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net
CORS_ORIGIN = *
ACCESS_TOKEN_SECRET=yourAccessSecret
REFRESH_TOKEN_SECRET=yourRefreshSecret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

GMAIL_USER=your@gmail.com
GMAIL_PASS=yourAppPassword

ABBYY_CLIENT_ID = yourClientId
ABBYY_CLIENT_SECRET = yourClientSecret
ABBYY_SKILL_ID = yourSkillId


CLOUDINARY_CLOUD_NAME=yourCloudinaryCloud
CLOUDINARY_API_KEY=yourKey
CLOUDINARY_API_SECRET=yourSecret
```

---

## ▶️ Running Locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

---

## 🔐 Key API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST   | `/api/v1/user/register` | Register new user |
| POST   | `/api/v1/user/login`    | Login with username or email |
| GET    | `/api/v1/user/current-user` | Fetch user data (JWT protected) |
| POST   | `/api/upload-docs`      | Submit application form & documents |
| POST   | `/api/chat`             | Start chatbot interaction |

---

## 📬 Sample Use Flow

1. User logs in / signs up
2. Chatbot initiates conversation: `Hi! How can I assist you today?`
3. User selects “Credit Card”
4. PAN is collected → mock CIBIL generated
5. Based on CIBIL, form link is suggested
6. User submits form with documents
7. Documents validated
8. Confirmation email is sent with application number & status ✅

---

## 🧪 Future Additions

- Azure OpenAI integration for conversational intelligence
- Real CIBIL score API
- Admin dashboard to review applications
- PDF application exports

---

## 🙌 Author

**Swapnil Garg**  
📧 [LinkedIn](https://www.linkedin.com/in/spacifier4040)  
🌐 [GitHub](https://github.com/Spacifier)

**Shubham**  
📧 [LinkedIn](https://www.linkedin.com/in/shubham-s07/)  
🌐 [GitHub](https://www.github.com/Shubham07102003)

[![Deploy on Vercel](https://vercel.com/button)](https://agentic-onboarding-portal.vercel.app/)
