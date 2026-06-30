---
description: "Use when: working with TypeScript/React files in the Electric UPI project, need to understand codebase structure, or answering questions about implementation. Enforces token-efficient exploration via project indexing."
applyTo: "**/*.{ts,tsx}"
---

# Project Index Reference Protocol

## 🎯 Core Principle
**Never re-read files that are already indexed.** Always check `agent-project-readme/project-info.md` and `/memories/repo/` first. Only read source files if the index is missing, stale, or user explicitly requests full content.

## 📋 Mandatory Workflow

### Before Reading Any Source File:
1. **Check compressed memory**: `/memories/repo/INDEX-*.md`
   - If entry marked `✅` → Trust the indexed abstraction, do NOT read the file
   - If entry marked `⏳` or missing → Continue to step 2

2. **Check project index**: `agent-project-readme/project-info.md`
   - Look for the file in the Checkpoints Registry
   - Verify the "Last Updated" date matches current codebase state
   - If index is stale (file modified after index date) → Use terminal commands to refresh

3. **Only read file if**:
   - ❌ Index entry does not exist
   - ❌ Index is stale (file modified after index date)
   - ❌ User explicitly says "read the file" or "show me the code"
   - ✅ Debugging a specific bug requiring line-by-line analysis

### When Index is Missing or Stale:
Use terminal commands from `agent-project-readme/skill-terminal.md` to extract structure efficiently:

```powershell
# Extract functions/components without full read
Select-String -Path "file.ts" -Pattern "^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(const|let)\s+\w+\s*=\s*(\(|async)" | Select-Object LineNumber, Line

# Extract imports/exports
Select-String -Path "file.ts" -Pattern "^import\s+|^export\s+" | Select-Object LineNumber, Line

# For API routes: find HTTP methods
Select-String -Path "app/api/*/route.ts" -Pattern "export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)"
```

## 🗂️ Index File Locations

| Location | Purpose | Format |
|----------|---------|--------|
| `agent-project-readme/project-info.md` | Human-readable, project-scoped checkpoints | Markdown with detailed file indexes, FSM diagrams, data flow |
| `/memories/repo/INDEX-*.md` | AI-cache, ultra-compressed | One-line per file, status flags, line numbers |
| `agent-project-readme/INDEX-*.md` | Domain-specific deep indexes | Per-domain breakdowns (API, components, hooks, etc.) |

## 🔍 Decision Tree

```
Need info about file X?
  │
  ├─ Check /memories/repo/INDEX-*.md
  │   ├─ ✅ Found → REFERENCE (no read)
  │   ├─ ⏳ Partial → Use project-info.md
  │   └─ ❌ Missing → Continue
  │
  ├─ Check agent-project-readme/project-info.md
  │   ├─ ✅ Complete & current → REFERENCE (no read)
  │   ├─ ❌ Missing entry → Use terminal extraction
  │   └─ ⚠️ Stale (file modified after index date) → Refresh index first
  │
  └─ User explicitly requested full file?
      ├─ YES → Read with line range
      └─ NO → Use terminal commands, avoid full read
```

## 📊 Current Index Status

- **API Layer**: 18/18 files fully abstracted (2026-06-24)
- **Checkpoints**: All `app/api/**` routes verified and documented
- **Next needed**: Components, Hooks, Lib modules

## 🚫 Anti-Patterns (DO NOT)

- ❌ `cat file.ts` or full read "just to be safe"
- ❌ Re-indexing files that already have `✅` in memory cache
- ❌ Ignoring the project-info.md checkpoint registry
- ❌ Reading files when terminal regex extraction would suffice
- ❌ Copying entire file contents into responses (reference the index instead)

## ✅ Best Practices

- ✅ Before any file read, announce: "Checking project index first..."
- ✅ When referencing indexed info, cite the source: "According to project-info.md (2026-06-24)..."
- ✅ Use `skill-terminal.md` commands for on-the-fly exploration
- ✅ Update indexes after making changes (create new checkpoint entries)
- ✅ Keep `/memories/repo/` compressed — one line per file, no verbose descriptions

## 🔗 Related Files

- **Indexing skill**: `agent-project-readme/skill-codebase-indexing.md`
- **Terminal commands**: `agent-project-readme/skill-terminal.md`
- **Current index**: `agent-project-readme/project-info.md`
- **Memory cache**: `/memories/repo/`

---

**Remember**: The index exists to preserve context window. If you're reading files repeatedly, you're defeating its purpose. Trust the index, verify with terminal when needed, and keep it updated.