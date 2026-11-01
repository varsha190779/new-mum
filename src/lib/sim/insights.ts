import type { Mode, RunSummary } from "./engine";

export interface Insight {
  headline: string;
  points: string[];
}

const s = (v: number) => `${v.toFixed(1)} sim s`;

function pct(a: number, b: number) {
  return Math.round(Math.abs(a - b) / Math.max(a, b) * 100);
}

/** Plain-language explanation generated from the two actual runs; nothing here is canned. */
export function explainRun(mode: Mode, trad: RunSummary, mump: RunSummary): Insight {
  const points: string[] = [];
  const tie = 0.03;

  // time to 95% of peers
  let faster: "mump2p" | "traditional" | "same" | "unknown" = "unknown";
  if (trad.p95Done !== null && mump.p95Done !== null) {
    if (mump.p95Done < trad.p95Done * (1 - tie)) faster = "mump2p";
    else if (trad.p95Done < mump.p95Done * (1 - tie)) faster = "traditional";
    else faster = "same";
    if (faster === "same") points.push(`95% of peers had the block at about the same time: ${s(mump.p95Done)} with mump2p, ${s(trad.p95Done)} traditional.`);
    else {
      const [w, wt, lt] = faster === "mump2p" ? ["mump2p", mump.p95Done, trad.p95Done] : ["Traditional P2P", trad.p95Done, mump.p95Done];
      points.push(`${w} got 95% of peers to reconstruct sooner: ${s(wt)} vs ${s(lt)} (${pct(wt, lt)}% earlier).`);
    }
  } else {
    points.push(
      `Not every run reached 95% of peers: traditional ${trad.done}/${trad.peers} peers reconstructed, mump2p ${mump.done}/${mump.peers}.`,
    );
  }

  // spread
  if (trad.spread !== null && mump.spread !== null) {
    const t = mump.spread < trad.spread * (1 - tie) ? "mump2p" : trad.spread < mump.spread * (1 - tie) ? "traditional" : "same";
    points.push(
      t === "same"
        ? `Arrival spread (first peer to 95th percentile) was similar: ${s(mump.spread)} mump2p, ${s(trad.spread)} traditional.`
        : `Arrival spread (first peer to 95th percentile) was tighter with ${t === "mump2p" ? "mump2p" : "traditional P2P"}: ${s(t === "mump2p" ? mump.spread : trad.spread)} vs ${s(t === "mump2p" ? trad.spread : mump.spread)}.`,
    );
  }

  // redundancy
  const rt = trad.redundantUnits;
  const rm = mump.redundantUnits;
  points.push(
    rm < rt * (1 - tie)
      ? `Redundant data was lower with mump2p (${rm.toFixed(1)} vs ${rt.toFixed(1)} blocks): traditional peers re-received ${trad.redundantPackets} duplicate pieces, while mump2p peers discarded ${mump.redundantPackets} packets that added nothing new.`
      : rt < rm * (1 - tie)
        ? `Redundant data was lower with traditional P2P (${rt.toFixed(1)} vs ${rm.toFixed(1)} blocks) in this run, so coding did not reduce waste here.`
        : `Redundant data was similar (${rt.toFixed(1)} blocks traditional, ${rm.toFixed(1)} mump2p).`,
  );

  if (trad.lost !== mump.lost || trad.lost > 0)
    points.push(`Packets lost in transit: ${trad.lost} traditional, ${mump.lost} mump2p. Coded packets can replace a lost one with any other independent packet; a lost original piece has to be resent or arrive another way.`);

  let headline: string;
  if (mode === "mump2p") {
    headline =
      faster === "mump2p"
        ? "In this run, mump2p peers reconstructed the block sooner after receiving enough independent coded packets."
        : faster === "traditional"
          ? "In this run, mump2p was not faster. Coding overhead, topology or congestion outweighed the benefit."
          : faster === "same"
            ? "In this run, mump2p and traditional P2P reached peers at about the same time."
            : "In this run, not every peer reconstructed the block, so the timing comparison is incomplete.";
  } else {
    headline =
      trad.packetsSent > mump.packetsSent
        ? `Traditional P2P needed more forwarding steps before peers reconstructed the block: ${trad.packetsSent} packets sent vs ${mump.packetsSent} for mump2p.`
        : `Traditional P2P sent no more packets than mump2p in this run (${trad.packetsSent} vs ${mump.packetsSent}).`;
    if (faster === "mump2p") headline += " Peers also waited longer for the last missing pieces.";
  }
  return { headline, points };
}
