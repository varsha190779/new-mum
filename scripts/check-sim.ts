import { runToCompletion, Simulation } from "../src/lib/sim/engine";
const f = (v: number | null, d = 2) => (v === null ? "  — " : v.toFixed(d));
for (const size of [12, 24, 40])
  for (const condition of ["stable", "congested"] as const) {
    const r = {
      t: runToCompletion({ size, condition, mode: "traditional" }),
      m: runToCompletion({ size, condition, mode: "mump2p" }),
    };
    for (const [k, v] of Object.entries(r))
      console.log(size, condition.padEnd(9), k === "t" ? "trad " : "mump ", `done ${v.done}/${v.peers}`, `first ${f(v.firstDone)} p95 ${f(v.p95Done)} spread ${f(v.spread)} last ${f(v.lastDone)}`, `pk ${v.packetsSent} red ${v.redundantUnits.toFixed(1)} data ${v.dataUnits.toFixed(1)} lost ${v.lost}`);
    console.log("   spread ratio trad/mump:", r.t.spread && r.m.spread ? (r.t.spread / r.m.spread).toFixed(2) : "—", " p95 ratio:", r.t.p95Done && r.m.p95Done ? (r.t.p95Done / r.m.p95Done).toFixed(2) : "—");
  }
// live stepping (as in the browser, irregular dt) must equal the headless run
for (const mode of ["traditional", "mump2p"] as const) {
  const cfg = { size: 24, condition: "stable" as const, mode };
  const live = new Simulation(cfg);
  while (!live.finished) live.advance(0.016 + Math.random() * 0.03);
  const head = runToCompletion(cfg);
  const a = live.summary();
  console.log("live==headless", mode, a.done === head.done && a.packetsSent === head.packetsSent && Math.abs((a.p95Done ?? 0) - (head.p95Done ?? 0)) < 1e-9);
}
