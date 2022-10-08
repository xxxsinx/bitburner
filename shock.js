/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');
	let [start = 0, count = 8] = ns.args;
	for (let i = start; i < count; i++)
		ns.sleeve.setToShockRecovery(i);
}