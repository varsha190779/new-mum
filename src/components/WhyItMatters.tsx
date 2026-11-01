const POINTS = [
  {
    title: "Less dependence on any one path",
    body: "When data travels as many different coded packets, a peer is not waiting for one particular copy to arrive. Any packet that adds new information helps.",
  },
  {
    title: "Fewer wasted duplicates",
    body: "Whole-block forwarding sends identical copies down every path. Coded packets are different combinations, so more of what arrives can be useful.",
  },
  {
    title: "Forwarding can start earlier",
    body: "Peers can recode and pass packets along as they arrive, rather than waiting to hold the entire block before they relay it.",
  },
];

export function WhyItMatters() {
  return (
    <section id="why" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <div>
          <p className="eyebrow">Why it matters</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
            Blockchains are limited by how fast data spreads.
          </h2>
          <p className="mt-4 text-ink-2">
            Every node needs the same data, and the network is only as quick as its slowest relevant hops. How
            data is packaged and relayed shapes how quickly peers can act on it.
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {POINTS.map((p, i) => (
            <li key={p.title} className="flex gap-5 py-6">
              <span className="num mt-0.5 w-6 shrink-0 text-sm font-medium text-accent">0{i + 1}</span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-10 text-xs text-ink-3">
        The lab above is a simplified model. Actual performance depends on topology, bandwidth, hardware and
        implementation, and is not represented by these simulated values.
      </p>
    </section>
  );
}
