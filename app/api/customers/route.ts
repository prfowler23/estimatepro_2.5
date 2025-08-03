import { NextRequest } from "next/server";
import { getHandler, postHandler } from "@/lib/api/api-handler";
import { customerSchema } from "@/lib/schemas/api-validation";
import { createServerSupabaseClient } from "@/lib/auth/server";
import { z } from "zod";

// Extended customer schema for API
const createCustomerSchema = customerSchema.extend({
  company_name: z.string().optional(), // Match database field
});

async function handleCreateCustomer(
  data: z.infer<typeof createCustomerSchema>,
  context: any,
) {
  const supabase = await createServerSupabaseClient();

  // Check if customer already exists by email
  if (data.email) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", data.email)
      .single();

    if (existingCustomer) {
      throw new Error("Customer with this email already exists");
    }
  }

  // Create new customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company_name: data.company || data.company_name,
    })
    .select()
    .single();

  if (customerError) {
    throw new Error(`Failed to create customer: ${customerError.message}`);
  }

  return { customer };
}

// Query parameters schema for customers
const getCustomersQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

async function handleGetCustomers(context: any) {
  const { request } = context;
  const supabase = await createServerSupabaseClient();

  // Get and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    search: searchParams.get("search") || undefined,
    limit: parseInt(searchParams.get("limit") || "50"),
    offset: parseInt(searchParams.get("offset") || "0"),
  };

  const validation = getCustomersQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    throw new Error(`Invalid query parameters: ${validation.error.message}`);
  }

  const { search, limit, offset } = validation.data;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Add search functionality
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`,
    );
  }

  const { data: customers, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  return {
    customers: customers || [],
    total: count || 0,
    hasMore: offset + limit < (count || 0),
    limit,
    offset,
  };
}

// Standardized route handlers
export const GET = (request: NextRequest) =>
  getHandler(request, handleGetCustomers, {
    requireAuth: true,
    auditLog: true,
  });

export const POST = (request: NextRequest) =>
  postHandler(request, createCustomerSchema, handleCreateCustomer, {
    requireAuth: true,
    rateLimiter: "general",
    auditLog: true,
  });
