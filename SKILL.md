---
name: AI-Native System Development Repository Skill
description: A repository operating model that unifies business goals, requirements, design, architecture, tasks, code, tests, release, operations, AI prompts, and decision history for AI-assisted development.
---

# AI-Native System Development Repository Skill

## Purpose

This skill helps create and manage an AI-native system development repository.

The repository is not only for source code.
It is the single source of truth for:

* business goals
* requirements
* design
* architecture
* tasks
* source code
* tests
* release
* operation
* AI prompts
* decision history

The goal is to make the system development process clear for all project members and useful for AI-assisted development.

---

## Repository Structure

When starting a new project, create the following structure:

```text
project-name/
  README.md
  00_business/
  01_requirements/
  02_design/
  03_architecture/
  04_tasks/
  05_source_code/
  06_tests/
  07_release/
  08_operation/
  09_ai_prompts/
  10_decisions/
```

---

## Role of Each Directory

### `README.md`

The README explains the whole project.

It should include:

* project name
* project overview
* business purpose
* main users
* system overview
* repository structure
* development process
* important links
* project members and roles

The README is the entrance of the project.

---

### `00_business/`

This directory explains **why we build the system**.

Main owner:

* Product Owner

Contents:

```text
business-goal.md
target-user.md
kpi.md
success-definition.md
project-background.md
```

Purpose:

* define business goal
* define target users
* define business value
* define success metrics
* explain why this project is needed

AI should read this directory before discussing requirements, priorities, or product direction.

---

### `01_requirements/`

This directory explains **what we build**.

Main owner:

* PdM

Contents:

```text
prd.md
user-stories.md
functional-requirements.md
non-functional-requirements.md
acceptance-criteria.md
edge-cases.md
```

Purpose:

* define product requirements
* define user stories
* define system behavior
* define acceptance criteria
* define edge cases
* define non-functional requirements

AI should read this directory before creating tasks, writing code, or generating tests.

---

### `02_design/`

This directory explains **how users use the system**.

Main owner:

* Designer

Contents:

```text
user-flow.md
screen-list.md
screen-specification.md
figma-links.md
ui-copy.md
accessibility-check.md
```

Purpose:

* define user flow
* define screen structure
* define UI and UX
* define screen behavior
* define copy and messages
* connect Figma or design files

AI should read this directory before creating frontend code, UI components, or UX reviews.

---

### `03_architecture/`

This directory explains **how the system is structured**.

Main owner:

* Engineer / Tech Lead

Contents:

```text
architecture.md
database-design.md
api-design.md
infrastructure.md
security.md
logging-monitoring.md
technology-selection.md
```

Purpose:

* define system architecture
* define frontend/backend structure
* define database design
* define API design
* define infrastructure
* define security policy
* define logging and monitoring

AI should read this directory before writing backend code, frontend architecture, database changes, or infrastructure code.

---

### `04_tasks/`

This directory explains **how work is divided**.

Main owner:

* PdM
* Engineer

Contents:

```text
backlog.md
task-breakdown.md
sprint-plan.md
daily-plan.md
implementation-order.md
```

Purpose:

* break requirements into small tasks
* define implementation order
* manage backlog
* manage sprint plan
* connect tasks to requirements, design, architecture, and tests

AI should use this directory to understand what to implement next.

Each task should include links to related documents:

```text
Task: Create user registration API

Related documents:
- Requirement: 01_requirements/functional-requirements.md
- API Design: 03_architecture/api-design.md
- Test Case: 06_tests/test-cases.md
- Decision: 10_decisions/adr-001-authentication.md
```

---

### `05_source_code/`

This directory contains **actual implementation**.

Main owner:

* Engineer

Contents:

```text
frontend/
backend/
infra/
scripts/
```

Purpose:

* store application code
* store frontend code
* store backend code
* store infrastructure code
* store development scripts

AI can write or modify code here, but humans are responsible for reviewing and approving the code.

Important rule:

```text
No major code change without related requirement, architecture, and test update.
```

---

### `06_tests/`

This directory explains **how quality is checked**.

Main owner:

* Tester
* QA
* Engineer

Contents:

```text
test-plan.md
test-cases.md
e2e-tests.md
bug-report.md
regression-test.md
quality-checklist.md
```

Purpose:

* define test strategy
* define test cases
* define acceptance tests
* define regression tests
* manage bug reports
* check quality before release

AI should generate tests from requirements and acceptance criteria.

Important rule:

```text
Every important requirement should have a related test case.
```

---

### `07_release/`

This directory explains **how we release safely**.

Main owner:

* Engineer
* PdM

Contents:

```text
release-checklist.md
release-note.md
migration-plan.md
rollback-plan.md
deployment-procedure.md
```

Purpose:

* manage release checklist
* prepare release notes
* define database migration plan
* define rollback plan
* define deployment procedure

AI should read this directory before helping with release, deployment, or rollback.

---

### `08_operation/`

This directory explains **how we operate the system after release**.

Main owner:

* Engineer
* Operation team

Contents:

```text
runbook.md
monitoring.md
incident-response.md
maintenance.md
known-issues.md
faq.md
```

Purpose:

* define daily operation
* define monitoring method
* define incident response
* define maintenance tasks
* manage known issues
* provide FAQ for operators

AI should read this directory before helping with incidents, logs, monitoring, or operation tasks.

