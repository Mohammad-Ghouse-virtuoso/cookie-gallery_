# Contributing to Cookie Gallery

Thank you for your interest in contributing to Cookie Gallery! This document provides guidelines and setup instructions.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- git-secrets (recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mohammad-Ghouse-virtuoso/cookie-gallery.git
   cd cookie-gallery
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd src/backend && npm install && cd ../..
   ```

3. **Setup environment variables**
   ```bash
   # Frontend
   cp .env.example .env
   
   # Backend
   cp src/backend/.env.example src/backend/.env
   ```
   
   Fill in the required values in both `.env` files.

4. **Install git-secrets (Security)**
   
   **macOS:**
   ```bash
   brew install git-secrets
   ```
   
   **Linux (Ubuntu/Debian):**
   ```bash
   sudo apt-get install git-secrets
   ```
   
   **Windows:**
   ```bash
   # Using Git Bash or WSL
   git clone https://github.com/awslabs/git-secrets.git
   cd git-secrets
   sudo make install
   ```

5. **Configure git-secrets for this repository**
   ```bash
   cd cookie-gallery
   git secrets --install
   git secrets --register-aws
   
   # Add custom patterns from our patterns file
   while IFS= read -r pattern; do
     [[ "$pattern" =~ ^#.*$ || -z "$pattern" ]] && continue
     git secrets --add "$pattern"
   done < .git-secrets-patterns
   ```

6. **Initialize Husky (Git Hooks)**
   ```bash
   npm run prepare
   ```
   
   This sets up pre-commit and pre-push hooks automatically.

## 🔧 Development Workflow

### Running the Application

**Frontend:**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Backend:**
```bash
cd src/backend
node server.js
# Runs on http://localhost:5000
```

### Testing

**Run all tests:**
```bash
npm run test
```

**Run tests in watch mode:**
```bash
npm run test -- --watch
```

**Run backend tests:**
```bash
cd src/backend
npm test
```

### Linting

**Check for linting errors:**
```bash
npm run lint
```

**Auto-fix linting errors:**
```bash
npm run lint:fix
```

### Git Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new features
   - Follow existing code style

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```
   
   The pre-commit hook will automatically:
   - Run `lint-staged` to fix and check staged files
   - Run `git-secrets` to scan for secrets
   - Run relevant tests for changed files
   
   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

4. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   The pre-push hook will:
   - Run the full test suite
   - Run linter on entire codebase
   - Block push if tests fail

5. **Create a Pull Request**
   - Go to GitHub and create a PR
   - Describe your changes
   - Link any related issues

## 🔒 Security Guidelines

### Secrets Management
- **NEVER** commit API keys, tokens, or credentials
- Always use environment variables for sensitive data
- git-secrets will automatically block commits with detected secrets
- If you accidentally commit a secret, rotate it immediately and use `git filter-branch` or BFG Repo Cleaner

### Bypassing Git Hooks (Not Recommended)
If absolutely necessary (emergencies only):
```bash
git commit --no-verify
git push --no-verify
```

### Adding Exceptions to git-secrets
If a pattern is incorrectly flagged as a secret:
```bash
git secrets --add --allowed 'pattern-to-allow'
```

## 🧪 Testing Guidelines

### Writing Tests
- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

**Example:**
```typescript
describe('PaymentService', () => {
  test('should successfully finalize order with matching amounts', async () => {
    // Arrange
    const mockOrder = { totalAmount: 1000, status: 'pending' };
    
    // Act
    const result = await paymentService.finalizeOrder('order_123', providerData);
    
    // Assert
    expect(result.success).toBe(true);
  });
});
```

### Running Specific Tests
```bash
npm test -- src/components/NavBar.test.tsx
```

## 📝 Code Style

- Use TypeScript for all new frontend code
- Use ES6+ features
- Follow ESLint rules
- Use meaningful variable names
- Comment complex logic
- Keep functions small and focused

## 🐛 Reporting Bugs

Create an issue on GitHub with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Browser/Node version

## 💡 Requesting Features

Create an issue with:
- Feature description
- Use case
- Proposed implementation (optional)

## 📚 Additional Resources

- [React 19 Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Vitest Documentation](https://vitest.dev)

## ❓ Getting Help

- Check existing issues
- Review documentation
- Ask in discussions
- Contact maintainers

---

**Happy Coding! 🍪**
