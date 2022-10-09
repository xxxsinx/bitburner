/** @param {NS} ns */
export async function main(ns) {
	let sitrep = JSON.parse(ns.read('sitrep.txt'));

	// lazy but legal
	sitrep.sleeveTasks = [];
	for (let i = 0; i < 8; i++)
		try { sitrep.sleeveTasks.push(ns.sleeve.getTask(i)); } catch { break; }
	sitrep.nbSleeves = sitrep.sleeveTasks.length; // ns.sleeve.getNumSleeves();

	ns.write('sitrep.txt', JSON.stringify(sitrep), 'w');
}