---

### `09_ai_prompts/`

This directory explains **how we use AI consistently**.

Main owner:

* All project members

Contents:

```text
coding-prompt.md
review-prompt.md
test-generation-prompt.md
requirement-check-prompt.md
design-review-prompt.md
architecture-review-prompt.md
release-check-prompt.md
```

Purpose:

* store reusable AI prompts
* standardize AI usage
* improve AI output quality
* reduce prompt differences between members
* keep project-specific AI instructions

AI should use this directory to understand how to work in this project.

Important rule:

```text
Good prompts should be reused and improved continuously.
```

---

### `10_decisions/`

This directory explains **why important decisions were made**.

Main owner:

* Product Owner
* PdM
* Engineer
* Designer

Contents:

```text
adr-001-technology-selection.md
adr-002-database-selection.md
adr-003-authentication-policy.md
adr-004-ui-policy.md
adr-005-release-strategy.md
```

Purpose:

* record important decisions
* record rejected options
* record decision reasons
* record trade-offs
* help future members and AI understand project history

AI should read this directory before suggesting architecture changes, design changes, or requirement changes.

Decision files should follow this format:

```text
# ADR-001: Technology Selection

## Status

Accepted

## Context

Explain the situation.

## Decision

Explain the decision.

## Reason

Explain why this decision was made.

## Alternatives

Explain other options.

## Consequences

Explain positive and negative impact.
```

---

## Daily Development Process

Use this process every day:

```text
1. Confirm business goal
2. Update or check requirements
3. Update or check design
4. Update or check architecture
5. Break work into small tasks
6. Use AI to support implementation
7. Review AI-generated code
8. Generate and run tests
9. Tester checks quality
10. PdM checks acceptance criteria
11. Update documents
12. Record important decisions
```

---

## AI Usage Rules

AI should not work only from a short prompt.

Before using AI for development, provide related project context.

For example:

```text
Read the following documents first:

- 00_business/business-goal.md
- 01_requirements/functional-requirements.md
- 01_requirements/acceptance-criteria.md
- 02_design/screen-specification.md
- 03_architecture/api-design.md
- 06_tests/test-cases.md

Then implement the task.
```

---

## Code Change Rule

When code changes, check whether documentation also needs to change.

Code changes may require updates to:

* requirements
* design
* architecture
* tests
* release notes
* operation documents
* decision records
* AI prompts

Important rule:

```text
If system behavior changes, documentation must change.
```

---

## Pull Request Rule

Every pull request should include:

```text
## Summary

What was changed?

## Related Documents

- Requirement:
- Design:
- Architecture:
- Test:
- Decision:

## AI Usage

Was AI used?
If yes, how was it used?

## Test Result

What tests were run?

## Documentation Update

Were documents updated?
If not, explain why.
```

---

## Definition of Done

A task is done only when:

```text
- requirement is clear
- design is checked if needed
- architecture is checked if needed
- code is implemented
- code is reviewed
- tests are added or updated
- tests passed
- documentation is updated
- important decisions are recorded
- PdM acceptance criteria are satisfied
```

---

## Repository Creation Command

Use this command to create the basic structure:

```bash
mkdir -p project-name/{00_business,01_requirements,02_design,03_architecture,04_tasks,05_source_code,06_tests,07_release,08_operation,09_ai_prompts,10_decisions}

touch project-name/README.md

touch project-name/00_business/{business-goal.md,target-user.md,kpi.md,success-definition.md,project-background.md}

touch project-name/01_requirements/{prd.md,user-stories.md,functional-requirements.md,non-functional-requirements.md,acceptance-criteria.md,edge-cases.md}

touch project-name/02_design/{user-flow.md,screen-list.md,screen-specification.md,figma-links.md,ui-copy.md,accessibility-check.md}

touch project-name/03_architecture/{architecture.md,database-design.md,api-design.md,infrastructure.md,security.md,logging-monitoring.md,technology-selection.md}

touch project-name/04_tasks/{backlog.md,task-breakdown.md,sprint-plan.md,daily-plan.md,implementation-order.md}

mkdir -p project-name/05_source_code/{frontend,backend,infra,scripts}

touch project-name/06_tests/{test-plan.md,test-cases.md,e2e-tests.md,bug-report.md,regression-test.md,quality-checklist.md}

touch project-name/07_release/{release-checklist.md,release-note.md,migration-plan.md,rollback-plan.md,deployment-procedure.md}

touch project-name/08_operation/{runbook.md,monitoring.md,incident-response.md,maintenance.md,known-issues.md,faq.md}

touch project-name/09_ai_prompts/{coding-prompt.md,review-prompt.md,test-generation-prompt.md,requirement-check-prompt.md,design-review-prompt.md,architecture-review-prompt.md,release-check-prompt.md}

touch project-name/10_decisions/{adr-001-technology-selection.md,adr-002-database-selection.md,adr-003-authentication-policy.md,adr-004-ui-policy.md,adr-005-release-strategy.md}
```

---

## Final Principle

This repository should work as:

```text
Project knowledge base
+ Development process guide
+ AI context source
+ Source code repository
+ Quality control system
```

The purpose is not only to write code faster.

The purpose is to make system development:

```text
clear
repeatable
AI-friendly
reviewable
maintainable
high-quality
```
