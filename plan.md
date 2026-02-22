# Plan: Guided Prompt Settings for Open Planter

## Problem Statement

Users face two cold-start problems:
1. **"I don't know what to investigate"** — no domain idea, no data, just want to see what the system can do.
2. **"I don't know how to write a good prompt"** — they have a vague idea but don't understand what levers exist to shape the investigation.

The current UI has a free-text textarea, provider/model dropdowns, and 3 hardcoded example buttons. There's no discoverability of the system's capabilities or tunable parameters.

---

## Approach: Collapsible "Guided Prompt" Panel

A single collapsible panel below the textarea (toggled by a "Guided Settings" link/button), containing three sections that progressively help the user build a strong prompt. This keeps the default experience clean while making depth accessible.

### Section 1: Investigation Builder (Prompt Composition)

A structured form that assembles a well-formed objective from discrete choices. Each field maps to a component of what makes a strong prompt for this system.

**Fields:**

| Field | Type | Purpose | Examples |
|-------|------|---------|----------|
| **Domain** | Select | Investigation category | Financial, Political, Corporate, Real Estate, Government, Humanitarian, OSINT, Custom |
| **Action** | Select | What the agent should do | Cross-reference, Map connections, Identify patterns, Track flows, Verify claims, Build timeline |
| **Subject** | Free text | The entity/topic focus | "city council vendor payments", "offshore shell companies", "NGO supply chains" |
| **Geographic Scope** | Free text w/ suggestions | Location constraint | City, State, Country, or "any" |
| **Time Window** | Select | Temporal constraint | Last year, Last 5 years, 2020-2024, All available, Custom range |
| **Output Format** | Multi-select | What deliverables to request | Entity map, Evidence report, Timeline, Network graph, Summary brief |

**How it works:** As the user fills in fields, a preview below the form shows the composed objective in real-time. Clicking "Use this prompt" copies it into the main textarea. The user can then edit it further before submitting.

**Composed prompt example:**
> "Cross-reference vendor payments and lobbying disclosures in Cook County, IL from 2020-2024. Focus on identifying overlapping entities between payment recipients and registered lobbyists. Produce an entity map with evidence chains and a summary brief of key findings."

### Section 2: Random Investigation Generator

For the "I just want to try it" user. A single button that generates a complete, interesting investigation objective.

**"Surprise Me" button** — picks a random combination of:
- Domain (weighted toward domains with publicly available data)
- Action verb
- A curated location from a diverse set (major US cities, international capitals, regions)
- A topical angle (e.g., "infrastructure spending", "political donors", "land use changes")

**Implementation:** A curated bank of ~30-50 prompt templates with variable slots, stored as a JSON constant in the frontend. No backend needed. Each template is hand-written to demonstrate a different capability of the system.

**Template examples:**
```
"Map the network of campaign donors in {city} who also appear as government contractors in the last 3 years"
"Investigate property ownership transfers near {location} and identify any connections to politically exposed persons"
"Analyze public procurement data in {region} and flag contracts awarded without competitive bidding"
"Build a timeline of corporate entity registrations linked to {industry} in {state} since 2020"
```

Each generation also randomly selects a matching output format suggestion.

### Section 3: Agent Tuning (Advanced Parameters)

Expose the agent configuration parameters that affect investigation behavior, with clear explanations. These are currently only configurable via environment variables.

**Parameters to expose (grouped):**

**Reasoning & Depth**
| Parameter | Control | Default | Description |
|-----------|---------|---------|-------------|
| Recursive Mode | Toggle | On | Allows the agent to delegate focused subtasks to faster/cheaper models. Turn off for simpler, single-model investigations. |
| Max Depth | Slider (1-6) | 4 | How many levels deep subtask delegation can go. Higher = more thorough but slower. |
| Max Steps | Slider (20-200) | 100 | Budget of tool calls per investigation. More steps = deeper analysis but longer runtime. |
| Reasoning Effort | Low/Med/High | High | How much the model "thinks" before acting. High for complex analysis, low for straightforward lookups. |

**Verification**
| Parameter | Control | Default | Description |
|-----------|---------|---------|-------------|
| Acceptance Criteria | Toggle | On | Enables independent verification of subtask results. Increases reliability but uses more steps. |

**Output**
| Parameter | Control | Default | Description |
|-----------|---------|---------|-------------|
| Demo Mode | Toggle | Off | Censors entity names in output (replaces with block characters). For sensitive investigations or presentations. |

Each parameter shows its current value, has an inline tooltip explaining when to change it, and resets to defaults with a single button.

---

## Data Flow Changes

### Frontend (`InputBar.jsx`)
- New state: `showGuided` (boolean toggle), `guidedFields` (object for builder fields), `advancedConfig` (object for agent params)
- `onSubmit` signature expands: `onSubmit(objective, provider, model, advancedConfig)`
- `advancedConfig` only includes fields the user explicitly changed (sparse object)

### App.jsx
- `startInvestigation` passes `advancedConfig` to the worker API

### Worker API (`/api/investigate`)
- Accept optional fields in POST body: `recursive`, `max_depth`, `max_steps_per_call`, `reasoning_effort`, `acceptance_criteria`, `demo`
- Override corresponding `AgentConfig` fields when present
- Store in Convex session record for display in sidebar/feed

### Convex Schema
- Add optional `config` field (object) to sessions table for storing non-default settings

---

## File Changes Summary

| File | Changes |
|------|---------|
| `web/src/components/InputBar.jsx` | Add guided panel UI, prompt builder form, random generator, advanced settings, expand onSubmit args |
| `web/src/App.jsx` | Pass advancedConfig through to worker API call |
| `worker/app.py` | Accept and apply optional config overrides from request body |
| `web/convex/schema.ts` | Add optional `config` field to sessions table |
| `web/convex/sessions.ts` | Store config in `create` mutation |

No new files needed — everything fits within existing components.

---

## UX Details

- **Default state:** Panel collapsed. The textarea + provider/model + example buttons look exactly as they do today.
- **Toggle:** A small "Guided Settings" text button in the config row (next to the example buttons). Clicking it expands the panel with a smooth transition.
- **Panel layout:** Three tabs or accordion sections: "Build a Prompt" | "Surprise Me" | "Agent Settings"
- **Non-blocking:** Every field is optional. The user can fill in one field, all fields, or none. The builder composes from whatever is provided.
- **Preview:** The prompt builder shows a live preview of the composed objective. The user explicitly clicks "Use" to populate the textarea — it never auto-overwrites what they've typed.
- **Persistence:** Advanced settings remember their values in localStorage across sessions.
