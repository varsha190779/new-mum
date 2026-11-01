import { Wordmark } from "./Nav";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-md text-sm leading-relaxed text-ink-3">
            An educational visualization built on a small local simulation. Every figure on this page is
            simulated; none of it is real-time Optimum telemetry or a benchmark of any production network.
          </p>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-ink-3 md:order-last">
          Concepts follow Optimum's public docs, <a className="underline hover:text-ink" href="https://docs.getoptimum.xyz/docs/learn/overview/p2p" target="_blank" rel="noreferrer">mump2p protocol</a>, and the paper{" "}
          <a className="underline hover:text-ink" href="https://arxiv.org/abs/2508.04833" target="_blank" rel="noreferrer">OptimumP2P (arXiv:2508.04833)</a>. Piece counts, thresholds and timings here are illustrative, not protocol defaults.
        </p>
        <div className="flex gap-8 text-sm text-ink-2">
          <a className="hover:text-ink" href="#lab">Lab</a>
          <a className="hover:text-ink" href="#how">How it works</a>
          <a className="hover:text-ink" href="#compare">Compare</a>
          <a className="hover:text-ink" href="#report">Report</a>
          <a className="hover:text-ink" href="#why">Why it matters</a>
        </div>
      </div>
    </footer>
  );
}
