import { WaitPids } from "utils.js";
import { RunScript } from "ram.js"

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

	const started = performance.now();

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

	// Get gangs going

	// Manage personal servers if cash allows
	// Delete smaller servers and replace with bigger ones
	// TODO: ??? Upgrade home ram ???
	//pid = ns.exec('buyserver.js', 'home', 1, 'loop');
	//ns.tail(pid);

	// TODO: Use starter instead if we're really low on ram?
	//pid = ns.exec('controller.js', 'home', 1);
	//ns.tail(pid);

	while (true) {
		// Buy programs, run programs, nuke
		await WaitPids(ns, ns.exec('breach.js', 'home'));

		// Solve contracts
		await WaitPids(ns, ns.exec('cct.js', 'home'));

		// Save work reputation to it's faction
		await WaitPids(ns, ns.exec('SaveRep.js', 'home'));

		// Install backdoors
		await WaitPids(ns, ns.exec('installBackdoor.js', 'home'));

		// Sleeve management
		if (started < 60 * 5) { // First 2 minutes we deshock
			await WaitPids(ns.exec('sleeves.js', 'home', 1, 'shock'));
		}
		else if (karma == 0) { // Start killing for karma
			// We don't have gang karma, have sleeves grind karma for us
			await WaitPids(ns.exec('sleeves.js', 'home', 1, 'homicide'));
		}

		// Start gangs if we have the karma for it
		const karma = ns.heart.break();
		if (karma <= -54000) ns.exec('gangman.js', 'home');

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

		ns.print('');
		await ns.sleep(10000);
	}
}

export async function TryRunScript(ns, script, params) {
	//export async function RunScript(ns, scriptName, target, threads, delay, expectedTime, batchNumber, logColor, allowSpread, allowPartial) {
		RunScript(ns, script, )
}