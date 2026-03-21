import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import type { BrandConfig } from "@/features/direct-mail-designer/types";
import { getFormatById } from "@/features/direct-mail-designer/lib/formats";

function buildSystemPrompt(opts: {
  formatId: string;
  side: string;
  currentHtml: string;
  brandConfig: BrandConfig;
}): string {
  const format = getFormatById(opts.formatId);
  const surface = format.surfaces.find((s) => s.id === opts.side) ?? format.surfaces[0];
  const scaffold = format.scaffold;
  const notes = scaffold.notes.length > 0 ? scaffold.notes.map((n) => `- ${n}`).join("\n") : "";

  return `You are a direct mail template designer for Lob.com. You help users create and iterate on HTML templates for physical mail pieces.

## Surface-Specific Design Guide
${surface.llmPrompt}

## Brand
- **Organization:** ${opts.brandConfig.orgName}
- Primary color: ${opts.brandConfig.primaryColor}
- Secondary color: ${opts.brandConfig.secondaryColor}
- Font: ${opts.brandConfig.fontFamily}
${opts.brandConfig.logoUrl ? `- Logo: ${opts.brandConfig.logoUrl}` : "- No logo configured"}

## Lob HTML Rules (apply to ALL formats)
- **Inline styles only.** No <style> blocks, no external stylesheets. Every element must use the style="" attribute.
- **No JavaScript.** Lob strips all <script> tags.
- **No external resources** except images via HTTPS URLs. No Google Fonts links. Embed font stacks: Arial, Helvetica, Georgia, Times New Roman, Courier New.
- **Images:** Use absolute HTTPS URLs. Lob does not support base64 data URIs in production.
${format.mergeVariables ? "- **Merge variables:** Use {{variable_name}} syntax (double curly braces). Lob replaces these at send time. Common variables: {{name}}, {{first_name}}, {{company}}, {{address_line1}}, {{address_line2}}, {{city}}, {{state}}, {{zip}}." : "- **No merge variables** — this format does not support personalization."}
- **Dimensions:** Design to the exact dimensions. Use width:100%;height:100% on the root container. Do not add scrollbars.
- **Background colors/images:** Extend to the bleed area. Use background-color on the outermost div with full width/height.

${notes ? `## Format Notes\n${notes}\n` : ""}
## Current Template HTML (${surface.label})
\`\`\`html
${opts.currentHtml}
\`\`\`

## Your Behavior
1. When the user asks for a design or modification, respond with the **complete updated HTML** in a fenced code block (\`\`\`html ... \`\`\`). Always return the full document, not fragments.
2. Keep conversational responses short. Lead with the HTML, then briefly explain what changed.
3. Apply the brand colors and font by default unless the user specifies otherwise.
${format.mergeVariables ? "4. Preserve existing merge variables when modifying templates. Add new ones when contextually appropriate." : "4. This format does not support merge variables — do not include {{}} syntax."}
5. If the user's request would violate Lob constraints (e.g., adding JavaScript, using external CSS), explain why and offer a compliant alternative.
6. Strictly respect all zone restrictions described in the surface design guide above — especially ink-free zones, address blocks, and no-print borders.`;
}

export async function POST(req: Request) {
  const {
    messages,
    formatId,
    side,
    currentHtml,
    brandConfig,
  }: {
    messages: UIMessage[];
    formatId: string;
    side: string;
    currentHtml: string;
    brandConfig: BrandConfig;
  } = await req.json();

  const system = buildSystemPrompt({
    formatId: formatId || "postcard-4x6",
    side: side || "front",
    currentHtml: currentHtml || "",
    brandConfig: brandConfig || {
      primaryColor: "#1a1a2e",
      secondaryColor: "#e94560",
      logoUrl: null,
      fontFamily: "Arial, sans-serif",
      orgName: "Your Company",
    },
  });

  const result = streamText({
    model: anthropic(process.env.CHAT_MODEL || "claude-sonnet-4-20250514"),
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
