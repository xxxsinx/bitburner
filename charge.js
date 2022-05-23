/** @param {NS} ns **/
export async function main(ns) {
	const [x, y] = ns.args;
	for (let i= 0; i < 10; i++)
		await ns.stanek.chargeFragment(x, y);
}