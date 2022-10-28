import { LogMessage } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
	const [node = 1] = ns.args;
	//LogMessage(ns, 'WARN: !!! Running b1t_flum3.exe on BN' + ns.getPlayer().bitNodeN + ' !!!');
	ns.rm('nodelog.txt');
	ns.rm('corp-start.txt');
	LogMessage(ns, 'INFO: !!! Starting BN' + node + ' and running autostart.js');
	ns.singularity.b1tflum3(node, 'autostart.js');
}