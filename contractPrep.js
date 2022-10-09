/** @param {NS} ns */
export async function main(ns) {
	const [silent = false] = ns.args;

	let sitrep = undefined;
	try {
		sitrep = JSON.parse(ns.read('sitrep.txt'));
	}
	catch {
		ns.tprint('FAIL: Could not load sitrep.txt, please run sitrep.js before calling this script!');
		return;
	}

	const output = [];

	for (const server of sitrep.servers) {
		if (server.contracts.length == 0) continue;
		for (const contract of server.contracts) {
			const type = ns.codingcontract.getContractType(contract, server.name);
			const data = ns.codingcontract.getData(contract, server.name);
			output.push({ server: server.name, file: contract, type: type, data: data });
		}
	}

	if (!silent)
		ns.tprint('INFO: Found ' + output.length + ' contracts');
	ns.write('contractPrep.txt', JSON.stringify(output), 'w');
}