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

const DEFAULT_RESULT_LIMIT = 10;

const SYSTEM_PROMPT = `You are an AI assistant for Outbound Solutions. You help find businesses and people using external data providers.

## How it works

I tell you what I want. You figure out which tool to use. You confirm before running. You show results and wait.

## Tool routing

- Finding businesses by category, industry, or location (dental practices, med spas, car washes, restaurants, etc.) → use enigmaDiscover with generate_locations_segment or generate_brands_segment
- Looking up a specific business by name → use enigmaDiscover with search_business
- Revenue or financial data for a known brand → use enigmaDiscover with get_brand_card_analytics
- Locations for a known brand → use enigmaDiscover with get_brand_locations
- Corporate structure for a known brand → use enigmaDiscover with get_brand_legal_entities
- Finding people/decision-makers at a specific company → use blitzapiSearch with person.search.waterfall_icp_blitzapi
- Browsing employees at a company with filters → use blitzapiSearch with person.search.employee_finder_blitzapi
- Finding companies by size/industry on LinkedIn → use blitzapiSearch with company.search.blitzapi
- Finding a work email from LinkedIn URL → use blitzapiEnrich with person.contact.resolve_email_blitzapi
- Finding a mobile phone from LinkedIn URL → use blitzapiEnrich with person.contact.resolve_mobile_phone_blitzapi (5 credits, US only)
- Enriching a company profile → use blitzapiEnrich with company.enrich.blitzapi
- Resolving domain to LinkedIn URL → use blitzapiEnrich with company.resolve.linkedin_from_domain_blitzapi
- Resolving LinkedIn URL to domain → use blitzapiEnrich with company.resolve.domain_from_linkedin_blitzapi
- Validating an email → use blitzapiEnrich with person.contact.verify_email_blitzapi
- Reverse lookup from email → use blitzapiEnrich with person.resolve.from_email
- Reverse lookup from phone → use blitzapiEnrich with person.resolve.from_phone
- Saving results to a list → use saveList
- Enriching a saved list → use enrichList
- Exporting a list → use exportList
- Viewing saved lists → use getLists or getList
- Adding to an existing list → use addListMembers
- Looking up a single company → use getCompany
- Looking up a single person → use getPerson
- Checking available search filters → use getSearchFilters

Always ask which provider to use before running any search or discovery. Present the options that make sense for my request (e.g. "Enigma or BlitzAPI?" for company search). If I explicitly name a provider in my request, use that one without asking.

## Limits and credits

Default result limit is ${DEFAULT_RESULT_LIMIT}. Always use ${DEFAULT_RESULT_LIMIT} unless I specify a different number. If I say "give me 50" or "more" or any specific number, use that number instead.

ALWAYS confirm before executing any search, discovery, or enrichment call. Show me exactly:
- Which tool and provider
- The key parameters (industry, location, filters)
- The result limit
- Then wait for me to say go, yes, run it, or similar

Do not execute without my confirmation. Every call costs credits. This is non-negotiable.

For single lookups (getCompany, getPerson, getSearchFilters) and list operations (getLists, getList, exportList), no confirmation needed — just run them.

## Working with results

After showing results, wait. I will tell you what to do next. Do not suggest next steps. Do not ask "would you like to..." or "shall I..." Just show the results and stop.

If I say save it, save as, or name a list → use saveList
If I say enrich it or get emails/phones → use enrichList
If I say export → use exportList
If I say add these to [list name] → use getLists to find it, then addListMembers

## Response style

- Short. A few sentences max unless results are long.
- No markdown headers. No numbered steps. No bullet point lists of options.
- Bold company names in results.
- One question at a time if you need to clarify something.
- Calm, direct, competent. Not eager or enthusiastic.
- Never use exclamation points.
- Don't narrate what's happening behind the scenes.
- Don't explain provider selection or internal mechanics unless I ask.
- If something returns 0 results, say so briefly and suggest tweaking a filter.`;

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
      getSearchFilters: tool({
        description:
          "Get the valid search filter fields and their allowed values for a given provider and entity type. Call this after the user picks a provider so you know exactly which filters are available and what values each accepts. Use the returned values to guide the user through filter selection and to validate their input.",
        inputSchema: z.object({
          provider: z
            .enum(["prospeo", "blitzapi"])
            .optional()
            .default("prospeo")
            .describe("The search provider"),
          entity_type: z
            .enum(["companies", "people"])
            .optional()
            .default("companies")
            .describe("The entity type to get filters for"),
        }),
        execute: async ({ provider, entity_type }) => {
          return dataEngineFetch(
            `/v1/search/filters?provider=${provider}&entity_type=${entity_type}`,
            { method: "GET" }
          );
        },
      }),
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
      enigmaDiscover: tool({
        description:
          "Discover businesses by type, location, and financial criteria using Enigma's SMB database. Use this when the user asks to find businesses in a category — e.g. 'find dental practices in Texas', 'show me med spas in California with over $500K revenue', 'find car washes in Florida'. Returns business names, addresses, phone numbers, websites, and revenue data. Results are automatically saved to the database when persist is true.",
        inputSchema: z.object({
          tool: z
            .enum([
              "generate_locations_segment",
              "generate_brands_segment",
              "search_business",
              "get_brand_card_analytics",
              "get_brand_locations",
              "get_brand_legal_entities",
              "get_brands_by_legal_entity",
            ])
            .describe(
              "The Enigma MCP tool to call. Use 'generate_locations_segment' for finding businesses by category/location. Use 'generate_brands_segment' for finding brand-level data. Use 'search_business' for looking up a specific named business. Use 'get_brand_card_analytics' for revenue data on a known brand. Use 'get_brand_locations' for locations of a known brand. Use 'get_brand_legal_entities' for corporate structure. Use 'get_brands_by_legal_entity' for reverse lookup from legal entity to brands."
            ),
          arguments: z
            .record(z.string(), z.any())
            .describe(
              "Arguments for the tool. For generate_locations_segment / generate_brands_segment: industry_description (string), states (string[]), cities (string[]), postal_codes (string[]), min_annual_revenue (number), max_annual_revenue (number), limit (number, default 10, max 250). For search_business: query (string), limit (number). For get_brand_card_analytics: brand_id (string). For get_brand_locations: brand_id (string), limit (number). For get_brand_legal_entities: brand_id (string). For get_brands_by_legal_entity: legal_entity_id (string)."
            ),
          persist: z
            .boolean()
            .optional()
            .default(true)
            .describe(
              "Whether to save results to the database. Default true."
            ),
        }),
        execute: async (params) => {
          const args = { ...params.arguments };
          if (args.limit === undefined) {
            args.limit = DEFAULT_RESULT_LIMIT;
          }
          return dataEngineFetch("/v1/enigma-mcp/call", {
            body: {
              tool: params.tool,
              arguments: args,
              persist: params.persist,
              org_id: "7612fd45-8fda-4b6b-af7f-c8b0ebaa3a19",
              company_id: "d46d079b-67ab-4e70-8c8c-503f6014f1af",
            },
          });
        },
      }),
      enigmaListTools: tool({
        description:
          "List all available Enigma MCP tools and their parameter schemas. Use this if you need to check what tools are available or what parameters a tool accepts before calling enigmaDiscover.",
        inputSchema: z.object({}),
        execute: async () => {
          return dataEngineFetch("/v1/enigma-mcp/tools", { method: "GET" });
        },
      }),
      blitzapiSearch: tool({
        description:
          "Search for companies or people using BlitzAPI's LinkedIn-sourced data. Use this when the user asks to find companies by industry/size/location, find employees at a company, or find decision-makers matching an ICP. For company search use operation 'company.search.blitzapi'. For finding decision-makers at a specific company use 'person.search.waterfall_icp_blitzapi'. For browsing employees with filters use 'person.search.employee_finder_blitzapi'.",
        inputSchema: z.object({
          operation_id: z
            .enum([
              "company.search.blitzapi",
              "person.search.waterfall_icp_blitzapi",
              "person.search.employee_finder_blitzapi",
            ])
            .describe(
              "Which BlitzAPI search to run. 'company.search.blitzapi' finds companies by industry/size/location. 'person.search.waterfall_icp_blitzapi' finds decision-makers at a specific company using cascading title matching. 'person.search.employee_finder_blitzapi' browses employees at a company with filters."
            ),
          input: z
            .record(z.string(), z.any())
            .describe(
              "Input for the operation. For company.search.blitzapi: company_name (string), company_industry (string[]), company_employee_range (string[]), company_hq_country_code (string[]), max_results (number, default 10). For person.search.waterfall_icp_blitzapi: company_linkedin_url (string, required), cascade (array of { include_title: string[], location: string[] }), max_results (number, default 5). For person.search.employee_finder_blitzapi: company_linkedin_url (string, required), job_level (string[]), job_function (string[]), country_code (string[]), max_results (number, default 10)."
            ),
          persist: z
            .boolean()
            .optional()
            .default(true)
            .describe(
              "Whether to save results to the database. Default true."
            ),
        }),
        execute: async (params) => {
          const input = { ...params.input };
          if (input.max_results === undefined) {
            input.max_results = DEFAULT_RESULT_LIMIT;
          }
          return dataEngineFetch("/v1/execute", {
            body: {
              operation_id: params.operation_id,
              entity_type: params.operation_id.startsWith("company")
                ? "company"
                : "person",
              input,
              org_id: "7612fd45-8fda-4b6b-af7f-c8b0ebaa3a19",
              company_id: "d46d079b-67ab-4e70-8c8c-503f6014f1af",
              persist: params.persist,
            },
          });
        },
      }),
      blitzapiEnrich: tool({
        description:
          "Enrich a company or person using BlitzAPI. Use this to find work emails, phone numbers, company profiles, or resolve domains/LinkedIn URLs. For finding someone's work email use 'person.contact.resolve_email_blitzapi'. For finding a mobile phone use 'person.contact.resolve_mobile_phone_blitzapi'. For enriching a company profile use 'company.enrich.blitzapi'. For resolving a domain to LinkedIn URL use 'company.resolve.linkedin_from_domain_blitzapi'. For resolving LinkedIn to domain use 'company.resolve.domain_from_linkedin_blitzapi'. For validating an email use 'person.contact.verify_email_blitzapi'. For reverse email lookup use 'person.resolve.from_email'. For reverse phone lookup use 'person.resolve.from_phone'.",
        inputSchema: z.object({
          operation_id: z
            .enum([
              "person.contact.resolve_email_blitzapi",
              "person.contact.resolve_mobile_phone_blitzapi",
              "person.contact.verify_email_blitzapi",
              "person.resolve.from_email",
              "person.resolve.from_phone",
              "company.enrich.blitzapi",
              "company.resolve.linkedin_from_domain_blitzapi",
              "company.resolve.domain_from_linkedin_blitzapi",
            ])
            .describe("Which enrichment operation to run."),
          input: z
            .record(z.string(), z.any())
            .describe(
              "Input for the operation. For person.contact.resolve_email_blitzapi: person_linkedin_url (string). For person.contact.resolve_mobile_phone_blitzapi: person_linkedin_url (string, 5 credits, US only). For person.contact.verify_email_blitzapi: email (string). For person.resolve.from_email: email (string). For person.resolve.from_phone: phone (string). For company.enrich.blitzapi: company_linkedin_url (string). For company.resolve.linkedin_from_domain_blitzapi: domain (string). For company.resolve.domain_from_linkedin_blitzapi: company_linkedin_url (string)."
            ),
          persist: z
            .boolean()
            .optional()
            .default(true)
            .describe(
              "Whether to save results to the database. Default true."
            ),
        }),
        execute: async (params) => {
          return dataEngineFetch("/v1/execute", {
            body: {
              operation_id: params.operation_id,
              entity_type: params.operation_id.startsWith("company")
                ? "company"
                : "person",
              input: params.input,
              org_id: "7612fd45-8fda-4b6b-af7f-c8b0ebaa3a19",
              company_id: "d46d079b-67ab-4e70-8c8c-503f6014f1af",
              persist: params.persist,
            },
          });
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
