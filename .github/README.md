# GitHub Configuration

This directory contains GitHub configuration for the Lafken project, including templates, workflows, and policies.

## 📁 Structure

### `ISSUE_TEMPLATE/`
Templates for creating issues with predefined structure:
- **bug_report.md** - Template for reporting bugs
- **feature_request.md** - Template for requesting new features
- **documentation.md** - Template for documentation improvements
- **config.yml** - Template configuration (useful links, disable blank issues)

### `workflows/`
GitHub Actions workflows for CI/CD:
- **test.yml** - Runs tests on each push/PR
- **lint.yml** - Checks linting, formatting, and types
- **security.yml** - Security analysis and dependency auditing

### `pull_request_template.md`
Automatic template shown when creating Pull Requests. Includes validation checklist.

### `FUNDING.yml`
Configuration for sponsorship/donation options for the project.

### `copilot-instructions.md`
Custom instructions for GitHub Copilot about Lafken's architecture and patterns.

## 🚀 How to Use

### For Reporting Issues
1. Go to [Issues](https://github.com/Hero64/lafken/issues)
2. Click "New Issue"
3. Select the appropriate template:
   - 🐛 Report a Bug
   - ✨ Request a Feature
   - 📚 Documentation
4. Complete all fields

### For Creating Pull Requests
1. Create a branch from `main`
2. Make your changes
3. Push and open a Pull Request
4. The PR template will load automatically
5. Complete the required information
6. GitHub Actions will automatically check:
   - Tests passing
   - Correct linting
   - Valid TypeScript types
   - No vulnerabilities

### Automatic Workflows

#### Test (test.yml)
- Runs on: push to `main`, pull requests
- Checks: tests, coverage
- Uploads: results to Codecov

#### Lint (lint.yml)
- Runs on: push to `main`, pull requests
- Checks:
  - Code formatting (Biome)
  - Linting
  - Types (TypeScript)
  - Console logs

#### Security (security.yml)
- Runs on: push to `main`, pull requests, weekly
- Checks:
  - npm audit
  - Dependencies outdated
  - CodeQL analysis
  - Dependency check

## 📝 Files in Root

### CONTRIBUTING.md
Complete guide for contributors:
- Development setup
- How to report bugs
- How to request features
- PR process
- Code style
- Testing

### SECURITY.md
Security policy:
- How to report vulnerabilities
- Responsibilities
- Expected timeline
- Recommended practices

### CODE_OF_CONDUCT.md
Community code of conduct:
- Behavior standards
- Enforcement process
- How to report violations

## 🏷️ Suggested Labels

It's recommended to create these labels in GitHub:

**Type**
- `bug` - Bug reports
- `enhancement` - Improvements/new features
- `documentation` - Documentation changes
- `question` - Questions

**Status**
- `needs-review` - Awaiting review
- `in-progress` - Currently being worked on
- `blocked` - Blocked by something
- `needs-discussion` - Requires more discussion

**Priority**
- `critical` - Must fix immediately
- `high` - Important
- `medium` - Normal
- `low` - Can wait

**Packages**
- `@lafken/api`
- `@lafken/main`
- `@lafken/queue`
- `@lafken/event`
- `@lafken/schedule`
- `@lafken/state-machine`
- `@lafken/bucket`
- `@lafken/dynamo`
- `@lafken/auth`
- `@lafken/resolver`
- `@lafken/common`

**Other**
- `good first issue` - For beginners
- `help wanted` - Help needed
- `wontfix` - Won't be fixed
- `duplicate` - Duplicate of another issue

## 🔗 Important Links

- [Report a Bug](https://github.com/Hero64/lafken/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/Hero64/lafken/issues/new?template=feature_request.md)
- [Discussions](https://github.com/Hero64/lafken/discussions)
- [Contributing](../CONTRIBUTING.md)
- [Security](../SECURITY.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)

## ✨ Best Practices

1. **Issues**
   - Search before creating a new one
   - Use provided templates
   - Complete all information
   - Be clear and specific

2. **Pull Requests**
   - Keep a specific focus
   - Open PRs early with [WIP]
   - Link related issues
   - Wait for code review

3. **Discussions**
   - For ideas and questions
   - For feature design
   - For broader conversations

## 📊 Statistics

- **Packages**: 11 main packages + core
- **Workflows**: 3 CI/CD lines
- **Templates**: 3 issue types
- **Documentation**: 4 main files

---

**Last updated**: February 13, 2026
