export async function register() {
  if (
    process.env["NEXT_RUNTIME"] !== "nodejs" ||
    process.env.NODE_ENV !== "production"
  ) {
    return;
  }

  const { migrateDatabase } = await import("@/lib/migrate-database");
  await migrateDatabase();
}
