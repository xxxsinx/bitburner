/** @param {NS} ns */
export async function main(ns) {
	UpdateHud(100);
}

function UpdateHud(kills) {
	const doc = eval('document');
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');

	try {
		const headers = []
		const values = [];

		if (kills == undefined) {
			hook0.innerText = '';
			hook1.innerText = '';
			return;
		}

		headers.push("Kills: ");
		values.push('   ' + kills);

		hook0.innerText = headers.join(" \n");
		hook1.innerText = values.join("\n");
	} catch { }
}