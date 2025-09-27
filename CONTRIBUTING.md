# Contributing to 3D Sudoku Matrix

Thank you for your interest in contributing to 3D Sudoku Matrix! 🧩✨ This guide will help you get started with contributing to our multi-language microservices project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- ✅ Be respectful and inclusive
- ✅ Welcome newcomers and help them learn
- ✅ Focus on what is best for the community
- ✅ Show empathy towards other community members
- ❌ No harassment, trolling, or discriminatory language
- ❌ No spam or off-topic content

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** - JavaScript runtime
- **Docker & Docker Compose** - Container orchestration
- **Git** - Version control
- **Modern Browser** - Chrome, Firefox, Safari, or Edge

### Quick Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/3d-Matrix-Sukoku.git
   cd 3d-Matrix-Sukoku
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development environment**
   ```bash
   # Option 1: Full Docker setup (recommended)
   ./deploy.sh

   # Option 2: Frontend only
   npm run dev
   ```

4. **Verify setup**
   ```bash
   # Check frontend
   curl http://localhost:4200

   # Check API health (if using Docker)
   curl http://localhost:8080/health
   ```

## 🏗️ Development Setup

### Repository Structure

```
3d-Matrix-Sukoku/
├── 📁 .github/          # GitHub workflows & templates
├── 📁 backend/          # Microservices
│   ├── 📁 cpp/          # C++ solver service
│   ├── 📁 csharp/       # C# user management
│   ├── 📁 php/          # PHP leaderboard
│   └── 📁 gateway/      # Node.js API gateway
├── 📁 docker/           # Docker configurations
├── 📁 src/              # Frontend Angular app
├── 📄 README.md         # Project overview
├── 📄 ABOUT.md          # Detailed project info
├── 📄 QUICK_START.md    # Quick deployment guide
└── 📄 deploy.sh         # One-command deployment
```

### Service Development

#### Frontend (Angular PWA)
```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Serve production build
npm run preview
```

#### Backend Services

**C++ Solver Service**
```bash
cd backend/cpp
mkdir build && cd build
cmake ..
make
./bin/sudoku_solver
```

**C# User Management**
```bash
cd backend/csharp
dotnet restore
dotnet run
```

**PHP Leaderboard**
```bash
cd backend/php
composer install
php -S localhost:8083 index.php
```

**Node.js API Gateway**
```bash
cd backend/gateway
npm install
npm run dev
```

## 🎯 Project Structure

### Frontend Architecture
- **Angular 20+** with TypeScript
- **Tailwind CSS** for styling
- **Angular Signals** for state management
- **Service Workers** for PWA functionality
- **WebAssembly** integration for offline solving

### Backend Services
- **C++ Service** (Port 8081) - High-performance puzzle solving
- **C# Service** (Port 8082) - User management and authentication
- **PHP Service** (Port 8083) - Leaderboards and statistics
- **Node.js Gateway** (Port 8080) - API orchestration and WebSocket

## 📝 Contributing Guidelines

### Ways to Contribute

1. 🐛 **Bug Fixes** - Fix issues and improve stability
2. ✨ **New Features** - Add new game features or functionality
3. ⚡ **Performance** - Optimize algorithms and load times
4. 🎨 **UI/UX** - Improve user interface and experience
5. 📚 **Documentation** - Improve guides and API docs
6. 🧪 **Testing** - Add tests and improve coverage
7. 🏗️ **Architecture** - Enhance system design
8. 🌐 **Accessibility** - Improve inclusive design

### Issue First Policy

Before working on significant changes:
1. Check existing issues and PRs
2. Create an issue if one doesn't exist
3. Discuss the approach with maintainers
4. Get approval for major changes

### Branch Naming Convention

Use descriptive branch names:
- `feature/add-tournament-mode`
- `bugfix/solver-performance-issue`
- `docs/update-api-documentation`
- `refactor/improve-error-handling`

## 🔄 Pull Request Process

### Before Submitting

1. ✅ Ensure your branch is up to date with main
2. ✅ Run tests and ensure they pass
3. ✅ Test your changes locally
4. ✅ Update documentation if needed
5. ✅ Follow coding standards
6. ✅ Write clear commit messages

### PR Checklist

Use our [Pull Request Template](.github/pull_request_template.md) which includes:

- [ ] Description of changes
- [ ] Type of change (bugfix, feature, etc.)
- [ ] Testing completed
- [ ] Services affected
- [ ] Screenshots (for UI changes)
- [ ] Breaking changes noted
- [ ] Documentation updated

### Review Process

1. **Automated Checks** - CI/CD pipeline runs automatically
2. **Code Review** - Maintainers review your code
3. **Testing** - Verify functionality works as expected
4. **Approval** - Get approval from project maintainers
5. **Merge** - Changes are merged into main branch

## 💻 Coding Standards

### General Principles

