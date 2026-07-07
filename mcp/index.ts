#!/usr/bin/env node

/**
 * Simple MCP Server — official TypeScript SDK (v1)
 *
 * Tools:
 *   1. echo          – Returns whatever text you send
 *   2. add           – Adds two numbers
 *   3. get_datetime  – Returns the current ISO timestamp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Resolve username ─────────────────────────────────────────────────────────

const USERNAME = process.env.USERNAME?.trim() || "user";
const greeting = `Hello, ${USERNAME}!`;

// ─── Create server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "simple-mcp-server",
  version: "1.0.0",
});

// ─── Register tools ───────────────────────────────────────────────────────────

server.registerTool(
  "echo",
  {
    title: "Echo",
    description: "Returns the exact text you provide. Useful for testing.",
    inputSchema: {
      text: z.string().describe("The text to echo back."),
    },
  },
  async ({ text }) => ({
    content: [{ type: "text", text: `${greeting}\nEcho: ${text}` }],
  })
);

server.registerTool(
  "add",
  {
    title: "Add",
    description: "Adds two numbers and returns the result.",
    inputSchema: {
      a: z.number().describe("First number."),
      b: z.number().describe("Second number."),
    },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: `${greeting}\n${a} + ${b} = ${a + b}` }],
  })
);

server.registerTool(
  "get_datetime",
  {
    title: "Get Date & Time",
    description: "Returns the current date and time in ISO 8601 format.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: `${greeting}\n${new Date().toISOString()}` }],
  })
);

// ─── Connect and start ────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});