# 🍪 Cookie Gallery

Welcome to the Cookie Gallery, a modern, full-stack e-commerce application for a delightful cookie store. This project features an interactive and animated frontend built with React and a secure backend powered by Node.js for handling payments with Razorpay.

## ✨ Features

*   **Aesthetic Hero Section**: A beautiful, full-width hero to welcome users.
*   **Interactive Cookie Showcase**: A responsive gallery of cookies with hover animations using Framer Motion.
*   **Dynamic Shopping Cart**: Add, remove, and update cookie quantities with a temporary state that resets on reload.
*   **Secure Payment Integration**: A complete payment flow handled by a dedicated Node.js backend using the Razorpay SDK.
*   **Modern UI**: A clean user interface styled with Tailwind CSS.

## 🛠️ Tech Stack

| Frontend                                | Backend                               |
| --------------------------------------- | ------------------------------------- |
| [React](https://reactjs.org/)           | [Node.js](https://nodejs.org/)        |
| [TypeScript](https://www.typescriptlang.org/) | [Express](https://expressjs.com/)     |
| [Vite](https://vitejs.dev/)             | [Razorpay SDK](https://razorpay.com/docs/payment-gateway/server-integration/nodejs/) |
| [Tailwind CSS](https://tailwindcss.com/)| [CORS](https://www.npmjs.com/package/cors) |
| [Framer Motion](https://www.framer.com/motion/) | [Dotenv](https://www.npmjs.com/package/dotenv) |
| [React Router](https://reactrouter.com/)|                                       |
| [React Icons](https://react-icons.github.io/react-icons/)|                                 |

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18.x or later recommended)
*   npm

### Installation & Setup

1.  **Clone the repository:**
    ```
    git clone https://github.com/your-username/cookie-gallery.git
    cd cookie-gallery
    ```
2.  **Install Frontend & Backend Dependencies:**
    ```
    npm install
    cd backend
    npm install
    cd ..
    ```
### Environment Variables

1.  **Frontend (`/.env`):**
    ```
    VITE_RAZORPAY_KEY_ID=rzp_test_YourPublicKeyHere
    ```
2.  **Backend (`/backend/.env`):**
    ```
    RAZORPAY_KEY_ID=rzp_test_YourPublicKeyHere
    RAZORPAY_KEY_SECRET=YourSecretKeyHere
    ```
### Running the Application

Start both the frontend and backend servers with a single command from the root directory:

Note: Procuring credentials from Razorpay is mandatory to run.
..
