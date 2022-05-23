/** @param {NS} ns **/
export async function main(ns) {
	var processes = ns.ps(ns.getHostname());
	if (ns.args[0] != undefined) {
		processes = processes.filter(p => p.filename.search(ns.args[0]) != -1 || p.args.toString().search(ns.args[0]) != -1);
	}

	for (var process of processes) {
		ns.tprint(process.filename + ' pid=' + process.pid + ' params=' + process.args);
	}
}