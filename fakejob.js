/** @param {NS} ns */
export async function main(ns) {
	const [id, type, duration, port= null]= ns.args;

	// Fake a hack/grow/weaken job
	await ns.sleep(duration);

	// Report back to the manager
	if (port != null) 
		await ns.writePort(port, {id, type});
}