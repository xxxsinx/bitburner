// Reassigns your employees to the jobs they're best suited for, while maintaining the same number of employees in each position.

class Employee {
	constructor(ns, division, city, name) {
		this.ns = ns;
		this.division = division;
		this.city = city;
		this.name = name;
	}
	get int() {
		let c = eval("this.ns.corporation");
		return c.getEmployee(this.division, this.city, this.name).int * (1 + .1 * c.getUpgradeLevel("Neural Accelerators")) * (c.hasResearched(this.division, "Overclock") ? 1.25 : 1) * (c.hasResearched(this.division, "CPH4 Injections") ? 1.1 : 1);
	}
	get eff() {
		let c = eval("this.ns.corporation");
		return c.getEmployee(this.division, this.city, this.name).eff * (1 + .1 * c.getUpgradeLevel("FocusWires")) * (c.hasResearched(this.division, "Overclock") ? 1.25 : 1) * (c.hasResearched(this.division, "CPH4 Injections") ? 1.1 : 1);
	}
	get cre() {
		let c = eval("this.ns.corporation");
		return c.getEmployee(this.division, this.city, this.name).cre * (1 + .1 * c.getUpgradeLevel("Nuoptimal Nootropic Injector Implants")) * (c.hasResearched(this.division, "CPH4 Injections") ? 1.1 : 1);
	}
	get cha() {
		let c = eval("this.ns.corporation");
		return c.getEmployee(this.division, this.city, this.name).cha * (1 + .1 * c.getUpgradeLevel("Speech Processor Implants")) * (c.hasResearched(this.division, "CPH4 Injections") ? 1.1 : 1);
	}
	get exp() {
		let c = eval("this.ns.corporation");
		return c.getEmployee(this.division, this.city, this.name).exp;
	}
	get operations() {
		return this.int * .6 + this.cha * .1 + this.exp + this.cre * .5 + this.eff;
	}
	get engineer() {
		return this.int + this.cha * .1 + this.exp * 1.5 + this.eff;
	}
	get business() {
		return this.int * .4 + this.cha + this.exp * .5;
	}
	get management() {
		return this.cha * 2 + this.exp + this.cre * .2 + this.eff * .7;
	}
	get researchanddevelopment() {
		return this.int * 1.5 + this.exp * .8 + this.cre + this.eff * .5;
	}
	get training() {
		return 0;
	}
	get unassigned() {
		return 0;
	}
	get jobs() {
		return {
			"Operations": this.operations,
			"Business": this.business,
			"Engineer": this.engineer,
			"Management": this.management,
			"Research & Development": this.researchanddevelopment,
			"Unassigned": this.unassigned,
			"Training": this.training
		}
	}
}

export class Office {
	constructor(ns, division, city) {
		this.ns = ns;
		this.division = division;
		this.city = city;
	}
	async truxican() {
		let c = eval("this.ns.corporation");
		let answer = {};
		let currentjobs = {
			"Operations": 0,
			"Business": 0,
			"Engineer": 0,
			"Management": 0,
			"Research & Development": 0,
			"Unassigned": 0,
			"Training": 0
		}
		while (c.getCorporation().state === "START")
			await this.ns.sleep(0);
		while (c.getCorporation().state != "START")
			await this.ns.sleep(0);
		for (let employee of c.getOffice(this.division, this.city).employees) {
			answer[employee] = new Employee(this.ns, this.division, this.city, employee).jobs;
			currentjobs[c.getEmployee(this.division, this.city, employee).pos] += 1;
			await this.ns.sleep(0);
		}
		let ranges = {}
		let final = [];
		for (let role of ["Operations", "Business", "Engineer", "Management", "Research & Development", "Unassigned", "Training"]) {
			if (currentjobs[role] > 0) {
				ranges[role] = [Object.keys(answer).map(x => answer[x][role]).reduce((a, b) => { return a <= b ? a : b }), Object.keys(answer).map(x => answer[x][role]).reduce((a, b) => { return a >= b ? a : b })]
				for (let employee of c.getOffice(this.division, this.city).employees) {
					if (ranges[role][0] == ranges[role][1]) {
						final.push([0, 0, employee, role]);
					} else {
						final.push([(answer[employee][role] - ranges[role][0]) / (ranges[role][1] - ranges[role][0]), answer[employee][role], employee, role]);
					}

				}
			}
		}
		final = final.sort((a, b) => { if (a[0] == b[0]) return a[1] - b[1]; return a[0] - b[0]; });
		while (final.length > 0) {
			if (currentjobs[final[final.length - 1][3]] > 0) {
				if (c.getEmployee(this.division, this.city, final[final.length - 1][2]).pos != final[final.length - 1][3]) {
					//this.ns.tprint(this.division, " ", this.city, " ", final[final.length-1][2], ": ", c.getEmployee(this.division, this.city, final[final.length-1][2]).pos, " -> ", final[final.length-1][3]);
				}
				c.assignJob(this.division, this.city, final[final.length - 1][2], final[final.length - 1][3]);
				currentjobs[final[final.length - 1][3]] -= 1;
				final = final.filter(x => x[2] != final[final.length - 1][2]);
			} else {
				final = final.filter(x => x[3] != final[final.length - 1][3]);
			}
			await this.ns.sleep(0);
		}
	}
}

/*
export async function main(ns) {
	const CorpApi = eval("ns.corporation")
	while (CorpApi.getCorporation().state != "START") { await ns.sleep(10) }

	await (new Office(ns, ns.args[0], ns.args[1]).truxican());
}*/