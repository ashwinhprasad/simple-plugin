# Simple MCP Server — Reference

Full parameter schemas, response contracts, and edge-case details for the three tools exposed by the Simple MCP Server. This file supplements [SKILL.md](./SKILL.md); read that first for usage guidance.

---

## Tool: `add`

### Input schema

```json
{
  "type": "object",
  "properties": {
    "a": {
      "type": "number",
      "description": "The first operand (integer or float)."
    },
    "b": {
      "type": "number",
      "description": "The second operand (integer or float)."
    }
  },
  "required": ["a", "b"],
  "additionalProperties": false
}
```

### Success response

```json
{
  "result": <number>
}
```

`result` has the same numeric type as the broader of the two inputs (if either is a float, the result is a float).

### Examples

| `a` | `b` | `result` |
|-----|-----|----------|
| 1 | 2 | 3 |
| -5 | 5 | 0 |
| 1.5 | 2.5 | 4.0 |
| 0 | 0 | 0 |
| 1e10 | 1e10 | 2e10 |

### Edge cases

| Scenario | Behaviour |
|---|---|
| Very large floats (beyond IEEE 754 double precision) | Server returns `Infinity` or `-Infinity` in the `result` field — treat as an overflow error. |
| `NaN` as input | Server returns an error; validate inputs before calling. |
| String passed as `a` or `b` | MCP transport rejects at the schema layer before the tool runs. |
| Only one argument provided | Schema validation fails; both `a` and `b` are required. |

---

## Tool: `get_datetime`

### Input schema

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

No arguments. Pass an empty object `{}`.

### Success response

```json
{
  "datetime": "<ISO 8601 string>"
}
```

**Format:** `YYYY-MM-DDTHH:MM:SSZ` (UTC, second precision).

Example:

```json
{ "datetime": "2026-07-06T14:23:05Z" }
```

### Parsing the value

```python
from datetime import datetime, timezone

raw = response["datetime"]                        # "2026-07-06T14:23:05Z"
dt  = datetime.fromisoformat(raw.replace("Z", "+00:00"))  # → aware datetime (UTC)
```

```javascript
const dt = new Date(response.datetime);           // UTC Date object
```

### Edge cases

| Scenario | Behaviour |
|---|---|
| Server clock is not synced | The datetime may be wrong; the tool itself will still succeed. |
| Response missing `datetime` key | Treat as malformed — log the raw response and surface an error. |
| Fractional seconds in response | Safe to truncate or retain; both are valid ISO 8601. |

---

## Tool: `echo`

### Input schema

```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "minLength": 1,
      "description": "The string to echo back."
    }
  },
  "required": ["message"],
  "additionalProperties": false
}
```

### Success response

```json
{
  "message": "<identical copy of input message>"
}
```

The response `message` **must** be byte-for-byte identical to the input `message`.

### Edge cases

| Scenario | Behaviour |
|---|---|
| Empty string `""` | Schema validation fails (`minLength: 1`). |
| Very long string (>1 MB) | Behaviour is server-dependent; prefer strings under 64 KB to stay safe. |
| Unicode / emoji in message | Should round-trip unchanged; if garbled, report as a server encoding bug. |
| Response `message` ≠ input `message` | Treat as a server-side bug; do not silently accept a mutated echo. |

---

## Error Responses

All three tools use a shared error envelope when something goes wrong:

```json
{
  "error": {
    "code": "<string>",
    "message": "<human-readable description>"
  }
}
```

### Common error codes

| Code | Meaning | Recommended action |
|---|---|---|
| `INVALID_ARGUMENTS` | One or more arguments failed schema validation | Fix arguments before retrying |
| `INTERNAL_ERROR` | Unexpected server-side failure | Retry once after a short delay; escalate if it persists |
| `TIMEOUT` | Tool execution exceeded the server's deadline | Retry once; if persistent, reduce input size or check server health |

### Checking for errors (JavaScript)

```javascript
const data = await callMcpTool("add", { a: 4, b: 5 });
if (data.error) {
  throw new Error(`MCP tool error [${data.error.code}]: ${data.error.message}`);
}
console.log(data.result); // 9
```

### Checking for errors (Python)

```python
data = call_mcp_tool("add", {"a": 4, "b": 5})
if "error" in data:
    raise RuntimeError(f"MCP tool error [{data['error']['code']}]: {data['error']['message']}")
print(data["result"])  # 9
```

---

## MCP Transport Notes

- **Protocol:** MCP over stdio or HTTP (depends on how the server is launched).
- **Tool name casing:** All lowercase — `add`, `get_datetime`, `echo`. The router is case-sensitive.
- **Concurrency:** The server handles one request at a time (single-threaded). Do not issue parallel calls.
- **Versioning:** This reference describes v1 of the server. If the server introduces breaking changes, the skill description will be updated.