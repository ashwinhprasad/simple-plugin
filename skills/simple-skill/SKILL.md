---
name: simple-skill
description: "Use this skill whenever you need to call any of the three tools exposed by the Simple MCP Server: add (arithmetic), get_datetime (current date/time), or echo (round-trip text). Read this skill before making any tool call so you use the correct argument names, types, and error-handling patterns."
---

# Simple MCP Server — Agent Skill

## Overview

This skill documents the **Simple MCP Server**, which exposes three tools over the Model Context Protocol (MCP):

| Tool | Purpose |
|---|---|
| `add` | Add two numbers and return their sum |
| `get_datetime` | Return the current date and/or time |
| `echo` | Return a message back unchanged |

For full parameter schemas, response shapes, and edge-case handling see [REFERENCE.md](./references/tool_reference.md).

---

## When to use each tool

### `add`
Use when the user asks for arithmetic on exactly two numbers and you want a server-authoritative answer rather than computing locally.

```
Tool: add
Arguments:
  a  – first number  (integer or float)
  b  – second number (integer or float)
```

**Quick example**

```json
// Request
{ "tool": "add", "arguments": { "a": 7, "b": 3 } }

// Response
{ "result": 10 }
```

---

### `get_datetime`
Use when you need the server's current timestamp — e.g. to stamp a log entry, answer "what time is it?", or seed a time-sensitive calculation.

```
Tool: get_datetime
Arguments: (none)
```

**Quick example**

```json
// Request
{ "tool": "get_datetime", "arguments": {} }

// Response
{ "datetime": "2026-07-06T14:23:05Z" }
```

The value is always ISO 8601 UTC. Convert to the user's local timezone *after* receiving it if needed.

---

### `echo`
Use to verify connectivity, round-trip a string without transformation, or when the task explicitly requires the server to parrot input back.

```
Tool: echo
Arguments:
  message – any non-empty string
```

**Quick example**

```json
// Request
{ "tool": "echo", "arguments": { "message": "Hello, world!" } }

// Response
{ "message": "Hello, world!" }
```

---

## Chaining tools

Tools can be chained within a single agent turn. Always resolve each call before feeding its output into the next.

**Pattern — timestamp + computation**

1. Call `get_datetime` → capture the `datetime` value.
2. Call `add` with any numeric inputs derived from step 1 or user input.
3. Present both pieces of information to the user.

**Pattern — echo validation before real work**

1. Call `echo` with a canary string (e.g. `"ping"`) to confirm the server is reachable.
2. If the response `message` does not match the input, abort and report a connectivity error.
3. Proceed with `add` or `get_datetime`.

---

## Error handling

| Situation | What to do |
|---|---|
| Tool returns an `error` key | Surface the message to the user; do not retry automatically unless the error is transient (e.g. timeout). |
| `add` receives a non-numeric value | Reject before calling — validate arguments client-side first. |
| `get_datetime` returns an unparseable string | Log the raw value and tell the user the datetime format was unexpected. |
| `echo` response `message` ≠ input `message` | Treat as a server-side bug; report and stop. |

For full error schema details see [REFERENCE.md § Error Responses](./references/tool_reference.md#error-responses).

---

## Constraints & notes

- **No authentication required** — the server is unauthenticated; do not send credentials.
- **`add` is not a general calculator** — it handles exactly two operands. For multi-step arithmetic, decompose into sequential `add` calls or compute locally.
- **`get_datetime` is read-only** — it cannot be used to set or change the system clock.
- **`echo` does not persist or log** — do not use it as a storage mechanism.
- All tool names are **lowercase**; the MCP router is case-sensitive.