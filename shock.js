/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let sitrep = JSON.parse(ns.read('sitrep.txt'));

	let [start = 0, count = 8] = ns.args;
	for (let i = start; i < count; i++) {
		const task = sitrep.sleeveTasks[i];
		if (task?.type != 'RECOVERY') {
			ns.tprint('INFO: Set sleeve ' + i + ' to shock recovery.');
			ns.sleeve.setToShockRecovery(i);
		}
	}
}