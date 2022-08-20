import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

/** @param {NS} ns */
export async function main(ns) {
	const [hackingOnly = true] = ns.args;



	let servers = GetAllServers(ns);
	if (hackingOnly) {
		servers = servers.filter(s => ns.hasRootAccess(s.name) && ns.getServerMaxMoney(s.name) > 0).sort((a, b) => ns.getServerMaxMoney(b.name) - ns.getServerMaxMoney(a.name));
	}

	const spacer = 1;
	await GetSymbolAssociations(ns, servers);

	const columns = [
		{ header: ' Servers', width: hackingOnly ? Math.max(...servers.map(s => s.name.length)) + 2 : 48 },
		{ header: ' Sym', width: 6 },
		{ header: ' Ram', width: 22 },
		{ header: ' Money', width: 23 },
		{ header: ' Sec', width: 7 },
		{ header: ' MinSec', width: 8 },
		{ header: ' HackReq', width: 9 },
		{ header: ' Prepped', width: 9 },
		{ header: ' Chance', width: 8 },
		{ header: ' Weaken Time', width: 24 }
	];

	let data = [];

	for (let i = 0; i < servers.length; i++) {
		const server = servers[i];
		let depth = server.route.length - 1;
		let nextDepth = i >= servers.length - 1 ? -1 : servers[i + 1].route.length - 1;
		let lastRootChild = lastChildAtDepth(servers, i, depth);
		let prefix = '';

		for (let j = 1; j <= depth; j++) {
			if (nextDepth >= depth && j == depth) {
				if (i == lastRootChild) prefix += '└'.padEnd(spacer + 1, '─');
				else prefix += '├'.padEnd(spacer + 1, '─');
			}
			else if (nextDepth < depth && j == depth) prefix += '└'.padEnd(spacer + 1, '─');
			else if (i == servers.length - 1 && i != lastChildAtDepth(servers, i, j)) prefix += '└'.padEnd(spacer + 1, '─');
			else if (j == depth) prefix += '│'.padEnd(spacer + 1, ' ');
			else if (i != lastChildAtDepth(servers, i, j)) prefix += '│'.padEnd(spacer + 1, ' ');
			else prefix += '  ';
		}

		let maxRam = ns.getServerMaxRam(server.name);
		let ramString = maxRam > 0 ? ns.nFormat(maxRam * 1000000000, '0.0b') : '';

		let freeRam = ns.getServerMaxRam(server.name) - ns.getServerUsedRam(server.name);
		let freeRamColor = freeRam > 0 ? 'white' : '#555555';
		let freeRamString = maxRam > 0 ? ns.nFormat(freeRam * 1000000000, '0.0b') : '';

		let ramPct = maxRam > 0 ? (freeRam / maxRam * 100).toFixed(0) + '%' : '';

		freeRamColor = pctColor(freeRam / maxRam);

		let money = ns.getServerMoneyAvailable(server.name);
		let moneyMax = ns.getServerMaxMoney(server.name);

		let moneyPct = moneyMax > 0 ? (money / moneyMax * 100).toFixed(0) + '%' : '';

		let moneyString = moneyMax > 0 ? ns.nFormat(money, '0.00a').padStart(8) : ''.padStart(8);
		let moneyColor = pctColor(money / moneyMax);

		let maxMoneyString = moneyMax > 0 ? ns.nFormat(moneyMax, '0.00a').padStart(8) : ''.padStart(8);

		let so = ns.getServer(server.name);
		let sec = so.hackDifficulty;
		let minSec = so.minDifficulty;
		let secPct = (sec - minSec) / (99 - minSec);
		let secColor = pctColor(1 - secPct);

		let cso = ns.getServer(server.name);
		cso.hackDifficulty = cso.minDifficulty;
		let player = ns.getPlayer();
		let prepped = so.hackDifficulty == so.minDifficulty && so.moneyAvailable == so.moneyMax && so.moneyMax > 0;
		
		let chance = ns.fileExists('Formulas.exe') ? ns.formulas.hacking.hackChance(cso, player) : ns.hackAnalyzeChance(cso.hostname);
		let weakTime= ns.fileExists('Formulas.exe') ? ns.formulas.hacking.weakenTime(cso, player) : ns.getWeakenTime(cso.hostname); 

		let hackReqColor = 'lime';
		if (so.requiredHackingSkill <= player.hacking / 2)
			hackReqColor = 'lime';
		else if (so.requiredHackingSkill < player.hacking / 2)
			hackReqColor = 'orange';
		else
			hackReqColor = 'red';

		let hackable = so.moneyMax > 0 && so.hasAdminRights;

		data.push([
			{ color: 'white', text: ' ' + (hackingOnly ? '' : prefix) + server.name },
			{ color: 'white', text: server.sym ? ' ' + server.sym.padEnd(5) : ''.padStart(5) },
			{ color: maxRam > 0 ? freeRamColor : '#555555', text: ' ' + freeRamString.padStart(7) + (maxRam == 0 ? ' ' : '/') + ramString.padStart(7) + ' ' + ramPct.padStart(4) },
			{ color: moneyMax > 0 ? moneyColor : '#555555', text: moneyString + (moneyMax > 0 ? '/' : ' ') + maxMoneyString + moneyPct.padStart(5) },
			hackable ? { color: secColor, text: moneyMax > 0 ? (sec - minSec).toFixed(2).padStart(6) : ''.padEnd(6) } : '',
			hackable ? { color: 'white', text: ' ' + Math.round(so.minDifficulty).toString().padStart(4) } : '',
			{ color: hackReqColor, text: ' ' + so.requiredHackingSkill.toString().padStart(5) },
			hackable ? { color: prepped ? 'lime' : '#555555', text: prepped ? '   Yes' : '    -' } : '',
			hackable ? { color: pctColor(chance), text: ' ' + (Math.round(chance * 100) + '%').padStart(5) } : '',
			hackable ? { color: 'white', text: ' ' + formatTime(weakTime).padStart(22) } : ''
		]);
	}

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}

