# Single-Agent Tool Demos

Node.js demos using `@openai/agents` for:

- a hosted `webSearchTool` flow
- a local `searchTool` flow that returns `Hello World`

## Behavior

- Input: return flight from Boston (BOS) to Denver (DEN), leaving tomorrow and returning the next day.
- Uses a single agent plus `webSearchTool`.
- Logs runtime details to console for:
  - agent lifecycle calls,
  - tool calls,
  - raw LLM stream events,
  - final answer.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure `.env` contains:

```bash
OPENAI_API_KEY=your_key_here
```

## Run

Run the hosted web search example:

```bash
node index_webSearchTool.mjs
```

Run the local dummy tool example:

```bash
node index_dummyTool.mjs
```

The Runner is an object that does the following:

1. Send user message to LLM
2. LLM responds with tool call
3. Runner parses tool call
4. Runner calls tool.execute()
5. Tool returns its output eg "Hello World"
6. Runner creates tool-output message
7. Runner sends updated conversation (including tool output) to LLM
8. LLM produces final response
