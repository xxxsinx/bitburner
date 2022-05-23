export async function main(ns) {
	ns.disableLog('ALL');

	for (; ;) {
		for (let i = 0; i < 10000; i++) {
			ns.singularity.travelToCity('Chongqing');
			ns.singularity.travelToCity('New Tokyo');
			ns.singularity.travelToCity('Ishima');
		}
		await ns.sleep(0);
	}
}