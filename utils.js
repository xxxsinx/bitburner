/** @param {NS} ns **/
export async function main(ns) {
	let servers = GetAllServers(ns);
	ns.tprint(servers.length);

	servers = GetAllServers2(ns);
	ns.tprint(servers.length);

	servers = GetAllServers3(ns);
	ns.tprint(servers.length);

	servers = GetAllServers4(ns);
	ns.tprint(servers.length);

	servers = GetAllServers5(ns);
	ns.tprint(servers.length);

	servers = GetAllServers6(ns);
	ns.tprint(servers.length);

	servers = GetAllServers7(ns);
	ns.tprint(servers.length);

	servers = GetAllServers8(ns);
	ns.tprint(servers.length);

	servers = GetAllServers9(ns);
	ns.tprint(servers.length);

	servers = GetAllServers10(ns);
	ns.tprint(servers.length);

	servers = GetAllServers11(ns);
	ns.tprint(servers.length);

	servers = GetAllServers12(ns);
	ns.tprint(servers.length);

	servers = GetAllServers13(ns);
	ns.tprint(servers.length);

	const s0 = ((n, a = (s, p) => n.scan(s).map(v => v != p ? a(v, s) : s).flat()) => [".", ...a(".")])(ns);
	const s6 = ((q, s = new Set('.')) => (s.forEach(k => q.scan(k).map(s.add, s)), [...s]))(ns);

	servers = s0;
	ns.tprint(servers.length);

	servers = s6;
	ns.tprint(servers.length);

	const GetAllServers14 = (t) => [t].concat(ns.scan(t).slice(t != 'home').flatMap(GetAllServers14));
	servers = GetAllServers14('home');
	ns.tprint(servers.length);

	const GetAllServers15 = (t) => [t, ...ns.scan(t).slice(t != 'home').flatMap(GetAllServers15)]
	servers = GetAllServers15('home');
	ns.tprint(servers.length);

	// let missing= servers.filter(s=>!servers2.includes(s));
	// ns.tprint(missing);
}

// Recursive network scan
export function GetAllServers(ns, root = 'home', found = new Set()) {
	found.add(root);
	for (const server of ns.scan(root))
		if (!found.has(server))
			GetAllServers(ns, server, found);
	return [...found];
}

// Recursive network scan, compressed
export function GetAllServers2(ns, root = 'home', found = []) {
	found.push(root);
	for (const server of root == 'home' ? ns.scan(root) : ns.scan(root).slice(1)) GetAllServers2(ns, server, found);
	return found;
}

// Iterative network scan
export function GetAllServers3(ns) {
	let servers = ['home'];
	for (let i = 0; i < servers.length; i++) {
		let found = ns.scan(servers[i]);
		for (let j = 0; j < found.length; j++) {
			if (servers.includes(found[j])) continue;
			servers.push(found[j]);
		}
	}
	return servers;
}

// Iterative network scan
export function GetAllServers4(ns) {
	let servers = ns.scan('home');
	for (let i = 0; i < servers.length; i++) servers = servers.concat(ns.scan(servers[i]).slice(1));
	return ['home', ...servers];
}

export function GetAllServers5(ns, set = new Set(['home'])) {
	return set.forEach(hn => ns.scan(hn).forEach(o => set.add(o))) || [...set.values()];
}

export function GetAllServers6(ns) {
	for (var s = ["."], i = 0; i < s.length; i++)s.push(...ns.scan(s[i]).filter(n => !s.includes(n)))
	return s;
}

export function GetAllServers7(ns) {
	let scan = (server, parent) => ns.scan(server).map(newServer => newServer != parent ? scan(newServer, server) : server).flat();
	return ['home', ...scan('home')];
}

function GetAllServers8(ns, serv = "home", found = []) { //start from home with empty array
	found.push(serv); //push this server to array
	let scanned = ns.scan(serv);
	while (scanned.length > 0) {
		const search = scanned.shift(); //joink the first server and save it to var
		let iAlreadyHaveThis = false;
		for (const f of found) {
			if (f == search) iAlreadyHaveThis = true;
		}
		if (!iAlreadyHaveThis) GetAllServers8(ns, search, found); //If it's not in the found array, go there and do some more scanning
	}
	return (found); //gimme gimme
}

function GetAllServers9(ns, root = 'home') {
	let locals = ns.scan(root)
	let allServers = []

	while (locals.length > 0) {
		let current = locals.shift();
		let neighbors = ns.scan(current);
		neighbors.shift();

		if (neighbors.length > 0) {
			locals = locals.concat(neighbors);
		}

		allServers.push(current);
	}

	return ['home', ...allServers];
}

function GetAllServers10(ns) {
	let q = ['home'];
	Array(17).fill().map(() => q = [...new Set(q.map(s => [s, ns.scan(s)]).flat(2))]);
	return q;
}

function GetAllServers11(ns) {
	return (q => Array(17).fill().map(() => q = [...new Set(q.map(s => [s, ns.scan(s)]).flat(2))]))(['home']).slice(-1)[0];
}

function GetAllServers12(ns) {
	return (q => Array(17).fill().map(() => q = [...new Set(q.map(s => [s, ns.scan(s)]).flat(2))]))(['home']).pop();
}

globalThis.GetAllServers13 = (n, a = (s, p) => n.scan(s).map(v => v != p ? a(v, s) : s).flat()) => [".", ...a(".")];