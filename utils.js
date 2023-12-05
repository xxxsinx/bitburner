/** @param {NS} ns **/
export async function main(ns) {
	//ns.tprint(GetServerPath(ns, 'run4theh111z'));

	//ns.tprint(HasFormulas(ns));

	// const servers = GetAllServers(ns);
	// ns.tprint(servers.length + ' ' + servers);

	// ns.tprint('path of ecorp is ' + GetServerPath(ns, 'ecorp'));

	// ns.tprint(FormatMoney(ns, 0));
	// ns.tprint(FormatMoney(ns, 1e3));
	// ns.tprint(FormatMoney(ns, 1e6));
	// ns.tprint(FormatMoney(ns, 1e9));
	// ns.tprint(FormatMoney(ns, 1e12));
	// ns.tprint(FormatMoney(ns, 1e15));
	// ns.tprint(FormatMoney(ns, 1e18));
	// ns.tprint(FormatMoney(ns, 1e21));
	// ns.tprint(FormatMoney(ns, 1e24));
	// ns.tprint(FormatMoney(ns, 1e27));
	// ns.tprint(FormatMoney(ns, 1e30));
	// ns.tprint(FormatMoney(ns, 1e33));
	// ns.tprint(FormatMoney(ns, 1e36));
	// ns.tprint(FormatMoney(ns, 1e39));
	// ns.tprint(FormatMoney(ns, 1e42));
	// ns.tprint(FormatMoney(ns, 1e45));
	// ns.tprint(FormatMoney(ns, 1e48));
	// ns.tprint(FormatMoney(ns, 1e51));
	// ns.tprint(FormatMoney(ns, 1e54));
	// ns.tprint(FormatMoney(ns, 1e57));
	// ns.tprint(FormatMoney(ns, 1e60));
	// ns.tprint(FormatMoney(ns, 1e63));
	// ns.tprint(FormatMoney(ns, 1e66));

	// let servers= discoverServers(ns);
	// ns.tprint(servers.length + ' ' + servers);


	//const s= t=>[t,...ns.scan(t).flatMap(z=>t !=='home' && s)]
	//const z=t=>[t,...ns.scan(t).slice(t!='home').flatMap(z)]
	// let servers= z('home')
	// ns.tprint(servers.length + ' ' + servers);


	// let servers = z('home');
	// ns.tprint(servers.length + ' ' + servers);

	// let servers2 = GetAllServers(ns);
	// ns.tprint(servers2.length + ' ' + servers);


	// ns.tprint(servers2.map(s=>servers.includes(s) ? `${s} is on both lists` : `${s} is MISSING`).join("\n"))

	const path= GetServerPath(ns, 'rho-construction');
	ns.tprint(path.join(';connect '));


}


export const discoverServers2 = (ns, servers = ["home"]) => servers.forEach(s => servers.push(...ns.scan(s).slice(s === "home" ? 0 : 1))) && servers;

// Function to discover available servers on the network
export function discoverServers(ns) {
	const discoveredServers = ["home"]; // Initialize with "home" as the first entry

	// Loop through discovered servers to discover child servers
	for (const server of discoveredServers) {
		discoveredServers.push(...ns.scan(server).slice(server === "home" ? 0 : 1));
	}

	// Return the list of discovered servers
	return discoveredServers;
}


// Iterative network scan
export function GetAllServers(ns) {
	let servers = ['home'];
	for (const server of servers) {
		const found = ns.scan(server);
		if (server != 'home') found.splice(0, 1);
		servers.push(...found);
	}
	return servers;
}

// Find the path to a server
export function GetServerPath(ns, server) {
	const path = [server];
	while (server != 'home') {
		server = ns.scan(server)[0];
		path.unshift(server);
	}
	return path;
}

