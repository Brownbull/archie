# Security Patterns - MUST CHECK

These patterns are mandatory. ECC code-review and security-reviewer agents enforce them.
Full reference: `_ecc/knowledge/code-review-patterns.md`

## YAML Input Validation

ALL user-imported YAML must be validated before use:

```typescript
// ALWAYS use safe YAML loading — never allow arbitrary object instantiation
import { load } from 'js-yaml';  // safe by default in js-yaml v4+
const data = load(yamlString);   // NEVER use loadAll with untrusted input
```

- Validate against the component/stack/blueprint schema BEFORE rendering
- Reject YAML with unexpected keys — allowlist only known schema fields
- Enforce size limits on imported files (e.g., 1MB max)
- Sanitize all string fields from YAML before rendering in the DOM

## XSS Prevention

User-provided content appears in the canvas (component names, descriptions, labels):

- NEVER use `dangerouslySetInnerHTML` with user-provided content
- Sanitize all display strings: component names, descriptions, tags, pros/cons
- React escapes by default in JSX — do NOT bypass this with innerHTML or ref manipulation
- URL fields in YAML (docs links, icons) must be validated: `https://` only, no `javascript:` URIs

## File Handling

Import/export YAML is the primary persistence mechanism:

- File reads: validate MIME type and extension before parsing
- File writes: never include runtime state, credentials, or environment data in exports
- Blob URLs: revoke after use to prevent memory leaks
- Do NOT use `eval()`, `new Function()`, or dynamic `import()` on user-provided content

## Client-Side Data

Archie is primarily client-side with no backend in early MVPs:

- No sensitive data should exist client-side (no auth tokens, API keys)
- LocalStorage/IndexedDB: do not store credentials; treat as untrusted on read
- If community features (future MVP 4) require auth, use established providers (OAuth)
- NEVER store user passwords or secrets client-side

## Secrets and Pre-commit

- NEVER commit `.env` files, API keys, or credentials
- Environment variables prefixed `VITE_` are exposed to the client — only put public config there
- Configure gitleaks pre-commit hook when CI pipeline is set up
- Always verify `git diff --cached` before committing sensitive changes

## Defense Layers

1. Pre-commit: gitleaks (when CI is established)
2. Build: `npm audit` for dependency vulnerabilities
3. Runtime: Schema validation on YAML import, DOM escaping via React
4. Code review: ECC security-reviewer agent checks for OWASP Top 10
