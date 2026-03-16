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

const DATAENGINE_BASE = `${process.env.NEXT_PUBLIC_DEX_API_BASE_URL || "https://api.dataengine.run"}/api`;

const SYSTEM_PROMPT = `You are an AI sales assistant for Outbound Engine X, a multi-channel outbound sales platform. You help users:

- Find and filter leads from their database
- Look up company and person details
- Understand campaign performance

Use the available tools to look up real data when answering questions about leads, companies, or people. Do not make up or guess data — always use a tool to retrieve it.`;

async function dataEngineFetch(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: Record<string, unknown>;
  } = {}
) {
  const token = process.env.DATAENGINE_API_TOKEN;
  if (!token) {
    return { error: "Data Engine API is not configured." };
  }

  const { method = "POST", body } = options;

  try {
    const res = await fetch(`${DATAENGINE_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
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
      getCompany: tool({
        description: "Get details about a specific company by entity ID.",
        inputSchema: z.object({
          entity_id: z.string().describe("The entity ID of the company"),
        }),
        execute: async ({ entity_id }) => {
          return dataEngineFetch("/v1/entities/companies", {
            body: { entity_id },
          });
        },
      }),
      getPerson: tool({
        description: "Get details about a specific person by entity ID.",
        inputSchema: z.object({
          entity_id: z.string().describe("The entity ID of the person"),
        }),
        execute: async ({ entity_id }) => {
          return dataEngineFetch("/v1/entities/persons", {
            body: { entity_id },
          });
        },
      }),
      searchEntities: tool({
        description:
          "Search for companies or people matching criteria. Use this for any discovery or filtering request — e.g. 'find staffing companies in Texas', 'show me VPs of Sales at SaaS companies'. Supports filtering by industry, seniority, department, job title, location, company domain, company name, employee range, and free-text query. Always set search_type to 'companies' or 'people' based on what the user is looking for.",
        inputSchema: z.object({
          search_type: z
            .enum(["companies", "people"])
            .describe("Whether to search for companies or people"),
          criteria: z
            .record(z.string(), z.union([z.string(), z.array(z.string())]))
            .describe(
              "Search filters. Valid keys: seniority, department, industry, employee_range, company_type, continent, country_code, query, company_domain, company_name, company_linkedin_url, job_title, location. Values can be strings or arrays of strings."
            ),
          provider: z
            .string()
            .optional()
            .describe(
              "Force a specific provider: 'prospeo' or 'blitzapi'. Omit to auto-select."
            ),
          limit: z
            .number()
            .optional()
            .default(25)
            .describe("Max results per page (1-100)"),
          page: z
            .number()
            .optional()
            .default(1)
            .describe("Page number for pagination"),
        }),
        execute: async (params) => {
          return dataEngineFetch("/v1/search", { body: params });
        },
      }),
      saveList: tool({
        description:
          "Create a named list and optionally add members to it. Use this when the user wants to save search results — e.g. 'save these as a list called Q3 Prospects'. Pass entity_type matching the search_type used to find the results. If members are provided, they are the raw result objects from searchEntities.",
        inputSchema: z.object({
          name: z.string().describe("Name for the list"),
          description: z
            .string()
            .optional()
            .describe("Optional description"),
          entity_type: z
            .enum(["companies", "people"])
            .describe("Type of entities in this list"),
          members: z
            .array(z.record(z.string(), z.any()))
            .optional()
            .describe(
              "Array of result objects from searchEntities to add to the list. Max 500."
            ),
        }),
        execute: async ({ name, description, entity_type, members }) => {
          const createResult = await dataEngineFetch("/v1/lists", {
            body: { name, description, entity_type },
          });

          if (createResult.error) {
            return createResult;
          }

          if (members && members.length > 0) {
            const listId = createResult.id;
            const addResult = await dataEngineFetch(
              `/v1/lists/${listId}/members`,
              { body: { members } }
            );

            if (addResult.error) {
              return {
                ...createResult,
                member_addition_error: addResult.error,
              };
            }

            return { ...createResult, members_added: addResult };
          }

          return createResult;
        },
      }),
      getLists: tool({
        description:
          "Get all saved lists. Use this when the user asks to see their lists, or when you need to find a list by name before operating on it.",
        inputSchema: z.object({}),
        execute: async () => {
          return dataEngineFetch("/v1/lists", { method: "GET" });
        },
      }),
      getList: tool({
        description:
          "Get a specific list with its members. Use this when the user wants to see the contents of a list, or when you need member data for enrichment or export.",
        inputSchema: z.object({
          list_id: z
            .string()
            .describe("The ID of the list to retrieve"),
        }),
        execute: async ({ list_id }) => {
          return dataEngineFetch(`/v1/lists/${list_id}`, { method: "GET" });
        },
      }),
      addListMembers: tool({
        description:
          "Add members to an existing list. Members are raw result objects from searchEntities. Max 500 per call. Use this when the user wants to add more results to a list that already exists.",
        inputSchema: z.object({
          list_id: z
            .string()
            .describe("The ID of the list to add members to"),
          members: z
            .array(z.record(z.string(), z.any()))
            .describe(
              "Array of result objects from searchEntities. Max 500."
            ),
        }),
        execute: async ({ list_id, members }) => {
          return dataEngineFetch(`/v1/lists/${list_id}/members`, {
            body: { members },
          });
        },
      }),
      enrichList: tool({
        description:
          "Enrich companies in a list with additional data (emails, phone numbers, firmographics). First retrieves the list members, then sends them to the bulk enrichment pipeline. Use this when the user asks to enrich, find emails for, or get contact info for companies in a list.",
        inputSchema: z.object({
          list_id: z
            .string()
            .describe("The ID of the list to enrich"),
          operation: z
            .enum([
              "company.enrich.bulk_prospeo",
              "company.enrich.bulk_profile",
            ])
            .optional()
            .default("company.enrich.bulk_profile")
            .describe(
              "Enrichment operation. 'company.enrich.bulk_profile' uses multi-provider waterfall (recommended). 'company.enrich.bulk_prospeo' uses Prospeo only."
            ),
        }),
        execute: async ({ list_id, operation }) => {
          const listResult = await dataEngineFetch(`/v1/lists/${list_id}`, {
            method: "GET",
          });

          if (listResult.error) {
            return listResult;
          }

          if (!listResult.members || listResult.members.length === 0) {
            return { error: "List has no members to enrich." };
          }

          const companies = listResult.members.map(
            (member: { snapshot_data?: Record<string, unknown> }) => {
              const data = member.snapshot_data || {};
              const company: Record<string, unknown> = {};
              if (data.company_domain)
                company.company_domain = data.company_domain;
              if (data.company_website)
                company.company_website = data.company_website;
              if (data.company_linkedin_url)
                company.company_linkedin_url = data.company_linkedin_url;
              if (data.company_name)
                company.company_name = data.company_name;
              if (data.source_company_id)
                company.source_company_id = data.source_company_id;
              return company;
            }
          );

          const batchSize = 50;
          const results = [];

          for (let i = 0; i < companies.length; i += batchSize) {
            const batch = companies.slice(i, i + batchSize);
            const batchResult = await dataEngineFetch("/v1/execute", {
              body: {
                operation_id: operation,
                entity_type: "company",
                input: { companies: batch },
              },
            });
            results.push(batchResult);
          }

          return {
            list_id,
            total_companies: companies.length,
            batches: results.length,
            results,
          };
        },
      }),
      exportList: tool({
        description:
          "Export a list as a flat JSON array of member data. Use this when the user wants to export or download a list.",
        inputSchema: z.object({
          list_id: z
            .string()
            .describe("The ID of the list to export"),
        }),
        execute: async ({ list_id }) => {
          return dataEngineFetch(`/v1/lists/${list_id}/export`, {
            method: "GET",
          });
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
