import { createInterface } from "node:readline";
import OpenAI from "openai";

type Flight = {
  origin: string;
  destination: string;
  flight: string;
};

const flights: Flight[] = [
  { origin: "SFO", destination: "LAX", flight: "UA 123" },
  { origin: "SFO", destination: "LAX", flight: "AA 456" },
  { origin: "DFW", destination: "LAX", flight: "AA 789" },
];
const reservedFlights = new Set<string>();
let nextConfirmationNumber = 100001;

function getAvailableFlights(origin: string, destination: string): string[] {
  const normalizedOrigin = origin.trim().toUpperCase();
  const normalizedDestination = destination.trim().toUpperCase();

  return flights
    .filter(
      (flight) =>
        flight.origin === normalizedOrigin &&
        flight.destination === normalizedDestination &&
        !reservedFlights.has(flight.flight),
    )
    .map((flight) => flight.flight);
}

function reserveFlight(flightNumber: string): string {
  const flight = flights.find(
    ({ flight: availableFlight }) =>
      availableFlight.toLowerCase() === flightNumber.trim().toLowerCase(),
  );

  if (!flight) {
    return JSON.stringify({ status: "not_found", flight: flightNumber });
  }
  if (reservedFlights.has(flight.flight)) {
    return JSON.stringify({ status: "fully_booked", flight: flight.flight });
  }

  reservedFlights.add(flight.flight);
  const confirmationNumber = `FL${nextConfirmationNumber++}`;
  return JSON.stringify({
    status: "confirmed",
    flight: flight.flight,
    origin: flight.origin,
    destination: flight.destination,
    confirmationNumber,
  });
}

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_flights",
      description: "Find available flights for an origin and destination airport.",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "The departure airport's three-letter IATA code.",
          },
          destination: {
            type: "string",
            description: "The arrival airport's three-letter IATA code.",
          },
        },
        required: ["origin", "destination"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reserve_flight",
      description: "Reserve an available flight using its flight number.",
      parameters: {
        type: "object",
        properties: {
          flight: {
            type: "string",
            description: "The flight number to reserve, such as UA 123.",
          },
        },
        required: ["flight"],
        additionalProperties: false,
      },
    },
  },
];

const context: OpenAI.Chat.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful flight assistant. Use find_flights to check availability and reserve_flight to book a flight. Never claim a flight is available or reserved unless the tool confirms it. Ask for missing airport codes or flight numbers.",
  },
];

function parseArguments(argumentsJson: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(argumentsJson);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("The model returned invalid tool arguments.");
  }
  return parsed as Record<string, unknown>;
}

function requiredStringArgument(
  args: Record<string, unknown>,
  name: string,
): string {
  const value = args[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`The model did not provide a valid "${name}" argument.`);
  }
  return value;
}

function executeTool(name: string, argumentsJson: string): string {
  const args = parseArguments(argumentsJson);

  switch (name) {
    case "find_flights":
      return JSON.stringify({
        origin: requiredStringArgument(args, "origin").toUpperCase(),
        destination: requiredStringArgument(args, "destination").toUpperCase(),
        flights: getAvailableFlights(
          requiredStringArgument(args, "origin"),
          requiredStringArgument(args, "destination"),
        ),
      });
    case "reserve_flight":
      return reserveFlight(requiredStringArgument(args, "flight"));
    default:
      throw new Error(`Unsupported tool requested by the model: ${name}`);
  }
}

async function respondToUser(openai: OpenAI, userMessage: string): Promise<void> {
  context.push({ role: "user", content: userMessage });

  while (true) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: context,
      tools,
      tool_choice: "auto",
    });
    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("The model returned an empty response.");
    }

    context.push(message);
    if (message.tool_calls?.length) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") {
          throw new Error(`Unsupported tool call type: ${toolCall.type}`);
        }
        context.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: executeTool(
            toolCall.function.name,
            toolCall.function.arguments,
          ),
        });
      }
      continue;
    }

    if (message.content) {
      console.log(`Assistant: ${message.content}`);
    } else {
      throw new Error("The model returned neither a message nor a tool call.");
    }
    return;
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.OPEN_AI_KEY;
  if (!apiKey) {
    throw new Error("Set OPEN_AI_KEY in the environment before starting the assistant.");
  }

  const openai = new OpenAI({ apiKey });
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.setPrompt("You: ");
  console.log("Flight assistant ready. Type /exit to end the conversation.");
  terminal.prompt();

  try {
    for await (const line of terminal) {
      const userMessage = line.trim();
      if (userMessage.toLowerCase() === "/exit") {
        break;
      }
      if (userMessage) {
        await respondToUser(openai, userMessage);
      }
      terminal.prompt();
    }
  } finally {
    terminal.close();
  }
}

main().catch((error: unknown) => {
  console.error("Flight assistant failed:", error);
  process.exitCode = 1;
});
