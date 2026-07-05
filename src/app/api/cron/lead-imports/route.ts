import { runAllLeadImportsFromCron } from "@/lib/crm/lead-imports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runAllLeadImportsFromCron();
    const imported = results.reduce((sum, result) => sum + result.importedCount, 0);
    const skipped = results.reduce((sum, result) => sum + result.skippedCount, 0);
    const failed = results.filter((result) => result.status === "failed").length;

    return Response.json(
      {
        ok: failed === 0,
        imported,
        skipped,
        failed,
        results,
      },
      { status: failed === 0 ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
