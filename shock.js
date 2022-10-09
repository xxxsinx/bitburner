/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');
	let [start = 0, count = 8] = ns.args;
	for (let i = start; i < count; i++) {
		const task = ns.sleeve.getTask(i);
		if (task.type != 'RECOVERY')
			ns.sleeve.setToShockRecovery(i);
	}
}