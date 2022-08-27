/** @param {NS} ns */
export async function main(ns) {
	if (false) ns.grow(); // bogus call to tell the static ram checker to allocate 150MB

	let [operation, target]= ns.args[0];
	switch (operation) {
		case "H":
			eval('await ns.hack(' + target + ')');
			break;
		case "G":
			eval('await ns.grow(' + target + ')');
			break;
		case "W":
			eval('await ns.weaken(' + target + ')');
			break;
		default:
			ns.tprint('You fucked up and provided an invalid operation type');
			break;
	}
}