# Contributing to Lafken

Thank you for your interest in contributing to Lafken! This document provides guidelines and instructions for contributing to the project.

## 📋 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/lafken.git
   cd lafken
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Verify everything works**
   ```bash
   pnpm build
   pnpm test
   pnpm lint
   ```

### System Requirements

- **Node.js**: >= 20.19
- **pnpm**: >= 10.20.0
- **Git**: Recent version

## 🐛 Reporting Bugs

### Before You Report

- Verify that the bug still exists in the latest version
- Search existing issues to avoid duplicates
- Gather information about your environment

### Creating a Bug Report

1. Go to [Issues](https://github.com/Hero64/lafken/issues)
2. Click **New Issue**
3. Select the "🐛 Report a Bug" template
4. Complete all required fields

**Important Information to Include:**
- Lafken version
- Operating System
- Node.js version
- Affected packages
- Clear steps to reproduce
- Expected vs actual behavior

## ✨ Requesting Features

### Before You Request

- Verify that the feature doesn't already exist
- Search discussions for something similar
- Consider the impact on the project

### Creating a Feature Request

1. Go to [Issues](https://github.com/Hero64/lafken/issues)
2. Click **New Issue**
3. Select the "✨ Request a Feature" template
4. Complete the template with:
   - Clear description of the problem
   - Proposed solution
   - Usage examples
   - Impact on the API

## 📚 Improving Documentation

Documentation is as important as code. You can:

1. Report documentation errors
2. Suggest new examples
3. Improve clarity
4. Translate documentation

To report documentation issues:
- Use the "📚 Documentation" template
- Include the exact location of the problem
- Suggest a solution if possible

## 💻 Making a Pull Request

### Before You Start

1. **Create a branch** from `main`
   ```bash
   git checkout -b fix/descriptive-name
   # or
   git checkout -b feature/descriptive-name
   ```

2. **Make your changes** focusing on a specific aspect

3. **Write or update tests**
   ```bash
   pnpm test
   ```

4. **Format your code**
   ```bash
   pnpm format
   pnpm lint
   ```

5. **Verify types**
   ```bash
   pnpm check-types
   ```

### Submitting a Pull Request

1. **Ensure it's up to date**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Push to your fork**
   ```bash
   git push origin fix/descriptive-name
   ```

3. **Go to GitHub and create a Pull Request**
   - Use the PR template
   - Reference related issues
   - Clearly describe what your PR does

### Pull Request Guidelines

- **Keep PRs small and focused**
- **One feature or fix per PR**
- **Write clear commit messages**
- **Add tests for new features**
- **Update documentation if needed**

## 📦 Project Structure

```
lafken/
├── packages/          # Main packages
│   ├── api/          # REST API resolver
│   ├── queue/        # SQS queue resolver
│   ├── event/        # EventBridge resolver
│   ├── schedule/     # EventBridge scheduler
│   ├── state-machine/# Step Functions resolver
│   ├── bucket/       # S3 bucket resolver
│   ├── dynamo/       # DynamoDB resolver
│   ├── auth/         # Cognito auth resolver
│   ├── resolver/     # Base resolver interface
│   ├── common/       # Utilities and decorators
│   └── main/         # Core engine
├── apps/
│   └── example/      # Example application
├── .github/          # GitHub workflows and templates
├── configs/          # Shared configuration
└── turbo.json        # Turbo configuration
```

## 🧪 Testing

### Running Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# In watch mode
pnpm test --watch

# For a specific package
pnpm test --filter=@lafken/api
```

### Writing Tests

- Use [Jest](https://jestjs.io/)
- Place tests near the code they test
- Use descriptive names
- Test edge cases
- Keep tests independent and focused

## 🎨 Code Style

### Biome for Formatting

```bash
pnpm format          # Format code
pnpm lint            # Check linting
```

### TypeScript

- Use explicit types
- Avoid `any`
- Check types: `pnpm check-types`

### Commits

Use descriptive commit messages:

```
feat: add new decorator support
fix: resolve issue with Lambda binding
docs: update API documentation
test: add tests for event resolver
chore: update dependencies
```

Supported conventional formats:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Add or update tests
- `chore`: Build, dependency changes, etc.

## 📖 Documentation

### Updating Documentation

1. README.md in packages
2. Inline code comments
3. Examples in apps/example
4. Copilot instructions (copilot-instructions.md)

### Documentation Style

- Use clear markdown
- Include code examples
- Explain the "why" not just the "what"
- Keep documentation updated with code changes

## 🔄 Review Process

1. **GitHub Actions** automatically checks:
   - Linting
   - Tests
   - Type checking

2. **Maintainers** will review:
   - Code quality
   - Alignment with project direction
   - Change impact
   - Documentation

3. **Requested changes**:
   - Implement the changes
   - Push to the same branch
   - The PR will update automatically

## 🎯 Areas of Focus

We're looking for help in:

- **New Resolvers**: Support for more AWS services
- **Documentation**: Guides, tutorials, examples
- **Tests**: Better coverage and edge cases
- **Performance**: Optimizations and benchmarks
- **Bug Fixes**: From reported issues
- **DevX**: Improving developer experience

## 📞 Getting Help

- **Issues and Discussions**: [GitHub Discussions](https://github.com/Hero64/lafken/discussions)
- **Code Review**: Ask in your PR
- **Architecture Design**: Open a discussion

## 📝 License

This project is under MIT License. By contributing, you agree that your contributions are under this license.

## 🙏 Acknowledgments

Thank you for contributing to Lafken! Your work makes this project better for everyone.

---

**Questions?** Open a [discussion](https://github.com/Hero64/lafken/discussions) or [issue](https://github.com/Hero64/lafken/issues).
