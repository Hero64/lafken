# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in Lafken, **do not** open a public issue. Instead, follow these steps:

### How to Report

1. **Do NOT** open a public issue
2. **Send an email** to `anibal.jorquera@example.com` with:
   - Detailed description of the vulnerability
   - Steps to reproduce (if possible)
   - Potential impact
   - Your contact information (if you want further communication)

### What to Expect

- Acknowledgment of your report within 48 hours
- Regular updates on progress
- Credit for the discovery (unless you prefer to remain anonymous)

## Reporter Responsibilities

- Keep the vulnerability confidential until a patch is published
- Don't exploit the vulnerability beyond verifying the issue
- Don't attempt to access data that isn't yours
- Don't interfere with systems or data

## Lafken Responsibilities

- We'll evaluate your report quickly
- We'll work on a security patch
- We'll coordinate responsible disclosure
- We'll acknowledge your contribution (unless you prefer to remain anonymous)

## Expected Timeline

| Stage | Time |
|-------|--------|
| Initial acknowledgment | ≤ 48 hours |
| Evaluation | ≤ 7 days |
| Patch development | Variable (depends on severity) |
| Patch available | Within 10 days of discovery |
| Public disclosure | In coordination |

## Security Practices

### For Lafken Users

- **Keep your dependencies updated**
  ```bash
  pnpm update
  pnpm audit
  ```

- **Review dependency changes**
  ```bash
  git diff pnpm-lock.yaml
  ```

- **Follow AWS security best practices**
  - Use least privilege in IAM roles
  - Enable CloudTrail for auditing
  - Implement proper VPC security groups

### For Contributors

- Review code for common vulnerabilities
- Use static analysis tools
- Keep dependencies updated
- Report vulnerabilities in dependencies

## Known Vulnerabilities

Currently, there are no known unpatched security vulnerabilities.

See [Security Advisories](https://github.com/Hero64/lafken/security/advisories) for full history.

## Recommended Practices

### AWS Configuration

```typescript
// ✅ GOOD: Least privilege IAM
const lambdaRole = new IAMRole({
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
  inlinePolicies: {
    queueAccess: new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sqs:SendMessage'],
          resources: [queue.arn]
        })
      ]
    })
  }
});

// ❌ BAD: Too many permissions
const role = new IAMRole({
  managedPolicies: [
    ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
  ]
});
```

### Secrets

```typescript
// ✅ GOOD: Use AWS Secrets Manager
const dbPassword = new SecretString({
  value: dbSecret.secretValue
});

// ❌ BAD: Don't hardcode secrets
const password = 'my-secret-password'; // NEVER!
```

### Logging

```typescript
// ✅ GOOD: No sensitive data in logs
logger.info('User authenticated', { userId: user.id });

// ❌ BAD: No sensitive data in logs
logger.info('User token', { token: apiKey }); // NEVER!
```

## Security Scanning

Lafken uses several tools to maintain security:

- **npm audit**: Checks for vulnerabilities in dependencies
- **Snyk**: Continuous dependency monitoring
- **SAST**: Static code analysis

Run:
```bash
pnpm audit
npm audit fix  # Use caution, verify changes first
```

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
- [GitHub Security](https://github.com/features/security)

## Security Contact

For security reports:
- 📧 **Email**: anibal.jorquera@example.com
- 🔒 **GitHub Security Advisory**: [Report here](https://github.com/Hero64/lafken/security/advisories)

---

**Last updated**: February 13, 2026
