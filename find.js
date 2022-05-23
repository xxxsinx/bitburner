/** @param {NS} ns */
export async function main(ns) {
	const [query, replace, replacement] = ns.args;

	let files = ns.ls('home');
	for (const file of files) {
		let data = ns.read(file);
		if (data.search(query) == -1) {
			// 	ns.tprint('FAIL: Could not find ' + query + ' in ' + file);
			continue;
		}
		ns.tprint('INFO: Found ' + query + ' in ' + file);

		if (replace != '/r') continue;

		ns.tprint('WARN: Replacing ' + query + ' by ' + replacement + ' in ' + file);
		data = data.replace(query, replacement);
		await ns.write(file, data, 'w');
	}
}