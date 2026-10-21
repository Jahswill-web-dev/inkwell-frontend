"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./generation-performance.module.css";

type Job = {
  id: string;
  article_title: string;
  request_type: string;
  status: string;
  queued_at: string;
  first_claimed_at: string | null;
  finished_at: string | null;
  attempts: number;
  models: string[];
  queue_seconds: number | null;
  active_seconds: number | null;
  rate_limit_seconds: number | null;
  total_seconds: number | null;
  total_tokens: number | null;
  detailed_timing_available: boolean;
};
type Event = {
  id: string;
  attempt: number;
  kind: string;
  operation: string | null;
  model_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  outcome: string;
  input_tokens: number | null;
  output_tokens: number | null;
  provider_request_id: string | null;
};
type Detail = Job & { events: Event[] };
type JobPage = {
  items: Job[];
  page: number;
  page_size: number;
  total: number;
  median_seconds: number | null;
  p95_seconds: number | null;
};

function duration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function when(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function clock(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour12: false, timeZone: "UTC" }) + " UTC";
}

function label(value: string) {
  const known: Record<string, string> = {
    ask_ai: "Ask AI", generation: "Article generation", succeeded: "Succeeded",
    failed: "Failed", queued: "Queued", running: "Running",
    needs_clarification: "Needs clarification", rate_limit: "Rate-limit wait",
    attempt: "Worker attempt", stage: "Stage", call: "Model call", wait: "Wait",
    recovery: "Recovery queue", retry: "Retry queue",
  };
  return known[value] ?? value.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}

export function GenerationPerformance() {
  const [dateRange, setDateRange] = useState("30");
  const [requestType, setRequestType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [model, setModel] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobPage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page), page_size: "20" });
    if (dateRange !== "all") {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - Number(dateRange));
      params.set("from_date", start.toISOString().slice(0, 10));
    }
    if (requestType) params.set("request_type", requestType);
    if (outcome) params.set("outcome", outcome);
    if (model.trim()) params.set("model", model.trim());
    await Promise.resolve();
    if (signal?.aborted) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/consultant/performance/jobs?${params}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "This page is private to the Inkwell owner." : "Could not load generation performance.");
      setData(await response.json() as JobPage);
      setError("");
    } catch (caught) {
      if (signal?.aborted) return;
      setError(caught instanceof Error ? caught.message : "Could not load generation performance.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [dateRange, requestType, outcome, model, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  async function toggle(jobId: string) {
    if (selected === jobId) {
      setSelected(null);
      setDetail(null);
      return;
    }
    setSelected(jobId);
    setDetail(null);
    try {
      const response = await fetch(`/api/consultant/performance/jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load this job's timeline.");
      setDetail(await response.json() as Detail);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load timeline.");
    }
  }

  return <div className={styles.page}>
    <div className={styles.top}>
      <div><p className={styles.eyebrow}>PRIVATE OPERATIONS</p><h1>Generation performance</h1>
        <p className={styles.intro}>See where article generation and Ask AI jobs spend their time.</p></div>
      <div className={styles.summary} aria-label="Completion time summary">
        <div><span>Median total time</span><strong>{duration(data?.median_seconds)}</strong></div>
        <div><span>95th percentile (P95)</span><strong>{duration(data?.p95_seconds)}</strong></div>
      </div>
    </div>
    <div className={styles.filters}>
      <label>Date range<select value={dateRange} onChange={event => {setDateRange(event.target.value); setPage(1);}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></label>
      <label>Request type<select value={requestType} onChange={event => {setRequestType(event.target.value); setPage(1);}}><option value="">All request types</option><option value="generation">Article generation</option><option value="ask_ai">Ask AI</option></select></label>
      <label>Outcome<select value={outcome} onChange={event => {setOutcome(event.target.value); setPage(1);}}><option value="">All outcomes</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option><option value="running">Running</option><option value="queued">Queued</option><option value="needs_clarification">Needs clarification</option></select></label>
      <label>Model<input value={model} onChange={event => {setModel(event.target.value); setPage(1);}} placeholder="All models" /></label>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.ledger} aria-busy={loading}>
      <div className={styles.header}><span>JOB / ARTICLE</span><span>REQUEST TYPE</span><span>OUTCOME</span><span>MODELS</span><span>QUEUE</span><span>TOTAL</span><span>TOKENS</span><span>RATE-LIMIT</span></div>
      {loading && !data ? <p className={styles.empty}>Loading jobs…</p> : data?.items.length ? data.items.map(job => <div key={job.id}>
        <button className={`${styles.row} ${selected === job.id ? styles.selected : ""}`} onClick={() => void toggle(job.id)} aria-expanded={selected === job.id}>
          <span className={styles.jobTitle}><span className={styles.chevron}>{selected === job.id ? "⌄" : "›"}</span><span><strong>{job.article_title}</strong><small>{when(job.queued_at)} · {job.id.slice(0, 8)}</small>{!job.detailed_timing_available && <small>Detailed timing unavailable</small>}</span></span>
          <span>{label(job.request_type)}</span><span className={`${styles.status} ${job.status === "failed" ? styles.failed : ""}`}>{label(job.status)}</span>
          <span className={styles.models}>{job.models.join(", ") || "—"}</span><span>{duration(job.queue_seconds)}</span>
          <strong className={styles.total}>{duration(job.total_seconds)}</strong><span>{job.total_tokens?.toLocaleString() ?? "—"}</span><span>{duration(job.rate_limit_seconds)}</span>
        </button>
        {selected === job.id && <div className={styles.detail}>
          {!job.detailed_timing_available ? <p>Detailed timing unavailable. Historical totals are shown above where recorded.</p> : !detail || detail.id !== job.id ? <p>Loading timeline…</p> : <>
            <div className={styles.detailSummary}><strong>Timeline</strong><span>Queue {duration(detail.queue_seconds)} · Worker active {duration(detail.active_seconds)} · Rate-limit time within active {duration(detail.rate_limit_seconds)} · Total {duration(detail.total_seconds)}</span></div>
            {Array.from(new Set(detail.events.map(event => event.attempt))).map(attempt => <section key={attempt} className={styles.attempt}>
              <h2>{attempt === 0 ? "Before first attempt" : `Attempt ${attempt}`}</h2>
              <ol>{detail.events.filter(event => event.attempt === attempt).map(event => <li key={event.id} className={event.outcome === "interrupted" || event.outcome === "failed" || event.outcome === "rate_limited" ? styles.alertEvent : ""}>
                <time>{clock(event.started_at)}</time><span className={styles.dot} aria-hidden="true" />
                <span><strong>{event.kind === "call" ? label(event.operation || "call") : event.kind === "stage" ? `${label(event.operation || "stage")} stage` : event.kind === "queue" ? label(event.operation || "queued") : label(event.operation || event.kind)}</strong>
                  <small>{event.model_id ? `${event.model_id} · ` : ""}{label(event.outcome)}{event.input_tokens != null || event.output_tokens != null ? ` · ${event.input_tokens ?? "?"} in / ${event.output_tokens ?? "?"} out` : ""}{event.provider_request_id ? ` · ${event.provider_request_id}` : ""}</small></span>
                <span className={styles.eventDuration}>{event.duration_ms == null ? "In progress" : duration(event.duration_ms / 1000)}</span>
              </li>)}</ol>
            </section>)}
          </>}
        </div>}
      </div>) : <p className={styles.empty}>No jobs match these filters.</p>}
    </div>
    {data && <div className={styles.pagination}><span>{data.total} jobs · Page {data.page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)}>Next</button></div></div>}
  </div>;
}
