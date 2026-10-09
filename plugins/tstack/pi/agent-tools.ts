import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type Static, Type } from "typebox";

import { listing } from "./agent-text.ts";
import type { AgentRunner } from "./agents.ts";
import { isForegroundWait } from "./sleep-wait.ts";

// FIX [Claude AI - Opus 5] (2026-10-08 19:05:40): this schema is no longer
// registered as a tool, so no model ever sees it. AgentRunner.start() types
// against it and likewise has no caller. Both are kept because restore() and
// the record bookkeeping below share their shapes; nothing here spawns.
const agentParams = Type.Object(
  {
    description: Type.String({ description: "A short (3-5 word) description of the task" }),
    prompt: Type.String({ description: "The task for the agent to perform" }),
    subagent_type: Type.Optional(
      Type.String({
        description:
          "Agent definition to run: general-purpose (default), tstack:tstack-agent, tstack:comment-sicko, tstack:tstack-agent-<level>, or tstack:effort-<level>.",
      }),
    ),
    model: Type.Optional(
      Type.String({
        description:
          "Optional model for this agent: a family name (opus, fable, sonnet, haiku) or a full provider/id. If omitted, the agent runs on the parent's model.",
      }),
    ),
    run_in_background: Type.Optional(Type.Boolean({ description: "Return at once; a completion notice arrives when the agent exits." })),
    isolation: Type.Optional(Type.Unsafe<"worktree">({ type: "string", enum: ["worktree"], description: "Run the agent in its own git worktree." })),
    readonly: Type.Optional(Type.Boolean({ description: "Run the agent without the edit and write tools." })),
  },
  { additionalProperties: false },
);
export type AgentParams = Static<typeof agentParams>;

const sendParams = Type.Object(
  {
    to: Type.String({ description: "agentId or the agent's description" }),
    message: Type.String({ description: "The message to send" }),
  },
  { additionalProperties: false },
);

const stopParams = Type.Object({ id: Type.String({ description: "agentId (or description) of the agent to stop" }) }, { additionalProperties: false });

// Claude Code's background launch result, word for word.

const SLEEP_BLOCKED =
  "Blocked: a background agent is still running, and its completion notice arrives on its own. Do not sleep or poll for it. Continue other work, or end your turn. The notice starts your next one.";

// model-only exposure keeps every tool declared to the model even under
// codemode.mode "only", which would otherwise reach them only through scripts.
export function registerAgentTools(pi: ExtensionAPI, runner: AgentRunner): void {
  // Wording alone did not stop models from polling a background agent with
  // sleep, which spends turns and leads them to cut the agent short.
  pi.on("tool_call", (event) => {
    if (!runner.busy || event.toolName !== "bash") return;
    const { command } = event.input;
    if (typeof command === "string" && isForegroundWait(command)) return { block: true, reason: SLEEP_BLOCKED };
  });
  // FIX [Claude AI - Opus 5] (2026-10-08 21:40:05): the `agent` tool is not registered.
  // tstack never spawns: a subagent re-reads what this session already paid for, in a
  // context this session cannot see. Teamwork goes through the lane skill instead.
  // AgentRunner stays because /loop and ask drive a pi child internally, which is
  // infrastructure the model cannot reach, not a model-facing spawn primitive.
  // The three tools below only ever see agents this session started, so with nothing
  // spawning they return empty. That is correct: on Pi, tstack is solo.

  pi.registerTool({
    name: "send_message",
    label: "Send message",
    exposure: "model-only",
    description:
      "Send a message to an agent this session started, by agentId or description. A running agent reads it after its current tool calls and carries on in the same run, so one completion notice follows. A finished agent resumes in the background with its earlier context and sends a completion notice.",
    parameters: sendParams,
    async execute(_id, params) {
      const { record, running } = await runner.send(params.to, params.message);
      const text = running
        ? `Agent ${record.agent.id} is running; it reads the message after its current tool calls.`
        : JSON.stringify({ agentId: record.agent.id, status: "running" });
      return { content: [{ type: "text", text }], details: { agentId: record.agent.id, running } };
    },
  });

  pi.registerTool({
    name: "list_agents",
    label: "List agents",
    exposure: "model-only",
    description:
      "List every agent this session started with its status. running means the process is alive; completed, failed, and stopped are reported only after the process exited.",
    parameters: Type.Object({}, { additionalProperties: false }),
    async execute() {
      const agents = listing(runner.list());
      return { content: [{ type: "text", text: JSON.stringify(agents, null, 2) }], details: { agents } };
    },
  });

  pi.registerTool({
    name: "stop_agent",
    label: "Stop agent",
    exposure: "model-only",
    description:
      "Stop a running agent: ends its pi process and the bash command it has running, and returns once the process has exited. A process a finished bash command left in the background is not stopped. Stopping a finished agent reports its final status unchanged.",
    parameters: stopParams,
    async execute(_id, params) {
      const record = await runner.stop(params.id);
      return {
        content: [{ type: "text", text: JSON.stringify({ agentId: record.agent.id, status: record.status, exitCode: record.exitCode }) }],
        details: { agentId: record.agent.id, status: record.status },
      };
    },
  });
}
