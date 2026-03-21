const { createClient } = supabase;

const supabaseClient = createClient(
  "https://kmntdmdyvbnzgewjlxcp.supabase.co",
  "YOUR_ANON_KEY"
);

// ================= USERS =================

// CREATE USER
export async function createUser(user) {
  const { data, error } = await supabaseClient
    .from("users")
    .insert([user])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// LOGIN USER
export async function getUserByEmail(email, password) {
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single();

  if (error) throw error;
  return data;
}