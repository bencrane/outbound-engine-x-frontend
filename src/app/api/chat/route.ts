import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { z } from "zod";

const DATAENGINE_BASE = "https://api.dataengine.run/api";

const SYSTEM_PROMPT = `You are an AI sales assistant for Outbound Engine X, a multi-channel outbound sales platform. You help users:

- Find and filter leads from their database
- Look up company and person details
- Understand campaign performance

Use the available tools to look up real data when answering questions about leads, companies, or people. Do not make up or guess data — always use a tool to retrieve it.`;

async function dataEngineFetch(path: string, body: Record<string, unknown>) {
  const token = process.env.DATAENGINE_API_TOKEN;
  if (!token) {
    return { error: "Data Engine API is not configured." };
  }

  try {
    const res = await fetch(`${DATAENGINE_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { error: `Data Engine returned status ${res.status}.` };
    }

    return await res.json();
  } catch {
    return { error: "Failed to reach Data Engine API." };
  }
}

export async function POST(req: Request) {
  const {
    messages,
    tools: clientTools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: unknown }>;
  } = await req.json();

  const result = streamText({
    model: anthropic(process.env.CHAT_MODEL || "claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      ...frontendTools(
        (clientTools ?? {}) as Parameters<typeof frontendTools>[0]
      ),
      queryLeads: tool({
        description:
          "Search for leads (persons) matching filters such as industry, title, seniority, or company ID.",
        inputSchema: z.object({
          company_id: z.string().optional().describe("Filter by company ID"),
          industry: z.string().optional().describe("Filter by industry"),
          title: z.string().optional().describe("Filter by job title"),
          seniority: z
            .string()
            .optional()
            .describe("Filter by seniority level"),
          limit: z
            .number()
            .optional()
            .default(25)
            .describe("Max number of results to return"),
        }),
        execute: async (params) => {
          const body: Record<string, unknown> = {};
          if (params.company_id) body.company_id = params.company_id;
          if (params.industry) body.industry = params.industry;
          if (params.title) body.title = params.title;
          if (params.seniority) body.seniority = params.seniority;
          if (params.limit) body.limit = params.limit;
          return dataEngineFetch("/v1/entities/persons", body);
        },
      }),
      getCompany: tool({
        description: "Get details about a specific company by entity ID.",
        inputSchema: z.object({
          entity_id: z.string().describe("The entity ID of the company"),
        }),
        execute: async ({ entity_id }) => {
          return dataEngineFetch("/v1/entities/companies", { entity_id });
        },
      }),
      getPerson: tool({
        description: "Get details about a specific person by entity ID.",
        inputSchema: z.object({
          entity_id: z.string().describe("The entity ID of the person"),
        }),
        execute: async ({ entity_id }) => {
          return dataEngineFetch("/v1/entities/persons", { entity_id });
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
