import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Flag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Stars } from "@/components/listings/rating";
import { ModerationActions } from "@/components/moderation/moderation-actions";
import { requireUser } from "@/lib/auth";
import {
  getReportCounts,
  getReports,
  REPORT_STATUSES,
  type ModerationReport,
  type ReportStatus,
} from "@/lib/queries/moderation";
import { cn } from "@/lib/utils";
import { reportReasonLabel } from "@/lib/validations/social";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false },
};

const STATUS_LABELS: Record<ReportStatus, string> = { open: "Open", resolved: "Resolved", dismissed: "Dismissed" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main id="main" className="page-container max-w-4xl flex-1 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Moderation</h1>
      <p className="mt-2 text-muted-foreground">
        Reports about listings and reviews. Remove anything that harasses, impersonates or exposes real people, or that
        could pass for a genuine booking offer.
      </p>
      <Suspense fallback={<div className="mt-10 h-64 rounded-2xl bg-muted" aria-busy="true" aria-label="Loading reports" />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const user = await requireUser("/admin");
  // Non-admins get a plain 404 rather than confirmation that this page exists.
  if (!user.isAdmin) notFound();

  const requested = (await searchParams).status;
  const status = REPORT_STATUSES.find((value) => value === requested) ?? "open";
  const [counts, reports] = await Promise.all([getReportCounts(), getReports(status)]);

  return (
    <>
      <nav aria-label="Report status" className="mt-8 flex gap-1 border-b">
        {REPORT_STATUSES.map((value) => (
          <Link
            key={value}
            href={value === "open" ? "/admin" : `/admin?status=${value}`}
            aria-current={value === status ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium",
              value === status ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {STATUS_LABELS[value]} <span className="tabular-nums text-muted-foreground">({counts[value]})</span>
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-14 text-center">
          <Flag className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold">No {status} reports.</p>
          {status === "open" && <p className="text-sm text-muted-foreground">All quiet in the land of make-believe.</p>}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </ul>
      )}
    </>
  );
}

function ReportCard({ report }: { report: ModerationReport }) {
  const { target } = report;
  return (
    <li className="grid gap-4 rounded-2xl border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {reportReasonLabel(report.reason)}
          <span className="font-normal text-muted-foreground"> · {report.targetType}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {report.reporterUsername ? `@${report.reporterUsername}` : "Deleted user"} ·{" "}
          <time dateTime={report.createdAt}>{formatDistanceToNowStrict(parseISO(report.createdAt), { addSuffix: true })}</time>
        </p>
      </div>
      {report.details && <p className="rounded-lg bg-muted/60 px-3.5 py-2.5 text-sm whitespace-pre-line">{report.details}</p>}

      <div className="rounded-xl border px-4 py-3 text-sm">
        {target === null ? (
          <p className="text-muted-foreground">This {report.targetType} has already been removed.</p>
        ) : target.kind === "listing" ? (
          <p>
            Listing{" "}
            <Link href={target.href} className="font-semibold underline underline-offset-4">
              {target.title}
            </Link>{" "}
            {target.ownerUsername && <span className="text-muted-foreground">by @{target.ownerUsername}</span>}
          </p>
        ) : (
          <div className="grid gap-1.5">
            <p className="flex flex-wrap items-center gap-2">
              Review by <span className="font-semibold">@{target.authorUsername ?? "unknown"}</span>
              <Stars rating={target.rating} />
              on{" "}
              <Link href={target.href} className="underline underline-offset-4">
                {target.listingTitle ?? "a listing"}
              </Link>
            </p>
            <p className="whitespace-pre-line text-muted-foreground">“{target.content}”</p>
          </div>
        )}
      </div>

      <ModerationActions
        reportId={report.id}
        targetLabel={report.targetType}
        canRemove={target !== null}
        status={report.status}
      />
    </li>
  );
}
