#!/usr/bin/env node
/**
 * Proph3t MCP Server
 *
 * Expose les 197 tools Proph3t (Core L1 + L2 metier + L3 app-specific + workflows)
 * a tout client MCP : Claude Desktop, Cursor, Windsurf, etc.
 *
 * Communique en stdio (JSON-RPC 2.0).
 *
 * Usage Claude Desktop :
 *   claude_desktop_config.json
 *   {
 *     "mcpServers": {
 *       "proph3t": {
 *         "command": "node",
 *         "args": ["/path/to/proph3t-mcp-server/dist/index.js"],
 *         "env": {
 *           "PROPH3T_SUPABASE_URL": "https://vgtmljfayiysuvrcmunt.supabase.co",
 *           "PROPH3T_API_KEY": "your-supabase-anon-or-service-key"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

const SUPABASE_URL = process.env.PROPH3T_SUPABASE_URL || "https://vgtmljfayiysuvrcmunt.supabase.co";
const API_KEY = process.env.PROPH3T_API_KEY || "";
const USER_TOKEN = process.env.PROPH3T_USER_TOKEN || ""; // Optionnel : JWT user

interface ToolMeta {
  id: string;
  level: 1 | 2 | 3;
  domain: string | null;
  app_id: string | null;
  name: string;
  description: string;
  schema: any;
}

let toolsCache: ToolMeta[] | null = null;

/**
 * Charge la liste des tools depuis Supabase (proph3t_tools registry).
 */
async function loadToolsFromRegistry(): Promise<ToolMeta[]> {
  if (toolsCache) return toolsCache;

  const url = `${SUPABASE_URL}/rest/v1/proph3t_tools?select=id,level,domain,app_id,name,description,schema&is_active=eq.true&order=level,name`;
  const resp = await fetch(url, {
    headers: {
      "apikey": API_KEY,
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to load tools registry: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as ToolMeta[];
  toolsCache = data;
  return data;
}

/**
 * Appelle un tool via l'edge function proph3t-ask (qui orchestre tout).
 * En mode MCP, on contourne l'orchestrateur LLM et on appelle directement
 * un endpoint d'execution unique des tools (a creer).
 *
 * Pour cette v1, on utilise proph3t-ask avec un message structure qui
 * force l'utilisation du tool specifique demande.
 */
async function callToolViaProph3t(toolName: string, args: any): Promise<any> {
  // Endpoint dedie : proph3t-tool-direct (a creer cote Supabase)
  // Sinon fallback : on encapsule dans un message qui force le tool call
  const url = `${SUPABASE_URL}/functions/v1/proph3t-tool-direct`;
  const body = JSON.stringify({ tool_name: toolName, args });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${USER_TOKEN || API_KEY}`,
    },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Proph3t tool call failed (${toolName}): ${resp.status} ${text.slice(0, 300)}`);
  }
  return await resp.json();
}

/**
 * Convertit les tools Proph3t au format MCP.
 */
function toMcpTool(t: ToolMeta): Tool {
  // Prefix avec niveau et app pour clarte
  const prefix = t.level === 1 ? "" : t.level === 2 ? `[${t.domain}] ` : `[${t.app_id || t.domain}] `;
  return {
    name: t.name,
    description: prefix + t.description,
    inputSchema: t.schema && typeof t.schema === "object" ? t.schema : { type: "object", properties: {}, additionalProperties: true },
  };
}

async function main() {
  const server = new Server(
    {
      name: "proph3t",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Handler : list tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await loadToolsFromRegistry();
    return {
      tools: tools.map(toMcpTool),
    };
  });

  // Handler : call tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await callToolViaProph3t(name, args ?? {});
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${(e as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Stderr pour ne pas polluer stdio
  process.stderr.write(`[proph3t-mcp] Server ready. ${SUPABASE_URL ? `Connected to ${SUPABASE_URL}` : "No Supabase URL"}.\n`);
}

main().catch((err) => {
  process.stderr.write(`[proph3t-mcp] Fatal: ${err.message}\n`);
  process.exit(1);
});
