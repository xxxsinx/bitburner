import { WaitPids } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
}

export function GetCache(ns) {
	let cache = {};
	try { cache = JSON.parse(ns.read('/cache/cache.txt')); } catch { }
	return cache;
}

export function Cache(ns, key, updateScript, expiration) {
	
}

export function GetCacheValue(ns, key) {
	let cache = {};
	try { cache = JSON.parse(ns.read('/cache/cache.txt')); } catch { }
	return cache;
}

class CacheItem {
	constructor(key, updateScript, expiration, value= undefined) {
		this.key= key;
		this.updateScript= updateScript;
		this.expiration= expiration;
		this.value= value;
	}

	GetValue(ns) {
		if (this.value == undefined || this.expiration >= performance.now())
			throw new Error(this.key + ' is out of date');
		return this.value;
	}

	UpdateValue(ns) {
		WaitPids(ns, ns.run(this.updateScript));
	}
}