export function ServerReport(ns, server, metrics = undefined) {
	// Get server object for this server
	var so = ns.getServer(server);

	// weaken threads
	const tweaken = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, 1)*/);
	// grow threads
	const tgrow = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1));
	// hack threads
	const thack = Math.ceil(ns.hackAnalyzeThreads(server, so.moneyAvailable));

	ns.print('┌─────────────────────────────────────────────────────┐');
	ns.print('│ ' + server.padStart(52 / 2 + server.length / 2).padEnd(52) + '│');
	ns.print('├─────────────────────────────────────────────────────┤');
	ns.print('│ ' + ('Money        : ' + ns.nFormat(so.moneyAvailable, "$0.000a") + ' / ' + ns.nFormat(so.moneyMax, "$0.000a") + ' (' + (so.moneyAvailable / so.moneyMax * 100).toFixed(2) + '%)').padEnd(52) + '│');
	ns.print('│ ' + ('Security     : ' + (so.hackDifficulty - so.minDifficulty).toFixed(2) + ' min= ' + so.minDifficulty.toFixed(2) + ' current= ' + so.hackDifficulty.toFixed(2)).padEnd(52) + '│');
	ns.print('├─────────────────────────────────────────────────────┤');
	ns.print('│ ' + ('Weaken time  : ' + ns.tFormat(ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 4) + ' (t=' + tweaken + ')').padEnd(52) + '│');
	ns.print('│ ' + ('Grow         : ' + ns.tFormat(ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 3.2) + ' (t=' + tgrow + ')').padEnd(52) + '│');
	ns.print('│ ' + ('Hack         : ' + ns.tFormat(ns.formulas.hacking.hackTime(so, ns.getPlayer())) + ' (t=' + thack + ')').padEnd(52) + '│');
	ns.print('└─────────────────────────────────────────────────────┘');

	if (metrics != undefined) {
		metrics.Report(ns);
	}
}

export function FormatMoney(ns, value, decimals = 3) {
	if (Math.abs(value) >= 1e33) return '$' + value.toExponential(0);
	for (const pair of [[1e30, 'n'], [1e27, 'o'], [1e24, 'S'], [1e21, 's'], [1e18, 'Q'], [1e15, 'q'], [1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']])
		if (Math.abs(value) >= pair[0]) return (Math.sign(value) < 0 ? "-" : "") + (Math.abs(value) / pair[0]).toFixed(decimals) + pair[1];
	return '$' + (Math.sign(value) < 0 ? "-" : "") + Math.abs(value).toFixed(decimals);
}

export function FormatRam(ns, value, decimals = 1) {
	const zero = 0;
	return ns.nFormat(value * 1000000000, (zero.toFixed(decimals) + 'b'));
}

export async function WaitPids(ns, pids) {
	if (!Array.isArray(pids)) pids = [pids];
	while (pids.some(p => ns.getRunningScript(p) != undefined)) { await ns.sleep(5); }
}

export function HasFormulas(ns) {
	try { ns.formulas.hacknetNodes.constants(); return true; } catch { return false; }
}

// Returns the needed XP for the next hacking level
export function GetNextLevelXp(ns, skill = 'hacking') {
	let player = ns.getPlayer();
	let prevXp = ns.formulas.skills.calculateExp(player.skills[skill], player.mults[skill]);
	let nextXp = ns.formulas.skills.calculateExp(player.skills[skill] + 1, player.mults[skill]);

	let needed = nextXp - prevXp;
	let progress = player.exp[skill] - prevXp;
	let remaining = needed - progress;
	let pct = progress / needed * 100;

	// ns.tprint('Progress : ' + ns.nFormat(progress, '0.000a') + ' / ' + ns.nFormat(needed, '0.000a'));
	// ns.tprint('Remaining: ' + ns.nFormat(remaining, '0.000a') + ' (' + pct.toFixed(2) + '%)');

	return {
		needed: needed,
		progress: progress,
		remaining: remaining,
		pct: pct
	}
}

export function LogMessage(ns, message) {
	let time = new Date().toLocaleTimeString();
	let date = new Date().toLocaleDateString();
	let log = '[' + date.padStart(10) + ' ' + time.padStart(11) + '] ' + message + '\n';
	ns.write('nodelog.txt', log, 'a');
}

export function GetServerFromSymbol(ns, sym) {
	const org = ns.stock.getOrganization(sym);
	return GetAllServers(ns).find(s => ns.getServer(s).organizationName == org) ?? '';
}

export function GetSymbolFromServer(ns, server) {
	const org = ns.getServer(server).organizationName;
	return ns.stock.getSymbols().find(s => ns.stock.getOrganization(s) == org) ?? '';
}