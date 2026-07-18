# Universal Project Template

A pre-configured `.agents/` workspace template with **169 curated skills**, universal agent profiles, and design system defaults for rapid project bootstrapping.

## 🚀 Quick Start

1. **Copy the template** into your new project folder:
   ```bash
   xcopy "C:\Users\janak\Downloads\ProjectTemplate" "C:\Users\janak\Downloads\_Projects\my-new-project" /E /I
   ```

2. **Customize `GEMINI.md`** — Replace `[PROJECT_NAME]`, `[Tech Stack]`, and constraint placeholders with your project details.

3. **Customize `.agents/project-agents.md`** — Replace `[PROJECT_TYPE]` in each agent profile with your project context (e.g., "SaaS dashboard", "portfolio site").

4. **Customize `.agents/local-overrides.json`** — Set your project's fonts, theme, and component-specific design tokens.

5. **Run the audit** — Copy the prompt from `AUDIT_PROMPT.md` into your AI agent to validate everything is wired up correctly.

## 📁 Structure

```
ProjectTemplate/
├── GEMINI.md                    ← Agent bootloader (project config)
├── README.md                    ← This file
├── AUDIT_PROMPT.md              ← v3 structural audit prompt
├── SKILLS_REPORT.md             ← Full skill reference guide (169 skills)
├── .gitignore                   ← Standard ignores
└── .agents/
    ├── AGENTS.md                ← Workspace rules (3 enforcement rules)
    ├── local-overrides.json     ← Design system tokens
    ├── project-agents.md        ← 6 agent role profiles
    ├── skill-manifest.json      ← Skill inventory registry
    └── skills/                  ← 169 skill folders (each with SKILL.md)
```

## 📋 What's Included

### Workspace Rules (AGENTS.md)
- **Post-Task Skill Attribution** — Agent must list which skills it used after every task.
- **Mandatory Skill Ingestion** — Agent must read relevant SKILL.md files before making changes.
- **Dual-Prompt Optimization** — Auto-chains `prompt-master` + `enhance-prompt` for prompt tasks.

### Agent Profiles (project-agents.md)
| Profile | Focus |
|---|---|
| UI/UX Designer | Design system, typography, animations, contrast |
| Frontend Developer | App code, CSS, routing, performance |
| QA / Accessibility | WCAG 2.2, SEO, cross-browser |
| Content & Copy | Descriptions, CTAs, microcopy |
| Backend / API | Endpoints, database, auth, RLS |
| DevOps / Deployment | CI/CD, env vars, monitoring |

### Design Tokens (local-overrides.json)
Neutral defaults (Inter font, auto theme, 8px scale) — customize per project.

## 🔧 Maintenance

Run the `AUDIT_PROMPT.md` periodically to catch:
- Orphaned skills (folder exists, manifest entry missing)
- Missing skills (manifest entry exists, folder missing)
- Broken profile references
- JSON schema violations

## 📊 Audit Scoring

The audit calculates a Health Score (0–100):
- **-15 pts** per CRITICAL error
- **-5 pts** per WARNING
- **-2 pts** per INFO item
