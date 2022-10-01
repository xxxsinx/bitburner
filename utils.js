/** @param {NS} ns **/
export async function main(ns) {
	ns.tprint(GetNextLevelXp(ns));

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

// Prints colored text to console. Arguments must be passed in pairs
// Usage: ColorPrint('red', 'This is some red text', '#FFFFFF', ' This is some white text);
export function ColorPrint(/* pass pairs of color, text */) {
	let findProp = propName => {
		for (let div of eval("document").querySelectorAll("div")) {
			let propKey = Object.keys(div)[1];
			if (!propKey) continue;
			let props = div[propKey];
			if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
			if (props.children instanceof Array) for (let child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
		}
	};
	let term = findProp("terminal");

	let out = [];
	for (let i = 0; i < arguments.length; i += 2) {
		let style = arguments[i];
		if (style.style == undefined) {
			style = { style: { color: arguments[i], backgroundColor: '#000000' } };
		}
		out.push(React.createElement("span", style, arguments[i + 1]))
	}
	try {
		term.printRaw(out);
	}
	catch { }
}

export function ServerReport(ns, server, metrics = undefined, printfunc = ns.print) {
	// Get server object for this server
	var so = ns.getServer(server);

	// weaken threads
	const tweaken = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, 1)*/);
	// grow threads
	const tgrow = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1));
	// hack threads
	const thack = Math.ceil(ns.hackAnalyzeThreads(server, so.moneyAvailable));

	printfunc('┌─────────────────────────────────────────────────────┐');
	printfunc('│ ' + server.padStart(52 / 2 + server.length / 2).padEnd(52) + '│');
	printfunc('├─────────────────────────────────────────────────────┤');
	printfunc('│ ' + ('Money        : ' + ns.nFormat(so.moneyAvailable, "$0.000a") + ' / ' + ns.nFormat(so.moneyMax, "$0.000a") + ' (' + (so.moneyAvailable / so.moneyMax * 100).toFixed(2) + '%)').padEnd(52) + '│');
	printfunc('│ ' + ('Security     : ' + (so.hackDifficulty - so.minDifficulty).toFixed(2) + ' min= ' + so.minDifficulty.toFixed(2) + ' current= ' + so.hackDifficulty.toFixed(2)).padEnd(52) + '│');
	printfunc('├─────────────────────────────────────────────────────┤');
	printfunc('│ ' + ('Weaken time  : ' + ns.tFormat(ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 4) + ' (t=' + tweaken + ')').padEnd(52) + '│');
	printfunc('│ ' + ('Grow         : ' + ns.tFormat(ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 3.2) + ' (t=' + tgrow + ')').padEnd(52) + '│');
	printfunc('│ ' + ('Hack         : ' + ns.tFormat(ns.formulas.hacking.hackTime(so, ns.getPlayer())) + ' (t=' + thack + ')').padEnd(52) + '│');
	printfunc('└─────────────────────────────────────────────────────┘');

	if (metrics != undefined) {
		metrics.Report(ns, printfunc);
	}
}

export function FormatMoney(ns, value, decimals = 3) {
	if (value >= 1e33) return '$' + value.toExponential(0);
	for (const pair of [[1e30, 'n'], [1e27, 'o'], [1e24, 'S'], [1e21, 's'], [1e18, 'Q'], [1e15, 'q'], [1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']])
		if (value >= pair[0]) return (value / pair[0]).toFixed(decimals) + pair[1];
	return '$' + value.toFixed(decimals);
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