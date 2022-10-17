//save.js
export async function main(ns) {
	const file = "/stanek/" + ns.stanek.giftWidth() + "x" + ns.stanek.giftHeight() + '.txt';
	ns.write(file, JSON.stringify(ns.stanek.activeFragments()), 'w');
	ns.tprint("SUCCESS: Stanek Tetris saved to " + file);
}