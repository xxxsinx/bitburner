/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let [crime = 'Homicide', start = 0, count = 8] = ns.args;
	let sitrep = JSON.parse(ns.read('sitrep.txt'));

	for (let i = start; i < count; i++) {
		const task = sitrep.sleeveTasks[i];
		if (task?.type != "CRIME" && task?.crimeType != crime.toUpperCase()) {
			ns.sleeve.setToCommitCrime(i, crime);
		}
	}
}