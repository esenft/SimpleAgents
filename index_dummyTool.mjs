import 'dotenv/config';
import { Agent, Runner, tool } from '@openai/agents';
import { z } from 'zod';

// This is the prompt we send to the agent.
// It explicitly asks to call searchTool.
const userInput = 'Please call searchTool for "airfare from Boston to Denver" and then explain the tool result.';

// Local tool that always returns "Hello World".
// We log inside execute() so you can see exactly what the LLM passed in.
const searchTool = tool({
  name: 'searchTool',
  description: 'Demo local search tool. Always returns "Hello World".',
  parameters: z.object({
    query: z.string().describe('The search query from the LLM'),
  }),
  execute: async (input) => {
    console.log(`[Local Tool Execute] searchTool called with query: ${input.query}`);
    const toolResult = 'Hello World';
    console.log(`[Local Tool Execute] searchTool returning: ${toolResult}`);
    return toolResult;
  },
});

// One agent with one local tool.
const agent = new Agent({
  name: 'LocalToolAgent',
  instructions:
    'You are a helpful assistant. Use searchTool whenever the user asks you to search. After the tool returns, explain the result clearly.',
  tools: [searchTool],
});

const runner = new Runner();

function formatJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

// Runner lifecycle logs (high-level view).
function registerRunnerLogs() {
  runner.on('agent_start', (_context, runningAgent) => {
    console.log(`[Agent Start] ${runningAgent.name}`);
  });

  runner.on('agent_tool_start', (_context, runningAgent, calledTool, details) => {
    const toolName = calledTool?.name ?? details?.toolCall?.name ?? 'unknown_tool';
    console.log(`[Tool Start] Agent=${runningAgent.name} Tool=${toolName}`);
    console.log(`[Tool Start] LLM tool call payload: ${formatJson(details?.toolCall)}`);
  });

  runner.on('agent_tool_end', (_context, runningAgent, calledTool, result, details) => {
    const toolName = calledTool?.name ?? details?.toolCall?.name ?? 'unknown_tool';
    console.log(`[Tool End] Agent=${runningAgent.name} Tool=${toolName}`);
    console.log(`[Tool End] Tool result passed back to LLM: ${result}`);
  });

  runner.on('agent_end', (_context, runningAgent, output) => {
    const preview = String(output).replace(/\s+/g, ' ').slice(0, 120);
    const suffix = preview.length === 120 ? '…' : '';
    console.log(`[Agent End] ${runningAgent.name} | Output preview: ${preview}${suffix}`);
  });
}

// Stream logs (low-level view).
function logStreamEvent(event) {
  if (event.type === 'run_item_stream_event') {
    console.log(`[Run Item] ${event.name}`);

    if (event.name === 'tool_called') {
      const rawToolCall = event?.item?.rawItem;
      const toolName = rawToolCall?.name ?? rawToolCall?.tool_name ?? 'unknown_tool';
      const toolInput = rawToolCall?.input ?? rawToolCall?.arguments ?? rawToolCall?.args;
      console.log(`[LLM -> Tool Call] name=${toolName}`);
      console.log(`[LLM -> Tool Input] ${formatJson(toolInput)}`);
    }

    if (event.name === 'tool_output') {
      const rawToolOutput = event?.item?.rawItem;
      const outputText = rawToolOutput?.output ?? rawToolOutput?.text ?? formatJson(rawToolOutput);
      console.log(`[Tool -> LLM Output Item] ${formatJson(outputText)}`);
    }

    return;
  }

  if (event.type === 'raw_model_stream_event') {
    const dataType = event?.data?.type ?? 'unknown';
    if (dataType.includes('response')) {
      console.log(`[LLM Event] ${dataType}`);
    }
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in .env');
    process.exit(1);
  }

  registerRunnerLogs();

  console.log('=== Input ===');
  console.log(userInput);
  console.log('\n=== Runtime Logs ===');

  const result = await runner.run(agent, userInput, { stream: true });

  if (typeof result?.[Symbol.asyncIterator] === 'function') {
    for await (const event of result) {
      logStreamEvent(event);
    }
  }

  console.log('\n=== Final Output ===');
  console.log(result.finalOutput);
}

main().catch((error) => {
  console.error('Run failed:', error?.message ?? error);
  process.exit(1);
});
