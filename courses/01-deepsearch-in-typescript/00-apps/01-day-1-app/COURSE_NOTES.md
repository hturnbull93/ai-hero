# Course Notes

I have forked this repo from <https://github.com/ai-hero-dev/ai-hero>

## Git Setup

### Remote Configuration

- **`origin`** → `https://github.com/hturnbull93/ai-hero.git` (my fork)
- **`upstream`** → `https://github.com/ai-hero-dev/ai-hero.git` (original course repo)

### Setup Commands

```bash
# Point origin to your fork
git remote set-url origin https://github.com/hturnbull93/ai-hero.git

# Add upstream for course updates
git remote add upstream https://github.com/ai-hero-dev/ai-hero.git
```

### Workflow

- **Your work**: `git push origin main` (push to your fork)
- **Course updates**: `git fetch upstream` then `git merge upstream/main` (pull course updates)
