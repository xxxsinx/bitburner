import { LogMessage } from 'utils.js'

//load.js
export async function main(ns) {
	let file = "/stanek/" + ns.stanek.giftWidth() + "x" + ns.stanek.giftHeight() + ".txt";
	if (ns.args[0])
		file = ns.args[0];

	if (!ns.fileExists(file)) {
		ns.tprint("WARN: No Stanek profile found at " + file);
		return;
	}

	if (ns.stanek.activeFragments().length > 0) {
		//ns.tprint("INFO: Stanek profile already loaded");
		return;
	}

	let tetris = JSON.parse(ns.read(file));
	ns.stanek.clearGift();
	for (const p of tetris) {
		ns.stanek.placeFragment(p.x, p.y, p.rotation, p.id);
	}
	ns.tprint("SUCCESS: Stanek tetris " + file + " loaded.");
	LogMessage(ns, "SUCCESS: Stanek tetris " + file + " loaded.");
}