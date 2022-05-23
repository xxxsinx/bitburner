import { WaitPids } from "prep.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	// Initial breach
	ns.print('INFO: Breaching servers.');
	await RunBreach(ns);

	// Set sleeves to do something other than nothing
	let pid = ns.exec('sleeves.js', 'home');

	// Get gangs going
	pid = ns.exec('gangman.js', 'home');

	// Manage personal servers if cash allows
	// Delete smaller servers and replace with bigger ones
	// TODO: ??? Upgrade home ram ???
	//pid = ns.exec('buyserver.js', 'home', 1, 'loop');
	//ns.tail(pid);

	// TODO: Use starter instead if we're really low on ram?
	//pid = ns.exec('controller.js', 'home', 1);
	//ns.tail(pid);

	while (true) {
		// Look for contracts and solve them
		//ns.print('INFO: Solving contracts');
		let pid = ns.exec('cct.js', 'home');
		if (pid != undefined) {
			let pids = new Array();
			pids.push(pid);
			await WaitPids(ns, pids);
		}

		// Buy TOR
		if (!IsTorBought(ns)) {
			ns.print('WARN: TOR router not found.');
			if (ns.getPlayer().money < 200000) {
				ns.print('WARN: Not enough money to purchase TOR router, postponing purchase.');
			}
			else {
				if (ns.purchaseTor()) {
					ns.print('INFO: Succesfully bought TOR router.');
				}
				else {
					ns.print('ERROR: Something went wrong buying the TOR router.');
				}
			}
		}
		//else {
		//	ns.print('INFO: TOR router already bought.');
		//}

		// Buy BruteSSH.exe
		if (!ns.fileExists('BruteSSH.exe')) {
			ns.print('INFO: Checking if we can buy BruteSSH.exe.');
			ns.purchaseProgram("BruteSSH.exe");
		}

		// Buy FTPCrack.exe
		if (!ns.fileExists('FTPCrack.exe')) {
			ns.print('INFO: Checking if we can buy FTPCrack.exe.');
			ns.purchaseProgram("FTPCrack.exe");
		}

		// Buy relaySMTP.exe
		if (!ns.fileExists('relaySMTP.exe')) {
			ns.print('INFO: Checking if we can buy relaySMTP.exe.');
			ns.purchaseProgram("relaySMTP.exe");
		}

		// Buy SQLInject.exe
		if (!ns.fileExists('SQLInject.exe')) {
			ns.print('INFO: Checking if we can buy SQLInject.exe.');
			ns.purchaseProgram("SQLInject.exe");
		}

		// Buy HTTPWorm.exe 
		if (!ns.fileExists('HTTPWorm.exe')) {
			ns.print('INFO: Checking if we can buy HTTPWorm.exe.');
			ns.purchaseProgram("HTTPWorm.exe");
		}




		// Leave 1m for travels
		// Auto join Tian
		// Auto join CSEC
		// Auto join NiteRunners
		// Auto join The Black Hand
		// Auto join BitRunners
		// Auto join Daedelus
		// Farm rep
		// if required > 300k
		// Reset at 100k for favor
		// If required > 750k
		// Reset at 365k for favor
		// Farm the rest by donations


		// Run share when ram allows

		// Breach again
		await RunBreach(ns);

		ns.print('');
		await ns.sleep(10000);
	}
}

export function IsTorBought(ns) {
	const servers = ns.scan('home');
	let res = servers.find(p => p == 'darkweb');

	return res == 'darkweb';
}

export async function RunBreach(ns) {
	let pid = ns.exec('breach.js', 'home');
	let pids = new Array();
	pids.push(pid);
	await WaitPids(ns, pids);
}