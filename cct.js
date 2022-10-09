import { WaitPids } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
    await WaitPids(ns, ns.run('sitrep.js'));
    await WaitPids(ns, ns.run('contractPrep.js'));
    await WaitPids(ns, ns.run('solver.js'));
}