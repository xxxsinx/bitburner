import { WaitPids } from "utils.js";

/** @param {NS} ns */
export async function main(ns) {
	let pids = ns.run('factions.js', 1, 'plan');
	await WaitPids(ns, pids);

	pids = ns.run('bank.js', 1);
	await WaitPids(ns, pids);

	pids = ns.run('ram.js', 1, 's');
	await WaitPids(ns, pids);
}