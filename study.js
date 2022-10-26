const BIG_COURSE_MIN_MONEY = 500_000;

/** @param {NS} ns */
export async function main(ns) {
	const UNIS = [
		{ city: 'Sector-12', uni: 'Rothman University' },
		{ city: 'Aevum', uni: 'Summit University' },
		{ city: 'Volhaven', uni: 'ZB Institute of Technology' }
	];

	const currentWork= ns.singularity.getCurrentWork();
	//ns.tprint(currentWork);
	if (currentWork != undefined) return;

	let canStudy = UNIS.map(s => s.city).includes(ns.getPlayer().city);
	if (!canStudy && !TravelToVolhaven(ns)) return;

	const uni = UNIS.find(s => s.city == ns.getPlayer().city);
	if (uni == undefined) {
		ns.tprint('ERROR: No university in our current city.');
		return;
	}

	const course = ns.getPlayer().money > BIG_COURSE_MIN_MONEY ? 'Algorithms' : 'Study Computer Science';
	ns.singularity.universityCourse(uni.uni, course, false);
}

function TravelToVolhaven(ns) {
	const current = ns.getPlayer().city;

	// Go to Volhaven if we aren't already there
	if (current == 'Volhaven') {
		ns.tprint('WARN: We\'re already in Volhaven.');
		return true;
	}

	if (ns.getPlayer().money < BIG_COURSE_MIN_MONEY) {
		if (!ns.args.includes('silent'))
			ns.tprint('WARN: Aborting travel to Volhaven because we don\'t have 500k');
		return false;
	}

	if (!ns.singularity.travelToCity('Volhaven')) {
		ns.tprint('ERROR: Failed to travel to Volhaven.');
		return false;
	}

	ns.tprint('INFO: Traveled from ' + current + ' to Volhaven for university studies.');
	return true;
}