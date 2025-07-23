# 🧠 Agentic Onboarding Portal

A full-stack, AI-powered web platform with **RAG (Retrieval-Augmented Generation)** architecture to help users seamlessly apply for **Credit Cards**, **Personal Loans**, and **Bank Accounts** — featuring intelligent document processing, CIBIL score integration, and personalized recommendations.

---

### 🌍 Live Demo
🔗 [Access the Deployed Application](https://agentic-onboarding-portal.vercel.app/)

---

## 🚀 Features

- 🤖 **Advanced AI-Powered RAG System**  
  Multi-layered Retrieval-Augmented Generation using OpenAI GPT-4o with content-based filtering, collaborative filtering, and hybrid recommendation algorithms inspired by modern product recommendation systems.

- 🔬 **Machine Learning Recommendation Engine**  
  Content-based filtering using cosine similarity, collaborative filtering for user behavior analysis, and hybrid approaches combining multiple recommendation strategies.

- 📊 **Advanced Analytics & A/B Testing**  
  Real-time recommendation performance tracking, user interaction analytics, A/B testing framework for algorithm optimization, and comprehensive recommendation insights.

- 💬 **Enhanced Chatbot Interaction**  
  Intelligent chatbot with CIBIL score integration and personalized financial advice using advanced prompt engineering.
- 🧾 **Smart Form Submission with OCR**  
  Separate forms for:
  - Credit Card Applications
  - Personal Financing / Loan
  - Account Opening
  Enhanced with Tesseract.js OCR for automatic document data extraction and validation.

- 📁 **Agentic AI Document Processing**  
  Advanced OCR with Tesseract.js for automatic text recognition and document linking.
  Supports Aadhaar, PAN, Passport, Payslip, Bank Statements with intelligent data extraction.

- 📊 **CIBIL Score Integration**  
  Real-time credit score checking with mock API (easily replaceable with real CIBIL API).
  Instant eligibility assessment and personalized recommendations.

- 🎯 **RAG-Based Recommendations**  
  Web scraping of ICICI Bank credit card data with vector database storage.
  Intelligent matching of customer profiles with suitable credit card options using ChromaDB and OpenAI embeddings.
- 🔒 **Authentication**  
  - Secure user login and signup  
  - JWT-based token system with refresh handling  
  - Tokens managed via HTTP-only cookies
  - Mandatory field validation for enhanced security

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
- **RAG Architecture:**
  - OpenAI GPT-4o for LLM
  - ChromaDB for vector storage
  - OpenAI Embeddings (text-embedding-3-large)
  - LangChain for document processing
- **Advanced Recommendation System:**
  - Content-based filtering with feature extraction
  - Collaborative filtering for user behavior analysis
  - Hybrid recommendation algorithms
  - Real-time analytics and A/B testing framework
  - Cosine similarity calculations for card matching
- JWT Authentication
- **Document Processing:**
  - Tesseract.js for OCR
  - Sharp for image preprocessing
  - PDF parsing capabilities
- **Web Scraping:**
  - Puppeteer for dynamic content
  - Cheerio for HTML parsing
- Multer for file uploads
- Nodemailer for email services
- Cloudinary SDK
- CIBIL Score API integration (with mock fallback)

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

# OpenAI Configuration (Required for RAG)
OPENAI_API_KEY=your_openai_api_key_here

# ChromaDB Configuration
CHROMA_URL=http://localhost:8000

# CIBIL API Configuration (Optional - will use mock if not provided)
CIBIL_API_URL=https://api.cibil.com/v1
CIBIL_API_KEY=your_cibil_api_key
CIBIL_MOCK_MODE=true

CLOUDINARY_CLOUD_NAME=yourCloudinaryCloud
CLOUDINARY_API_KEY=yourKey
CLOUDINARY_API_SECRET=yourSecret
```

### 🗄️ Setting up ChromaDB (Vector Database)

1. Install ChromaDB:
```bash
pip install chromadb
```

2. Start ChromaDB server:
```bash
chroma run --host localhost --port 8000
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
cd frontend
npm install
npm run dev
```

### 🚀 RAG System Setup

1. **Initialize the RAG system:**
```bash
# Start ChromaDB
chroma run --host localhost --port 8000

# Start backend server
cd backend && npm run dev
```

2. **Scrape and index ICICI Bank data:**
```bash
# Make a POST request to scrape and index data
curl -X POST http://localhost:7000/api/v1/rag/scrape-and-index \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

3. **Test recommendations:**
```bash
curl -X POST http://localhost:7000/api/v1/rag/recommendations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "income": 500000,
    "employmentType": "salaried",
    "panNumber": "ABCDE1234F",
    "spendingCategories": ["dining", "shopping"],
    "preferredRewards": ["cashback"],
    "annualFeeTolerance": "moderate"
  }'
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
| **RAG System Routes** |
| GET    | `/api/v1/rag/health`    | Check RAG system health |
| POST   | `/api/v1/rag/scrape-and-index` | Scrape ICICI data and index |
| POST   | `/api/v1/rag/recommendations` | Get AI-powered recommendations |
| POST   | `/api/v1/rag/cibil-score` | Get CIBIL score |
| POST   | `/api/v1/rag/process-document` | OCR document processing |
| GET    | `/api/v1/rag/search` | Search credit cards |
| **Advanced Analytics Routes** |
| GET    | `/api/v1/rag/analytics` | Get recommendation analytics |
| POST   | `/api/v1/rag/track-interaction` | Track user interactions |
| GET    | `/api/v1/rag/ab-test-results` | Get A/B test results |

---

## 📬 Sample Use Flow

1. User logs in / signs up
2. **Enhanced Chatbot Flow:**
   - AI-powered conversation: `Hi! I'm your Smart Financial Assistant powered by AI`
   - User selects "Credit Card"
   - PAN is collected → Real/Mock CIBIL score fetched
   - User preferences collected (income, spending, rewards)
   - **RAG system generates personalized recommendations**
3. **Smart Application Process:**
   - User fills form with mandatory field validation
   - Documents uploaded and processed with OCR
   - Automatic data extraction and validation
   - Enhanced document verification
4. **AI-Powered Results:**
   - Intelligent approval/rejection based on multiple factors
   - Detailed validation summary with OCR results
   - Email confirmation with application status ✅

---

## 🧪 Future Additions

- ✅ OpenAI GPT-4o integration for conversational intelligence
- ✅ RAG-based recommendation system
- ✅ Advanced machine learning recommendation algorithms
- ✅ Real-time analytics and A/B testing framework
- ✅ CIBIL score API integration
- ✅ Advanced OCR with document linking
- Real CIBIL score API
- Admin dashboard to review applications
- PDF application exports
- Multi-bank support (HDFC, SBI, Axis)
- Advanced fraud detection
- Real-time application tracking

---

## 🏗️ RAG Architecture Details

### Data Flow:
1. **Web Scraping:** Puppeteer scrapes ICICI Bank credit card pages
2. **Document Processing:** LangChain splits content into chunks
3. **Embedding Generation:** OpenAI creates vector embeddings
4. **Vector Storage:** ChromaDB stores embeddings with metadata
5. **Feature Extraction:** Advanced algorithms extract customer and card features
6. **Similarity Calculation:** Cosine similarity between customer profile and cards
7. **Multi-Algorithm Processing:** Content-based, collaborative, and hybrid filtering
8. **A/B Testing:** Algorithm performance comparison and optimization
9. **Analytics Tracking:** Real-time performance monitoring and insights
10. **LLM Generation:** GPT-4o generates personalized recommendations with explanations

### Key Components:
- **Vector Database:** ChromaDB for similarity search
- **Embeddings:** OpenAI text-embedding-3-large (3072 dimensions)
- **LLM:** GPT-4o for natural language generation
- **Recommendation Algorithms:** Content-based filtering, collaborative filtering, hybrid approaches
- **Analytics Engine:** Real-time tracking, A/B testing, performance metrics
- **Feature Engineering:** Customer profiling, card feature extraction, similarity calculations
- **Document Chunking:** Recursive character text splitter
- **Web Scraping:** Puppeteer + Cheerio for dynamic content

---

## 🙌 Author

**Swapnil Garg**  
📧 [LinkedIn](https://www.linkedin.com/in/spacifier4040)  
🌐 [GitHub](https://github.com/Spacifier)

**Shubham**  
📧 [LinkedIn](https://www.linkedin.com/in/shubham-s07/)  
🌐 [GitHub](https://www.github.com/Shubham07102003)

[![Deploy on Vercel](https://vercel.com/button)](https://agentic-onboarding-portal.vercel.app/)
