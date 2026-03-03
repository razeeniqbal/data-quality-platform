// Supabase Edge Function — MSSQL proxy
// Deno runtime. Deploy with: supabase functions deploy mssql-query
// @ts-nocheck — Deno imports are not resolved by the React app's TypeScript compiler

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import mssql from 'npm:mssql';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: {
    server?: string;
    port?: number | string;
    database?: string;
    user?: string;
    password?: string;
    query?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { server, port, database, user, password, query } = body;

  if (!server || !database || !user || !password || !query) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: server, database, user, password, query' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect({
      server: String(server),
      port: Number(port) || 1433,
      database: String(database),
      user: String(user),
      password: String(password),
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    });

    const result = await pool.request().query(String(query));

    // Extract column names from the recordset metadata when available
    const columns: string[] =
      result.recordset.columns != null
        ? Object.keys(result.recordset.columns)
        : result.recordset.length > 0
        ? Object.keys(result.recordset[0])
        : [];

    // Normalise all values to strings
    const rows: Record<string, string>[] = result.recordset.map(
      (r: Record<string, unknown>) => {
        const row: Record<string, string> = {};
        columns.forEach((col) => {
          const v = r[col];
          row[col] = v == null ? '' : String(v);
        });
        return row;
      }
    );

    return new Response(JSON.stringify({ columns, rows }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    try {
      await pool?.close();
    } catch {
      // ignore close errors
    }
  }
});