- **Write clean, readable code**
- **Follow existing patterns**
- **Add comments for complex logic**
- **Use meaningful variable names**
- **Keep functions small and focused**

### Language-Specific Standards

#### TypeScript/JavaScript
```typescript
// ✅ Good
interface GameState {
  puzzle: number[][];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  startTime: Date;
}

// ❌ Avoid
let data: any = {};
```

#### HTML/Angular Templates
```html
<!-- ✅ Good: Semantic HTML with accessibility -->
<button 
  class="btn-primary" 
  [attr.aria-pressed]="isActive"
  (click)="handleClick()"
>
  Solve Puzzle
</button>

<!-- ❌ Avoid: Non-semantic, poor accessibility -->
<div class="button" (click)="solve()">Solve</div>
```

#### CSS/Tailwind
```css
/* ✅ Good: Utility-first with custom components */
.puzzle-cell {
  @apply w-12 h-12 border border-gray-300 text-center;
  @apply hover:bg-blue-50 focus:ring-2 focus:ring-blue-500;
}
```

### Backend Services

#### C++ Standards
```cpp
// ✅ Good: Clear naming and const correctness
class SudokuSolver {
public:
    std::vector<std::vector<int>> solve(const std::vector<std::vector<int>>& puzzle) const;
private:
    bool isValid(const std::vector<std::vector<int>>& board, int row, int col, int num) const;
};
```

#### C# Standards
```csharp
// ✅ Good: Follow .NET conventions
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    
    public async Task<ActionResult<UserDto>> GetUserAsync(int id)
    {
        // Implementation
    }
}
```

## 🧪 Testing Guidelines

### Frontend Testing
```bash
# Run unit tests (when available)
npm test

# Build test
npm run build

# End-to-end testing
# Test the application manually in different browsers
```

### Backend Testing
```bash
# Test individual services
curl http://localhost:8081/health  # C++
curl http://localhost:8082/health  # C#
curl http://localhost:8083/health  # PHP
curl http://localhost:8080/health  # Gateway

# Integration testing
./deploy.sh
# Verify all services are running and communicating
```

### Testing Checklist

- [ ] All existing tests pass
- [ ] New features have appropriate tests
- [ ] Edge cases are tested
- [ ] Error handling is tested
- [ ] Performance regressions checked
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested

## 📚 Documentation

### What to Document

1. **Code Changes** - Update inline comments
2. **API Changes** - Update API documentation
3. **New Features** - Add usage examples
4. **Setup Changes** - Update installation guides
5. **Breaking Changes** - Document migration steps

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Update README if functionality changes
- Keep CHANGELOG.md updated

## 🏷️ Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes

### Release Workflow

1. Create release PR with version bump
2. Update CHANGELOG.md
3. Tag release with `git tag v1.2.3`
4. Push tag to trigger release workflow
5. GitHub Actions builds and publishes automatically

## ❓ Getting Help

### Communication Channels

- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/GizzZmo/3d-Matrix-Sukoku/issues)
- 💡 **Feature Requests** - [GitHub Issues](https://github.com/GizzZmo/3d-Matrix-Sukoku/issues)
- 💬 **Discussions** - [GitHub Discussions](https://github.com/GizzZmo/3d-Matrix-Sukoku/discussions)
- 📧 **Email** - Contact project maintainers

### Common Questions

**Q: How do I add a new backend service?**
A: Create a new directory in `backend/`, add a Dockerfile, update docker-compose.yml, and create a health endpoint.

**Q: How do I modify the frontend design?**
A: Edit files in `src/`, use Tailwind CSS classes, and test responsiveness across devices.

**Q: How do I debug a service issue?**
A: Use `docker-compose logs [service-name]` and check the health endpoints.

**Q: How do I add a new API endpoint?**
A: Add the endpoint to the appropriate service and update the API gateway routing.

## 🎉 Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes for significant contributions
- README acknowledgments section

### Contribution Types

We recognize all types of contributions:
- 💻 Code contributions
- 📝 Documentation improvements  
- 🐛 Bug reports and testing
- 💡 Feature suggestions and feedback
- 🎨 Design and UX improvements
- 🌐 Translations and accessibility
- 📢 Community building and support

---

<div align="center">
  <h2>🚀 Ready to Contribute?</h2>
  <p>Join our community of developers building the future of puzzle gaming!</p>
  
  <p>
    <a href="https://github.com/GizzZmo/3d-Matrix-Sukoku/issues/new/choose">🐛 Report a Bug</a> •
    <a href="https://github.com/GizzZmo/3d-Matrix-Sukoku/issues/new/choose">💡 Request a Feature</a> •
    <a href="https://github.com/GizzZmo/3d-Matrix-Sukoku/fork">🍴 Fork & Start Coding</a>
  </p>
  
  **Thank you for making 3D Sudoku Matrix better! 🧩💫**
</div>