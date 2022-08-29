import { WaitPids } from "prep.js";

/*
Brainstorm of what's needed for a "main brain" script

- Get all the cracker programs ASAP and nuke everything we can as they become available
- Increase hacking level ASAP (using personal and sleeve study free or paid, xp script and/or batching)
- Increase home ram to a minimal level (for faster install recovery)
- Buy a few personal servers
- Run the casino script if we aren't banned
- Decide what's the best use for sleeves at any given time
	- Focus gang acquisition if gang isn't created yet
	- Reduce shock if shock > 95
	- Trail stats? Not sure? If money allows it might increase gang speed with easier homicides?
	- In some cases setting them on money making tasks might be best?
- Factions
	- Chose what factions to try getting into
	- Chose which one to focus (personal vs sleeves if they are free/makes sense)
	- Mesh with augs script to see what's best
	- Decide if/when we need to install/reset for favor depending on current faction focus
- Decide when to install/soft reset and do it
- Decide when to close the node and do it
- Check for coding contracts + solve
- Decide what servers to hack (using starter or manager as needed/allowed)
- Hacknet servers
	- Decide if/how much we want to invest (if at all)
	- Spend hashes on whatever makes the most sense given current situation
	- Install related augs if we are going to focus/invest in hacknet as a significant node strategy
- Stocks
	- Start stock market script if/when it makes sense
	- Stop it or ask it to release shares if we need the money it's holding (some priorities might call for that)
- Install backdoors when applicable/necessary
- Save money for corporation
	- We don't have a corp script yet so for now we're just focusing on amassing the 150b investment (if node strategy calls for it)
- Go to Chongqing and receive the gift ASAP if it makes sense (based on node multipliers)
*/


/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	// Initial breach
	ns.print('INFO: Breaching servers.');
	await WaitPids(ns, ns.exec('breach.js', 'home'));

	// Set sleeves to do something other than nothing
	// const karma= ns.heart.break();
	// let job= 'homicide';
	// let shock= ns.sleeve.getSleeveStats(0).shock;

	// if (shock > 95) {
	// 	job= 'shock';
	// }
	// else if (karam > -54000) {
	// 	job= 'homicide';
	// }
	let pid = ns.exec('sleeves.js', 'home', 1, 'shock');

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

		ApplyRep(ns);

		// Buy TOR
		if (!ns.getPlayer().tor) {
			ns.print('WARN: TOR router not found.');
			if (ns.getPlayer().money < 200000) {
				ns.print('WARN: Not enough money to purchase TOR router, postponing purchase.');
			}
			else {
				if (ns.singularity.purchaseTor()) {
					ns.print('INFO: Succesfully bought TOR router.');
				}
				else {
					ns.print('ERROR: Something went wrong buying the TOR router.');
				}
			}
		}

		// Buy BruteSSH.exe
		if (!ns.fileExists('BruteSSH.exe')) {
			ns.print('INFO: Checking if we can buy BruteSSH.exe.');
			ns.singularity.purchaseProgram("BruteSSH.exe");
		}

		// Buy FTPCrack.exe
		if (!ns.fileExists('FTPCrack.exe')) {
			ns.print('INFO: Checking if we can buy FTPCrack.exe.');
			ns.singularity.purchaseProgram("FTPCrack.exe");
		}

		// Buy relaySMTP.exe
		if (!ns.fileExists('relaySMTP.exe')) {
			ns.print('INFO: Checking if we can buy relaySMTP.exe.');
			ns.singularity.purchaseProgram("relaySMTP.exe");
		}

		// Buy SQLInject.exe
		if (!ns.fileExists('SQLInject.exe')) {
			ns.print('INFO: Checking if we can buy SQLInject.exe.');
			ns.singularity.purchaseProgram("SQLInject.exe");
		}

		// Buy HTTPWorm.exe 
		if (!ns.fileExists('HTTPWorm.exe')) {
			ns.print('INFO: Checking if we can buy HTTPWorm.exe.');
			ns.singularity.purchaseProgram("HTTPWorm.exe");
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
		await WaitPids(ns, ns.exec('breach.js', 'home'));

		ns.print('');
		await ns.sleep(10000);
	}
}

function ApplyRep(ns) {
	let player = ns.getPlayer();
	if (player.workType != 'Working for Faction') return;
	if (player.currentWorkFactionDescription != 'carrying out hacking contracts') return;
	ns.singularity.workForFaction(player.currentWorkFactionName, 'Hacking Contracts', false);
}