/** @param {NS} ns */
export async function main(ns) {
	if (false) ns.grow(); // bogus call to tell the static ram checker to allocate 150MB

	let [operation, target] = ns.args;
	if (operation == undefined || target == undefined) {
		ns.tprint('Usage: run all-in-one X target');
		ns.tprint('Where X is either H, G, or W for hack, grow, weaken respectively');
		return;
	}

	switch (operation) {
		case "H":
			await ns['hack'](target);
			break;
		case "G":
			await ns['grow'](target);
			break;
		case "W":
			await ns['weaken'](target);
			break;
		default:
			ns.tprint('You provided an invalid operation type');
			break;
	}
}