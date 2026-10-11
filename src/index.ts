import { asyncWrapProviders } from "node:async_hooks";
import { OpenAI } from "openai";

const openAI = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

function getTimeOfDay() {
  return "5:45";
}

function getOrderStatus(orderId: string) {
  console.log(`Getting the status of order ${orderId}`);
  const orderAsNumber = parseInt(orderId);
  if (orderAsNumber % 2 == 0) {
    return "IN_PROGRESS";
  }
  return "Completed";
}

async function callOpenAIWithTools() {
  const context: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You ara a helpful assistant that gives information about the time of day and order status",
    },
    {
      role: "user",
      content: "what is the order of 1234",
    },
  ];
  const response = await openAI.chat.completions.create({
    model: "gpt-4",
    messages: context,
    tools: [
      {
        type: "function",
        function: {
          name: "getTimeOfDay",
          description: "Get the time of day",
        },
      },
      {
        type: "function",
        function: {
          name: "getOrderStatus",
          description: "Returns the status of an order",
          parameters: {
            type: "object",
            properties: {
              orderId: {
                type: "string",
                description: "The id of the order to get the status of ",
              },
            },
            required: ["orderId"],
          },
        },
      },
    ],
    tool_choice: "auto", //the engine will decide wich tool is used
  });

  const willInvokeFunction = response.choices[0].finish_reason == "tool_calls";

  const toolCall = response.choices[0].message.tool_calls![0];

  if (willInvokeFunction) {
    if (toolCall.type === "function") {
      const toolName = toolCall.function.name;
      // ... handle function call
      if (toolName === "getTimeOfDay") {
        const toolResponse = getTimeOfDay();
        context.push(response.choices[0].message);
        context.push({
          role: "tool",
          content: toolResponse,
          tool_call_id: toolCall.id,
        });
      }
    }   

    

        if (toolCall.type === "function") {
          const toolName = toolCall.function.name;
          // ... handle function call
          if (toolName === "getOrderStatus") {
            const rawArgument = toolCall.function.arguments;
            const parsedArgument = JSON.parse(rawArgument);
            const toolResponse = getOrderStatus(parsedArgument.orderId);
            context.push(response.choices[0].message);
            context.push({
              role: "tool",
              content: toolResponse,
              tool_call_id: toolCall.id,
            });
          }
        }




  }
  const sencondResponse = await openAI.chat.completions.create({
    model: "chatgpt-4o-latest",
    messages: context,
  });
  console.log(sencondResponse.choices[0].message.content);
}
callOpenAIWithTools();

//configure our chat tools

//invoke the tool
//make a second openai call with the tool
