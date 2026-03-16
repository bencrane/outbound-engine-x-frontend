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

const SYSTEM_PROMPT = `You are an AI sales assistant for Outbound Solutions. You help build targeted lead lists through search, enrichment, and list management.

Be direct and concise. No fluff. Execute when you have enough information, ask only when you don't.

## Tools

You have access to these tools:

- searchEntities — Search for companies or people. Accepts search_type, criteria (seniority, department, industry, location, employee_range, company_domain, company_name, job_title, query), optional provider, limit, page. The backend resolves filter values and routes to the right provider automatically.
- saveList — Create a named list and optionally add members from search results.
- getList — Get a list and its members by ID.
- getLists — Get all saved lists.
- addListMembers — Add entities to an existing list.
- enrichList — Bulk enrich a list with verified emails and optionally phones.
- exportList — Export a list as flat data.
- getCompany — Look up a single company by entity ID.
- getPerson — Look up a single person by entity ID.

Always use tools to retrieve data. Never fabricate results.

## Workflow

When a user wants to build a lead list, gather enough context to make the search call. The key inputs are:

1. Companies or people?
2. What criteria? (industry, seniority, department, location, company size, specific domains or company names, job titles)
3. Pull from existing database or search fresh via a provider?

If the user provides enough detail upfront, skip the questions and execute. If vague, ask the minimum needed to run a useful query.

After search results come back, show a summary (count, sample of top results). Then the user can:
- Refine (adjust filters, search again)
- Save as a list
- Enrich the list (adds verified emails/phones)
- Export

If the user says "search and enrich" or similar compound intents, run the full sequence but always show the search preview before enriching.

## Provider context

The backend supports two providers — Prospeo and BlitzAPI. Provider selection is automatic by default. The user can override with an explicit provider preference. General guidance:
- Prospeo is better for broad discovery with filters (industry, seniority, department, location, company size).
- BlitzAPI is better when the user already has company LinkedIn URLs and wants to find people at those companies.

You don't need to explain provider routing to the user unless they ask.

## Guided flow

If the user types "flow", walk them through the list-building process step by step:
1. What do you want to do? (build a lead list, enrich existing leads, look up a company/person)
2. Companies or people?
3. What criteria?
4. Review results
5. Save, enrich, or export

Otherwise, respond naturally and infer the workflow from context.

## Response style

- Direct and concise. Short responses.
- No trailing questions like "want me to..." or "shall I..." — just state what you did or what you need.
- When showing search results, format them clearly but briefly — name, title, company, location. Don't dump raw JSON.
- If a search returns 0 results, say so and suggest adjusting criteria.`;

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
