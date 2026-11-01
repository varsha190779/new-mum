import { runToCompletion } from "../src/lib/sim/engine";
for (const size of [12, 24, 40])
  for (const condition of ["stable", "congested"] as const)
    for (const mode of ["traditional", "mump2p"] as const) {
      const r = runToCompletion({ size, condition, mode });
      console.log(size, condition.padEnd(9), mode.padEnd(11), `done ${r.done}/${r.peers}`, `last ${r.lastDone?.toFixed(2)}`, `med ${r.median?.toFixed(2)}`, `redUnits ${r.redundantUnits.toFixed(2)}`, `data ${r.dataUnits.toFixed(1)}`, `lost ${r.lost}`, `red% ${(r.redundantShare*100).toFixed(0)}`);
    }
