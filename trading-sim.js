#!/usr/bin/env node

/**
 * Trading Agent Simulation - W3C Context Graph CG Research
 * Reads prompt from data/prompt.txt, sends to Claude API,
 * saves structured response to output/.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parsePromptFile(filePath) {
  const text = readFileSync(filePath, "utf-8");
  const systemMatch = text.match(/SYSTEM PROMPT:\s*([\s\S]*?)USER MESSAGE:\s*/);
  const userMatch = text.match(/USER MESSAGE:\s*([\s\S]*)/);
  if (!systemMatch || !userMatch) {
    throw new Error("prompt.txt must contain 'SYSTEM PROMPT:' and 'USER MESSAGE:' sections");
  }
  return {
    system: systemMatch[1].trim(),
    user: userMatch[1].trim(),
  };
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: Set ANTHROPIC_API_KEY environment variable");
    process.exit(1);
  }

  const promptFile = join(__dirname, "data", "prompt.txt");
  const { system, user } = parsePromptFile(promptFile);

  console.log("System prompt:", system.slice(0, 80) + "...");
  console.log("User message:", user.slice(0, 80) + "...");
  console.log("\nSending to API...\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content[0].text;
  console.log("--- Response ---\n");
  console.log(text);
  console.log(`\nTokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);

  mkdirSync(join(__dirname, "output"), { recursive: true });
  const outFile = join(__dirname, "output", `sim-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify({ system, user, response: text, usage: response.usage }, null, 2));
  console.log(`\nSaved to ${outFile}`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
