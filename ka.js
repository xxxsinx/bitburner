import { GetAllServers } from 'utils.js'

export async function main(ns) {
	for (var server of GetAllServers(ns)) {
		ns.killall(server, true);
	}
	ns.tprint('WARN: Killed all scripts!');
}