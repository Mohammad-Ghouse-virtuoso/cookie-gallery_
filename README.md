# 🍪 Cookie Gallery

[![CI](https://github.com/Mohammad-Ghouse-virtuoso/cookie-gallery_stripe/actions/workflows/ci.yml/badge.svg)](https://github.com/Mohammad-Ghouse-virtuoso/cookie-gallery_stripe/actions)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://cookie-gallery.vercel.app)

**Full-stack e-commerce cookie store** with Stripe payments, Firebase auth, and 155+ automated tests.

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Mohammad-Ghouse-virtuoso/cookie-gallery_stripe.git
cd cookie-gallery_stripe

# Install
npm install
cd src/backend && npm install && cd ../..

# Configure (copy and fill in your keys)
cp .env.example .env
cp src/backend/.env.example src/backend/.env

# Run
npm run dev          # Frontend: http://localhost:5173
cd src/backend && node server.js  # Backend: http://localhost:5000
```

## 🛠️ Tech Stack

| Layer        | Tech                                     |
| ------------ | ---------------------------------------- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Backend**  | Node.js, Express                         |
| **Auth**     | Firebase (Google Sign-In)                |
| **Database** | Firestore                                |
| **Payments** | Stripe Checkout                          |
| **Testing**  | Vitest (80), Jest (75), Playwright       |
| **CI/CD**    | GitHub Actions, Vercel                   |

## ✨ Features

- 🔐 **Google Sign-In** with Firebase Auth
- 💳 **Stripe Checkout** with secure payment flow
- 📦 **Order History** with Firestore persistence
- 🧾 **Custom Receipts** with confetti celebration
- 🛒 **Session-scoped Cart** (resets on refresh by design)
- 📱 **Fully Responsive** mobile-first design

## 🧪 Testing

```bash
npm run test              # Frontend (80 tests)
npm run test:backend      # Backend (75 tests)
npm run test:e2e          # E2E with Playwright
```

## 📁 Project Structure

```
├── src/
│   ├── components/       # React components
│   ├── pages/            # Route pages
│   ├── context/          # Auth & Cart providers
│   ├── backend/          # Express API server
│   └── lib/              # Utilities & storage
├── e2e/                  # Playwright tests
└── .github/workflows/    # CI pipeline
```

## 🔑 Environment Variables

**Frontend (`.env`)**

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

**Backend (`src/backend/.env`)**

```env
STRIPE_SECRET_KEY=sk_test_...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## 📄 License

MIT

---

**Built by [Mohammad Ghouse](https://github.com/Mohammad-Ghouse-virtuoso)** 🍪..
