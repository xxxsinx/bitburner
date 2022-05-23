// args[0] - server
// args[2] - PID of spawner
// args[3] - random number
export async function main(ns) {
	while(true) {
		await ns.share();
		await ns.sleep(0);
	}
}