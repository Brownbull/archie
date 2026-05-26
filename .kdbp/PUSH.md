# Push Configuration

<!-- created: 2026-05-26 -->
<!-- last_updated: 2026-05-26 -->

## Settings

```yaml
remote: origin
default_branch: main
default_env: production
ci_provider: github-actions
pr_template: none
```

## Environments

### production

```yaml
target_branch: main
promote_from: ~
branch_cleanup: ask
```

## Known Branches

```
origin/dev
origin/feature/8-1
origin/feature/epic-2
origin/feature/epic-3
origin/feature/epic-5
origin/feature/epic-6
origin/feature/epic10
origin/feature/epic11
origin/feature/epic7
origin/feature/epic7.5
origin/feature/epic9
origin/main
```

## Decisions Log

| Branch | Decision | Date |
|--------|----------|------|
