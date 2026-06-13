# Subagent Orchestration

This directory contains task briefs, scoping documents, and post-mortems for all subagent-delegated coding work on the Spelling Bee project.

## Architecture

The Systems Architect (this session) **never writes code directly**. All implementation is delegated to subagents via the `delegate_task` tool (brl-subagent extension).

```
┌─────────────────────────────────────┐
│  Systems Architect (this session)   │
│  • Architectural decisions          │
│  • Task scoping & sequencing        │
│  • Subagent brief authoring         │
│  • Review & integration decisions   │
│  • Context window preservation      │
└──────────────┬──────────────────────┘
               │ delegate_task()
               ▼
┌─────────────────────────────────────┐
│  Subagent (isolated context)        │
│  • Reads SPEC.md + task brief       │
│  • Implements code                  │
│  • Creates/modifies files           │
│  • Reports completion               │
│  • Disposable context per task      │
└─────────────────────────────────────┘
```

## Subagent Strategy

### Task Granularity

| Grain Size | When to Use | Example |
|------------|-------------|---------|
| **Fine** (1-3 files) | Simple, self-contained implementations | Create a single Svelte component |
| **Medium** (4-8 files) | Related changes across a module | Set up project scaffold + config |
| **Coarse** (8+ files) | Full phase implementation | Build entire API layer |

Prefer **medium-grain** tasks. Fine tasks waste orchestration overhead. Coarse tasks risk subagents drifting from the spec.

### Intelligence Level

Subagents inherit the model and thinking level of the parent session (Claude Opus 4.5, medium thinking). This is appropriate for all task types in this project — the system prompt controls the subagent's behavior, not the intelligence level.

### System Prompt Design

Each subagent receives a tailored system prompt that:
1. States the concrete deliverable
2. References the relevant SPEC.md sections
3. Specifies exact file paths to create/modify
4. Defines clear acceptance criteria
5. Constrains scope — "do only what is asked, nothing more"

### Task Brief Files

Each task gets a markdown file in `briefs/`:

```
.subagent-orchestration/
├── README.md              # This file
├── briefs/
│   ├── 01-scaffold.md     # Phase 1: Project scaffold
│   ├── 02-d1-setup.md     # Phase 1: D1 database + migrations
│   ├── 03-seed-words.md   # Phase 1: Word seeding
│   └── ...                # Subsequent tasks
└── postmortems/
    └── ...                # After-action notes
```

### Pre-flight Checklist

Before delegating each task:
- [ ] SPEC.md is up to date for the relevant section
- [ ] Task brief is complete and unambiguous
- [ ] All prerequisite tasks are verified complete
- [ ] File paths are absolute or clearly relative to project root
- [ ] Acceptance criteria are testable

### Post-flight Verification

After each subagent returns:
- [ ] Files exist at expected paths
- [ ] Code matches the spec (read key files)
- [ ] No extraneous changes outside scope
- [ ] Any deviations are documented in the postmortem
