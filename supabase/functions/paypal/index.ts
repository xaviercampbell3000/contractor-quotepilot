Deno.serve(async (req) => {
  return new Response(JSON.stringify({ ok: true, message: "PayPal function is running" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});