function formatTime(time) {
	let seconds = time / 1000 % 60;
	let minutes = Math.floor(time / 1000 / 60);
	return (minutes > 0 ? minutes.toFixed(0) + ' minutes ' : '') + seconds.toFixed(0).padStart(2) + ' seconds';

}

// Selects a color based on a 1-based percentage
function pctColor(pct) {
	if (pct >= 1) return 'Lime';
	else if (pct >= 0.9) return 'Green';
	else if (pct >= 0.75) return 'ForestGreen';
	else if (pct >= 0.6) return 'GreenYellow';
	else if (pct >= 0.3) return 'Orange';
	else if (pct != 0) return 'DarkOrange';
	return 'Red';
}

// Centers text in a padded string of "length" long
function padCenter(str, length) {
	return str.padStart((length + str.length) / 2).padEnd(length);
}

// Finds the last child in the server list that is at the specified depth (for line closure)
function lastChildAtDepth(servers, start, depth) {
	let last = start;
	for (let i = start; i < servers.length; i++) {
		let currentDepth = servers[i].route.length - 1;
		if (currentDepth > depth)
			continue;
		if (currentDepth == depth) {
			last = i;
			continue;
		}
		if (currentDepth < depth)
			return last;
	}
	return last;
}

export function GetAllServers(ns, root = 'home', found = new Array(), route = new Array()) {
	if (!found.find(p => p.name == root)) {
		let entry = { name: root, route: route };
		entry.route.push(root);
		found.push(entry);
	}

	for (const server of ns.scan(root)) {
		if (!found.find(p => p.name == server)) {
			let newRoute = route.map(p => p);
			GetAllServers(ns, server, found, newRoute);
		}
	}

	return [...found];
}

export async function GetSymbolAssociations(ns, servers) {
	let data = [];

	// Load symbols if we already have them
	const filename = 'symbol-servers.txt';
	if (ns.fileExists(filename)) {
		data = JSON.parse(await ns.read(filename));
	}

	if (data.length == 0) {
		// Get source code enum data
		await ns.wget('https://raw.githubusercontent.com/danielyxie/bitburner/master/src/Locations/data/LocationNames.ts', 'locations.txt');;
		await ns.wget('https://raw.githubusercontent.com/danielyxie/bitburner/master/src/StockMarket/data/StockSymbols.ts', 'stocksymbols.txt');

		let location = "";
		let company = "";
		let locations = ns.read('locations.txt');
		let locationMap = {};
		for (let line of locations.split("\n")) {
			if (line.includes('=')) {
				location = line.split(" = ")[0];
				company = line.split(" = ")[1];
				while (company.includes('"')) { company = company.replace('"', '').replace(",", ""); }
				while (location.includes(' ')) { location = location.replace(' ', ''); }
			}
			locationMap[location] = company;
		}

		let companies = ns.read('stocksymbols.txt');
		for (let line of companies.split("\n")) {
			let location;
			let sym;
			let serverName;

			if (line.includes("LocationName")) {
				for (let line2 of Object.keys(locationMap)) {
					if (line2.length > 3 && line.includes(line2)) {
						location = locationMap[line2];
						sym = line.split("=")[1].replace(";", "").replace('\"', '').replace('\"', '').replace(' ', '');
					}
				}
			} else {
				if (line.includes("StockSymbols") && !line.includes("LocationName") && !line.includes("export")) {
					location = line.substring(14, line.indexOf(']') - 1);
					sym = line.substring(line.indexOf('=') + 3, line.length - 2);
				}
			}

			for (let server of servers) {
				let so = ns.getServer(server.name);
				if (so.organizationName == location)
					serverName = server.name;
			}

			if (location != undefined && serverName != undefined) {
				data.push({ location: location, sym: sym, server: serverName });
			}
		}

		// Remove temporary files
		ns.rm('locations.txt');
		ns.rm('stocksymbols.txt');

		// Save data to a file so we don't need to fetch every time
		await ns.write(filename, JSON.stringify(data));
	}

	// Assign symbols to our server list
	for (let server of servers) {
		let match = data.find(s => s.server == server.name);
		if (match != undefined)
			server.sym = match.sym;
		else
			server.sym = '';
	}

	// Future use maybe?
	return data;
}