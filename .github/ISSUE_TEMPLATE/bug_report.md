---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: ['bug', 'needs-triage']
assignees: ''
---

## 🐛 Bug Description
A clear and concise description of what the bug is.

## 🔄 Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## ✅ Expected Behavior
A clear and concise description of what you expected to happen.

## ❌ Actual Behavior
A clear and concise description of what actually happened.

## 📸 Screenshots
If applicable, add screenshots to help explain your problem.

## 💻 Environment
**Desktop:**
- OS: [e.g. Windows 10, macOS 12, Ubuntu 20.04]
- Browser: [e.g. Chrome 91, Firefox 89, Safari 14]
- Version: [e.g. 1.0.0]

**Mobile:**
- Device: [e.g. iPhone 12, Samsung Galaxy S21]
- OS: [e.g. iOS 14.6, Android 11]
- Browser: [e.g. Safari, Chrome Mobile]

**Deployment:**
- Method: [e.g. Docker, npm dev, production build]
- Node.js version: [e.g. 20.1.0]
- Docker version: [e.g. 20.10.17]

## 🔧 Service Information
**Which services are affected?**
- [ ] Frontend (Angular PWA)
- [ ] API Gateway (Node.js)
- [ ] C++ Solver Service
- [ ] C# User Management
- [ ] PHP Leaderboard
- [ ] Database (MongoDB/Redis)

## 📋 Additional Context
Add any other context about the problem here.

## 🔍 Error Logs
If applicable, paste any error messages or logs:

```
Paste error logs here
```

## 🏥 Health Check Results
If possible, paste the output of `curl http://localhost:8080/health`:

```json
{
  "status": "healthy",
  "services": {...}
}
```

## 🚀 Workaround
If you found a temporary workaround, please describe it here.

---

**Priority:** 
- [ ] Low - Minor issue, doesn't affect core functionality
- [ ] Medium - Affects some functionality but has workarounds
- [ ] High - Affects core functionality, no known workarounds
- [ ] Critical - System is unusable