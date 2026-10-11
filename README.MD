# Flight Assistant

A command-line flight assistant built with TypeScript and the OpenAI API. It keeps conversation history during a session and can look up sample flights or reserve one through model-driven tools.

## Features

- Conversational chat with history preserved for the duration of the process.
- Flight search by origin and destination airport code.
- Flight reservations with a confirmation number.
- Tool results are returned to the assistant before it responds.

## Requirements

- Node.js **22.6.0 or newer** (Node.js 24 LTS is recommended).
- An OpenAI API key.

Check your active Node.js version:

```bash
node --version
```

If you use [nvm](https://github.com/nvm-sh/nvm), you can install and activate Node.js 24 with:

```bash
nvm install 24
nvm use 24
```

## Setup

Install the project dependencies:

```bash
npm install
```

Create a `.env` file in the project root and add your API key:

```dotenv
OPEN_AI_KEY=your_openai_api_key
```

Keep `.env` private; do not commit API keys to source control.

## Run

Start the flight assistant:

```bash
npm run start:flight-assistant
```

Enter messages at the `You:` prompt. Type `/exit` or press `Ctrl+C` to end the session.

Example requests:

```text
Find flights from SFO to LAX.
Reserve UA 123.
```

## Available tools

| Tool             | Arguments               | Description                                                                                  |
| ---------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `find_flights`   | `origin`, `destination` | Returns available flight numbers for the specified airport codes.                            |
| `reserve_flight` | `flight`                | Reserves the specified flight and returns a confirmation, or reports that it is unavailable. |

## Sample data and limitations

This is a learning/demo application, not a live booking service. Flight inventory is hard-coded in `src/flightAssistance.ts`, and reservations exist only in memory for the current process. Available sample routes are SFO to LAX and DFW to LAX. No passenger details or payment information are collected, and no airline or booking-provider API is connected.

## Project layout

```text
src/
  flightAssistance.ts  Interactive flight assistant
  index.ts             Separate function-calling example
```
