# 🍪 Cookie Gallery

Welcome to the Cookie Gallery, a modern, full-stack e-commerce application for a delightful cookie store. This project features an interactive and animated frontend built with React, secure authentication with Firebase, and a robust backend powered by Node.js for handling payments with Razorpay integration.

## ✨ Features

### 🔐 **Authentication & User Management**
- **Firebase Authentication**: Secure sign-in with Google OAuth and Phone OTP
- **Protected Routes**: Role-based access control with authentication guards
- **User Profiles**: Automatic profile creation and management with Firestore
- **Session Management**: Persistent login state with browser local storage

### 🛒 **E-commerce Functionality**
- **Interactive Cookie Showcase**: Responsive gallery with hover animations using Framer Motion
- **Dynamic Shopping Cart**: Add, remove, and update quantities with real-time cart management
- **Secure Payment Integration**: Complete Razorpay payment flow with signature verification
- **Order Management**: Order creation, verification, and success tracking
- **Real-time Updates**: Live cart updates and payment status notifications

### 🎨 **User Interface & Experience**
- **Modern Design**: Clean, responsive UI styled with Tailwind CSS
- **Animated Components**: Smooth transitions and hover effects with Framer Motion
- **Customer Reviews**: Animated testimonials section with auto-scrolling
- **Mobile Responsive**: Optimized for all device sizes
- **Loading States**: Professional loading animations and skeleton screens

### 📱 **Additional Pages & Content**
- **Story Page**: Learn about the Cookie Gallery journey with interactive timeline
- **Behind the Scenes**: Detailed look at the cookie-making process
- **Privacy Policy**: Comprehensive privacy and data handling information
- **Order Success**: Beautiful confirmation page with order tracking

## 🛠️ Tech Stack

| Frontend | Backend | Database & Auth | Payment |
|----------|---------|----------------|---------|
| [React 19](https://reactjs.org/) | [Node.js](https://nodejs.org/) | [Firebase Auth](https://firebase.google.com/products/auth) | [Razorpay](https://razorpay.com/) |
| [TypeScript](https://www.typescriptlang.org/) | [Express 5](https://expressjs.com/) | [Firestore](https://firebase.google.com/products/firestore) | Payment Gateway |
| [Vite 7](https://vitejs.dev/) | [Firebase Admin SDK](https://firebase.google.com/products/admin-sdk) | Real-time Database | Signature Verification |
| [Tailwind CSS 4](https://tailwindcss.com/) | [Razorpay SDK](https://razorpay.com/docs/) | User Management | Webhook Support |
| [Framer Motion](https://www.framer.com/motion/) | [CORS](https://www.npmjs.com/package/cors) | Order Storage | |
| [React Router 7](https://reactrouter.com/) | [Dotenv](https://www.npmjs.com/package/dotenv) | | |
| [React Icons](https://react-icons.github.io/react-icons/) | Crypto (Built-in) | | |

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.x or later recommended)
- **npm** (v8.x or later)
- **Firebase Project** with Authentication and Firestore enabled
- **Razorpay Account** with API keys

### Installation & Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/Mohammad-Ghouse-virtuoso/cookie-gallery.git
   cd cookie-gallery
   \`\`\`

2. **Install Dependencies:**
   \`\`\`bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd src/backend
   npm install
   cd ../..
   \`\`\`

### Environment Configuration

#### 1. **Frontend Environment (\`.env\`):**
\`\`\`env
# App Configuration
VITE_APP_TITLE=Cookie Gallery
VITE_API_BASE_URL=http://localhost:5000

# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_YourPublicKeyHere

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Development Options
VITE_SHOW_AUTH_DIAGNOSTICS=true
\`\`\`

#### 2. **Backend Environment (\`src/backend/.env\`):**
\`\`\`env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_YourPublicKeyHere
RAZORPAY_KEY_SECRET=YourSecretKeyHere

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"

# Server Configuration
CORS_ORIGIN=http://localhost:5173
PORT=5000
\`\`\`

#### 3. **Firebase Service Account Setup:**
- Download your Firebase service account JSON file
- Place it in \`src/backend/\` as \`firebase-admin-sdk.json\`
- Ensure it's added to \`.gitignore\` for security

### Running the Application

#### Development Mode:

1. **Start the Backend Server:**
   \`\`\`bash
   # From project root
   cd src/backend
   node server.js
   \`\`\`
   Backend will run on: \`http://localhost:5000\`

2. **Start the Frontend Development Server:**
   \`\`\`bash
   # From project root (in a new terminal)
   npm run dev
   \`\`\`
   Frontend will run on: \`http://localhost:5173\`

#### Production Build:

\`\`\`bash
# Build the frontend
npm run build

# Preview the build
npm run preview
\`\`\`

## 📁 Project Structure

cookie-gallery/
├── public/
├── src/
│   ├── assets/
│   ├── backend/
│   ├── components/
│   ├── context/
│   ├── pages/
│   └── styles/
├── .env
├── .gitignore
├── package.json
└── README.md

## 🔒 Security Features

- **Firebase Authentication**: Industry-standard auth with OAuth2
- **Protected API Routes**: JWT token verification on backend
- **Razorpay Signature Verification**: Payment integrity validation
- **CORS Configuration**: Secure cross-origin resource sharing
- **Environment Variable Protection**: Sensitive data secured
- **Input Validation**: User input sanitization and validation

## 🌐 API Endpoints

### Authentication
- \`GET /health\` - Server health check with boot ID
- \`POST /save-user\` - Save user profile to Firestore

### Payments
- \`POST /create-order\` - Create new Razorpay order
- \`POST /verify-signature\` - Verify payment signature
- \`POST /save-order-data\` - Store order in database
- \`POST /api/razorpay-webhook\` - Handle payment webhooks

## 🚀 Deployment

### Frontend (Vercel)
\`\`\`bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
\`\`\`

### Backend (Railway/Heroku)
\`\`\`bash
# From src/backend directory
npm start
\`\`\`

## 📱 Contact Information

- **Location**: Hyderabad, IN
- **Phone**: +91-98765-43210
- **Email**: hello@cookie.gallery
- **FSSAI License**: 21004567891023

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Firebase for authentication and database services
- Razorpay for payment gateway integration
- Tailwind CSS for beautiful styling
- Framer Motion for smooth animations
- React team for the amazing framework

---

**Note**: Make sure to obtain valid credentials from Razorpay and Firebase before running the application. Both services are mandatory for full functionality.
