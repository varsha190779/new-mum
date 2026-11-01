export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(#d9d9d2_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div className="relative mx-auto max-w-[1200px] px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
        <p className="eyebrow reveal flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          mump2p + RLNC · interactive explainer
        </p>
        <h1 className="reveal mt-5 max-w-3xl text-[clamp(2.1rem,5.4vw,3.9rem)] font-semibold leading-[1.04] tracking-[-0.035em]" style={{ animationDelay: "60ms" }}>
          See how data moves through a network.
        </h1>
        <p className="reveal mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg" style={{ animationDelay: "120ms" }}>
          Watch one block travel across a peer-to-peer network twice: forwarded as whole copies, and
          broken into coded packets with mump2p and Random Linear Network Coding.
        </p>
        <div className="reveal mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "180ms" }}>
          <a
            href="#lab"
            className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Open the lab
          </a>
          <a
            href="#how"
            className="inline-flex h-11 items-center rounded-full border border-line-2 bg-white px-6 text-sm font-medium transition-colors hover:border-ink-4"
          >
            How it works
          </a>
          <span className="ml-1 text-xs text-ink-3">Local simulation · no live network data</span>
        </div>
      </div>
    </section>
  );
}
