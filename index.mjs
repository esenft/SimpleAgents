/* This example illustrate the code for an agent that has access to a local tool called searchTool.
*/
import 'dotenv/config';
import { Agent, run, Runner, tool } from '@openai/agents';
import { z } from 'zod';
// This is the prompt we send to the agent.
const userInput = 'Please call searchTool for "airfare from Boston to Denver" and then explain the tool result.';

// Local tool that always returns "Hello World".
// We log inside execute() so you can see exactly what the LLM passed in.
const searchTool = tool({
  name: 'searchTool',
  description: 'Always returns "Hello World".',
  parameters: z.object({
    query: z.string().describe('The search query from the LLM'),
  }),
  execute: async (input) => {
    const toolResult = 'Hello World';
    return toolResult;
  },
});

const agent = new Agent({
  name: 'LocalToolAgent',
  instructions:
    'You are a helpful assistant. Use searchTool whenever the user asks you to search. After the tool returns, explain the result clearly.',
  tools: [searchTool],
});
runner = new Runner();

// run the agent 
const result = await runner.run(agent, userInput, { stream: true });
console.log('Final output:', result.finalOutput);

/*
1. Send user message to LLM
2. LLM responds with tool call
3. Runner parses tool call
4. Runner calls tool.execute()
5. Tool returns its output eg "Hello World"
6. Runner creates tool-output message
7. Runner sends updated conversation (including tool output) to LLM
8. LLM produces final response
*/
