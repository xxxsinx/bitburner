import { Office } from "corp-truxican.js";
/** @param {NS} ns */
export async function main(ns) {
	const BITNODE_MULTIPLIER = ns.getBitNodeMultipliers();
	const PLAYER = ns.getPlayer();
	const LOW_VAL = 0.5;
	const ROUND_MAX = 4;
	const PRODUCT_CITY_MAX = 3000;
	const upgrades = ["Project Insight", "Smart Factories"/*,"Smart Storage"*/, "Speech Processor Implants", "Neural Accelerators", "FocusWires", "ABC SalesBots", "Nuoptimal Nootropic Injector Implants"]
	const a_research = ["Automatic Drug Administration", "CPH4 Injections", "Drones", "Drones - Assembly", "Go-Juice", "JoyWire", "Overclock", "Self-Correcting Assemblers", "Sti.mu"]
	const b_research = ["AutoBrew", "AutoPartyManager", "Drones - Transport"]
	const all_divisions = ["Software", "RealEstate", "Agriculture", "Fishing", "Tobacco", "Food", "Chemical", "Energy", "Utilities", "Mining", "Pharmaceutical", "Computer", "Robotics", "Healthcare"];
	const cities = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
	const analyzefile = "/analyze-corp.txt";
	let start;
	if (!ns.fileExists("corp-start.txt")) {
		start = PLAYER.playtimeSinceLastBitnode
		ns.write("corp-start.txt", start, "w")
	} else {
		start = ns.read("corp-start.txt")
	}
	ns.tail();
	ns.disableLog("ALL")

	class Corp {
		constructor(ns) {
			this.ns = ns;
			this.CorpApi = eval('this.ns.corporation');
			this.Fraud = BITNODE_MULTIPLIER.CorporationValuation >= LOW_VAL ? true : false;
			this.Round = 0;
			this.data = {};
			this.offer = 0;
			this.hired = false;
			this.truxican = false;
			this.products = [];
			this.empMulti = 1;
			this.counter = 0;
			this.advMulti = 1;

			this.firstproduct = false;
			this.not30_goal = false;
			this.not70_goal = false;
			this.not100_goal = false;


		}
		async Initialize() {
			//try {
			if (!PLAYER.hasCorporation) { await this.CreateCorp(); }
			this.Round = this.CorpApi.getInvestmentOffer().round - 1;
			this.funds = this.CorpApi.getCorporation().funds;
			this.data = this.GetData()
			this.data.mode == "product" ? await this.MainLoop() : this.data.mode == "fraud" ? await this.FraudLoop() : this.ExitError("data Error");
			//} catch { this.ExitError("Initialize Error") }
		}
		async FraudLoop() {
			//try {
			await this.Prep();
			await this.Party();
			await this.WaitState("START");
			await this.TakeOffer();
			await this.Initialize();

			//} catch { this.ExitError("Fraud Loop Error " + err) }
		}
		async MainLoop() {
			//try {

			// eslint-disable-next-line no-constant-condition
			while (true) {
				await this.Prep();

				await this.ProductLoop();
				this.hired ? this.truxican = true : null;
				this.PartyTime > performance.now() || this.hired ? await this.Party() : null;
				this.Round == 3 && this.products.length >= 2 && this.products[LOW_VAL <= 0.5 ? 1 : 0].prog >= 100 ? this.counter > 11 ? await this.TakeOffer() : this.counter++ : null;

				if (this.Round >= 4 && this.CorpApi.getCorporation().public != 1) {
					this.ns.tprint('INFO: Going public! ' + this.CorpApi.getCorporation().public);
					this.CorpApi.goPublic(0);
				}
				if (this.CorpApi.getCorporation().public == 1)
					this.CorpApi.issueDividends(0.1);
				// else {
				// 	ns.tprint('WARN: this.Round = ' + this.Round + ' ' + + this.CorpApi.getCorporation().public);
				// }

				await this.WaitState("START", 1, true);
				if (this.products.length > 0 && !this.firstproduct) { if (this.products[0].prog >= 100) { this.Analyze(2); this.firstproduct = true; } }
				if (this.CorpApi.getCorporation().funds > 1e30 && !this.not30_goal) { this.Analyze(3); this.not30_goal = true; this.advMulti = 10 }
				//if (this.CorpApi.getCorporation().funds > 1e70 && !this.not70_goal) { this.Analyze(4); this.not70_goal = true; this.empMulti = 2 }
				//if (this.CorpApi.getCorporation().funds > 1e100 && !this.not100_goal) { this.Analyze(5); this.not100_goal = true; }
				if (!this.hired && this.truxican) { const tstart = performance.now(); await (new Office(this.ns, this.data.m_division, "Aevum").truxican()); this.truxican = false; this.ns.tprint("Truxican Runtime:" + this.ns.tFormat(performance.now() - tstart)); }

			}
			//} catch (err) { this.ExitError("MainLoop Error" + err) }


		}
		GetData() {
			//try {
			switch (true) {
				case this.Fraud && this.funds == 150e9: return { mode: "fraud", division_goal: 1, m_division: "Software", prodMat: "AI Cores", prodMatSize: 1, employee_goal: 3, storage_goal: 8, speech_goal: 0, factory_goal: 0, dream_goal: 0, smart_goal: 7, stat_goal: 0, project_goal: 0, abc_goal: 0, adv_goal: 3, wilson_goal: 0 };
				case this.funds >= 6.5e18: return { mode: "product", productMin: 20000, division_goal: 14, m_division: "Tobacco", prodMat: "RealEstate", prodMatSize: 20, employee_goal: 0, storage_goal: 50, speech_goal: 300, factory_goal: 300, dream_goal: 10, smart_goal: 150, stat_goal: 300, project_goal: 250, abc_goal: 250, adv_goal: 60, wilson_goal: 40 };
				case this.funds >= 1e18: return { mode: "product", productMin: 20000, division_goal: 14, m_division: "Tobacco", prodMat: "RealEstate", prodMatSize: 20, employee_goal: 0, storage_goal: 50, speech_goal: 200, factory_goal: 150, dream_goal: 10, smart_goal: 100, stat_goal: 200, project_goal: 150, abc_goal: 150, adv_goal: 50, wilson_goal: 25 };
				case this.Fraud && this.funds >= 30e15: return { mode: "fraud", division_goal: 14, m_division: "RealEstate", prodMat: "RealEstate", prodMatSize: 20, employee_goal: 60, storage_goal: 135, speech_goal: 160, factory_goal: 0, dream_goal: 10, smart_goal: 150, stat_goal: 160, project_goal: 180, abc_goal: 120, adv_goal: 60, wilson_goal: 30 };
				case this.Fraud && this.funds >= 1e15: return { mode: "fraud", division_goal: 14, m_division: "RealEstate", prodMat: "RealEstate", prodMatSize: 20, employee_goal: 15, storage_goal: 75, speech_goal: 150, factory_goal: 0, dream_goal: 0, smart_goal: 80, stat_goal: 150, project_goal: 100, abc_goal: 150, adv_goal: 40, wilson_goal: 15 };
				case this.Fraud && this.funds >= 2.7e12: return { mode: "fraud", division_goal: 6, m_division: "RealEstate", prodMat: "RealEstate", prodMatSize: 20, employee_goal: 9, storage_goal: 18, speech_goal: 20, factory_goal: 0, dream_goal: 0, smart_goal: 30, stat_goal: 10, project_goal: 10, abc_goal: 20, adv_goal: 21, wilson_goal: 6 };
				case this.Fraud && this.funds >= 1e12: return { mode: "fraud", division_goal: 4, m_division: "RealEstate", prodMat: "RealEstate", prodMatSize: 20, employee_goal: 6, storage_goal: 12, speech_goal: 10, factory_goal: 0, dream_goal: 0, smart_goal: 10, stat_goal: 0, project_goal: 0, abc_goal: 10, adv_goal: 3, wilson_goal: 0 };
				default: return { mode: "fraud", division_goal: 1, m_division: "Software", prodMat: "AI Cores", prodMatSize: 1, employee_goal: 3, storage_goal: 8, speech_goal: 0, factory_goal: 0, dream_goal: 0, smart_goal: 7, stat_goal: 0, project_goal: 0, abc_goal: 0, adv_goal: 3, wilson_goal: 0 };
			}
			//} catch (err) { this.ExitError("GetData Error " + err) }
		}
		async WaitState(state, times = 1, onpoint = false) {
			this.ns.print("Wait State: " + state)
			for (let i = 0; i < times; i++) {
				while (this.CorpApi.getCorporation().state != state) { await this.ns.sleep(13); }
				if (onpoint) { while (this.CorpApi.getCorporation().state == state) { await this.ns.sleep(10) } }
			}
		}

		async Prep() {
			//try {
			this.ns.print("Prepping...")
			//try {
			while (this.CorpApi.getCorporation().divisions.length < this.data.division_goal) {
				const name = all_divisions[this.CorpApi.getCorporation().divisions.length]
				await this.CorpApi.expandIndustry(name, name);
			}
			for (const division of this.CorpApi.getCorporation().divisions) {
				while (this.CorpApi.getDivision(division.name).cities.length < cities.length) {
					for (let city of cities) {
						if (!this.CorpApi.getDivision(division.name).cities.includes(city)) {
							await this.CorpApi.expandCity(division.name, city);
						}
						if (this.CorpApi.hasWarehouse(division.name, city) == false) {
							await this.CorpApi.purchaseWarehouse(division.name, city);
						}
					}
				}
			}
			//} catch (err) { throw (" Error in Prep Phase 1 " + err) }

			//upgrades && unlocks
			//try {
			while (this.CorpApi.getUpgradeLevel("Smart Storage") < this.data.smart_goal) { await this.CorpApi.levelUpgrade("Smart Storage"); }
			while (this.CorpApi.getUpgradeLevel("Project Insight") < this.data.project_goal) { await this.CorpApi.levelUpgrade("Project Insight") }
			if (this.offer > 3e12 || this.Round >= 2) { while (this.CorpApi.getUpgradeLevel("Neural Accelerators") < this.data.stat_goal) { await this.CorpApi.levelUpgrade("Neural Accelerators") } }
			if (this.offer > 3e12 || this.Round >= 2) { while (this.CorpApi.getUpgradeLevel("Nuoptimal Nootropic Injector Implants") < this.data.stat_goal) { await this.CorpApi.levelUpgrade("Nuoptimal Nootropic Injector Implants") } }
			while (this.CorpApi.getUpgradeLevel("FocusWires") < this.data.stat_goal) { await this.CorpApi.levelUpgrade("FocusWires") }
			while (this.CorpApi.getUpgradeLevel("Speech Processor Implants") < this.data.speech_goal) { await this.CorpApi.levelUpgrade("Speech Processor Implants"); }
			while (this.CorpApi.getUpgradeLevel("Smart Factories") < this.data.factory_goal) { await this.CorpApi.levelUpgrade("Smart Factories"); }
			while (this.CorpApi.getUpgradeLevel("DreamSense") < this.data.dream_goal) { await this.CorpApi.levelUpgrade("DreamSense"); }
			while (this.CorpApi.getUpgradeLevel("ABC SalesBots") < this.data.abc_goal) { await this.CorpApi.levelUpgrade("ABC SalesBots"); }
			while (this.CorpApi.getUpgradeLevel("Wilson Analytics") < this.data.wilson_goal) { await this.CorpApi.levelUpgrade("Wilson Analytics") }


			if (this.Round > 0) { !this.CorpApi.hasUnlockUpgrade("Export") ? await this.CorpApi.unlockUpgrade("Export") : null; }
			//} catch (err) { throw (" Error in Prep Phase 2 " + err) }
			//try {
			for (const division of this.CorpApi.getCorporation().divisions) {

				//buy adverts !
				while (this.CorpApi.getHireAdVertCount(division.name) < this.data.adv_goal) { await this.CorpApi.hireAdVert(division.name); }
				//prep each city to goal
				for (let city of cities) {
					while (this.CorpApi.getWarehouse(division.name, city).level < this.data.storage_goal) { await this.CorpApi.upgradeWarehouse(division.name, city); }
					while (this.CorpApi.getOffice(division.name, city).size < this.data.employee_goal) { this.CorpApi.upgradeOfficeSize(division.name, city, 3); }
					while (this.CorpApi.getOffice(division.name, city).employees.length < this.CorpApi.getOffice(division.name, city).size) { await this.CorpApi.hireEmployee(division.name, city); this.hired = true; }
					if (division.name == this.data.m_division && !this.CorpApi.hasUnlockUpgrade("Smart Supply")) {
						this.CorpApi.buyMaterial(division.name, city, "Energy", 0.01)
						this.CorpApi.buyMaterial(division.name, city, "Hardware", 0.01)
						if (this.Round == 1) {
							this.CorpApi.buyMaterial(division.name, city, "Metal", 0.01)
							this.CorpApi.buyMaterial(division.name, city, "Water", 0.01)
						}
					}
					//set export if we have it
					if (this.CorpApi.hasUnlockUpgrade("Export") && division.name != this.data.m_division) { this.CorpApi.exportMaterial(this.data.m_division, cities[0], division.name, city, this.data.prodMat, 1) }
				}
			}
			//} catch (err) { throw (" Error in Prep Phase 2 " + err) }
			//try {
			if (this.Round == 1 && this.data.mode == "fraud") {
				this.CorpApi.upgradeOfficeSize(this.data.m_division, cities[0], 6);
				while (this.CorpApi.getOffice(this.data.m_division, cities[0]).employees.length < this.CorpApi.getOffice(this.data.m_division, cities[0]).size) { await this.CorpApi.hireEmployee(this.data.m_division, cities[0]); this.hired = true; }
			}
			if (this.Round == 2 && this.data.mode == "fraud") {
				for (let city of cities) {
					this.CorpApi.upgradeOfficeSize(this.data.m_division, city, 60);
					while (this.CorpApi.getOffice(this.data.m_division, city).employees.length < this.CorpApi.getOffice(this.data.m_division, city).size) { await this.CorpApi.hireEmployee(this.data.m_division, city); this.hired = true; }
				}
			}
			//} catch (err) { throw (" Error in Prep Phase 3 " + err) }
			//try {
			if (this.data.mode == "product") {
				if (!this.CorpApi.hasUnlockUpgrade("Smart Supply")) {
					this.CorpApi.unlockUpgrade("Smart Supply");
					for (let i = 0; i < cities.length; i++) {
						this.CorpApi.setSmartSupply(this.data.m_division, cities[i], true)
					}
				}
				let max = this.CorpApi.getCorporation().funds / 2
				let advert = 0;

				while (this.CorpApi.getDivision(this.data.m_division).popularity < 1e308 && advert < 10 * this.advMulti && this.CorpApi.getCorporation().funds > max) {
					while (this.CorpApi.getCorporation().funds / 2 > this.CorpApi.getUpgradeLevelCost("Wilson Analytics")) { await this.CorpApi.levelUpgrade("Wilson Analytics") }
					while (this.CorpApi.getCorporation().funds / 2 > this.CorpApi.getHireAdVertCost(this.data.m_division) && advert < 10) { await this.CorpApi.hireAdVert(this.data.m_division); advert++; await ns.sleep(2) }
					break;
				}
				max = this.CorpApi.getCorporation().funds / 2

				while (this.CorpApi.getCorporation().funds > max && this.CorpApi.getCorporation().funds / 2 > this.CorpApi.getOfficeSizeUpgradeCost(this.data.m_division, cities[0], 3) && this.CorpApi.getOffice(this.data.m_division, cities[0]).size < PRODUCT_CITY_MAX * this.empMulti) { await this.CorpApi.upgradeOfficeSize(this.data.m_division, cities[0], 3); }
				while (this.CorpApi.getOffice(this.data.m_division, cities[0]).employees.length < this.CorpApi.getOffice(this.data.m_division, cities[0]).size) {
					// eslint-disable-next-line no-empty
					try { await this.CorpApi.hireEmployee(this.data.m_division, cities[0]); this.hired = true; await ns.sleep(4) } catch { }
				}

				for (let i = 1; i < cities.length; i++) {
					while (this.CorpApi.getCorporation().funds / 2 > this.CorpApi.getOfficeSizeUpgradeCost(this.data.m_division, cities[i], 3) && this.CorpApi.getOffice(this.data.m_division, cities[i]).size < this.CorpApi.getOffice(this.data.m_division, cities[0]).size - Math.min(Math.floor(this.CorpApi.getOffice(this.data.m_division, cities[i]).size * 0.7), 60)) { await this.CorpApi.upgradeOfficeSize(this.data.m_division, cities[i], 3) }
					// eslint-disable-next-line no-empty
					while (this.CorpApi.getOffice(this.data.m_division, cities[i]).employees.length < this.CorpApi.getOffice(this.data.m_division, cities[i]).size) { try { await this.CorpApi.hireEmployee(this.data.m_division, cities[i]); this.hired = true } catch { } }
				}

				if (this.hired) { await this.Assign(1, 3) }
				max = this.CorpApi.getCorporation().funds / 2

				for (let i = 0; i < 100; i++) {
					for (let upgrade of upgrades) {
						if (this.CorpApi.getCorporation().funds > this.CorpApi.getUpgradeLevelCost(upgrade) && this.CorpApi.getCorporation().funds > max) { await this.CorpApi.levelUpgrade(upgrade) }
					}
				}
				if (this.CorpApi.getDivision(this.data.m_division).research > 5000 && !this.CorpApi.hasResearched(this.data.m_division, "Hi-Tech R&D Laboratory")) {
					this.CorpApi.research(this.data.m_division, "Hi-Tech R&D Laboratory")
				}
				if (this.CorpApi.getDivision(this.data.m_division).research > 150000 && !this.TA2 && this.firstproduct) {
					this.CorpApi.research(this.data.m_division, "Market-TA.I");
					this.CorpApi.research(this.data.m_division, "Market-TA.II");
					this.TA2 = true;
				}

				if (this.CorpApi.getDivision(this.data.m_division).research > 300000 && a_research.length > 0) {
					for (let i = 0; i < a_research.length; i++) {
						const t_research = a_research.shift()

						if (!this.CorpApi.hasResearched(this.data.m_division, t_research)) {
							if (this.CorpApi.getDivision(this.data.m_division).research > this.CorpApi.getResearchCost(this.data.m_division, t_research)) {
								this.CorpApi.research(this.data.m_division, t_research);
							} else { a_research.push(t_research) }

						}
					}

				} else if (this.CorpApi.getDivision(this.data.m_division).research > 500000 && b_research.length > 0) {
					for (let i = 0; i < b_research.length; i++) {
						const t_research = b_research.shift()

						if (!this.CorpApi.hasResearched(this.data.m_division, t_research)) {
							if (this.CorpApi.getDivision(this.data.m_division).research > this.CorpApi.getResearchCost(this.data.m_division, t_research)) {
								this.CorpApi.research(this.data.m_division, t_research);
							} else { b_research.push(t_research) }
						}
					}
				}
			}
			//} catch (err) { throw (" Error in Prep Product " + err) }
			//} catch (err) { throw ("Error in Prep" + err) }
		}

		async Party() {
			this.ns.print("PARTY!!!")
			if (this.Fraud) {
				for (const division of this.CorpApi.getCorporation().divisions) {
					if (this.data.mode == "product" && this.data.m_division == division.name) { continue }
					let k;
					if (this.Round >= 2) { k = 1 } else { k = 0 }
					for (let city of cities) {
						await this.CorpApi.setAutoJobAssignment(division.name, city, "Business", k);
						await this.CorpApi.setAutoJobAssignment(division.name, city, "Operations", k);
						await this.CorpApi.setAutoJobAssignment(division.name, city, "Engineer", k);
						await this.CorpApi.setAutoJobAssignment(division.name, city, "Management", k);
						await this.CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", this.CorpApi.getOffice(division.name, city).employees.length - (k * 4));
					}
				}
			}
			// eslint-disable-next-line no-constant-condition
			while (true) {
				let done = true
				for (const division of this.CorpApi.getCorporation().divisions) {
					if (this.data.mode == "product" && this.data.m_division != division.name) { continue }
					let d_mor = 100;
					let d_ene = 100;
					let d_hap = 100;
					for (let city of cities) {
						let m = 100;
						let e = 100;
						let h = 100;
						this.CorpApi.getOffice(division.name, city).employees.forEach(x => m = Math.min(m, this.CorpApi.getEmployee(division.name, city, x).mor));
						this.CorpApi.getOffice(division.name, city).employees.forEach(x => e = Math.min(e, this.CorpApi.getEmployee(division.name, city, x).ene));
						this.CorpApi.getOffice(division.name, city).employees.forEach(x => h = Math.min(h, this.CorpApi.getEmployee(division.name, city, x).hap));

						let party = 3e6 * (this.Round + 1);
						m > 99.8 && h > 99.8 ? party = 1e5 : null;
						m < 100 || h < 100 ? this.CorpApi.throwParty(division.name, city, party) : null;
						e < 100 ? this.CorpApi.buyCoffee(division.name, city) : null;

						d_mor = Math.min(d_mor, m);
						d_ene = Math.min(d_ene, e);
						d_hap = Math.min(d_hap, h);
					}
					Math.min(d_mor, d_ene, d_hap) < 99.9 ? done = false : null;
				}
				if (done) { break; }
				if (!done && this.data.mode == "product") { return }

				await this.WaitState("START", 1, true)
			}
			this.PartyTime = performance.now() + 60 * 1000;
			this.hired = false;
		}
		async Assign(index, weight = 1) {

			if (index == 1) {
				let mult = Math.ceil(this.CorpApi.getOffice(this.data.m_division, cities[0]).employees.length / 1000)
				let engi = Math.ceil(56 * mult * weight)
				let mng = Math.floor(44 * mult * weight)
				let rnd = this.CorpApi.getOffice(this.data.m_division, cities[0]).employees.length - engi - mng - 2
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Operations", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Engineer", engi);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Business", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Management", mng);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Research & Development", rnd);
			} else if (index == 2) {
				let engi = this.CorpApi.getOffice(this.data.m_division, cities[0]).employees.length / 3
				let mng = engi
				let rnd = mng - 2
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Operations", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Engineer", engi);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Business", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Management", mng);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Research & Development", rnd)

			} else if (index == 3) {
				let engi = this.CorpApi.getOffice(this.data.m_division, cities[0]).employees.length / 3
				let mng = engi
				let bus = mng - 1
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Operations", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Engineer", engi);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Business", bus);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Management", mng);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[0], "Research & Development", 0)
			}

			for (let i = 1; i < cities.length; i++) {
				if (cities[i] == "Aevum") { continue }

				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[i], "Operations", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[i], "Engineer", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[i], "Business", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[i], "Management", 1);
				await this.CorpApi.setAutoJobAssignment(this.data.m_division, cities[i], "Research & Development", this.CorpApi.getOffice(this.data.m_division, cities[i]).employees.length - 4)

			}

		}
		async ProductLoop() {
			let max = 3
			this.CorpApi.hasResearched(this.data.m_division, "uPgrade: Capacity.II") ? max = 5 : this.CorpApi.hasResearched(this.data.m_division, "uPgrade: Capacity.I") ? max = 4 : max = 3;
			this.TA2 = this.CorpApi.hasResearched(this.data.m_division, "Market-TA.II")
			if (this.products.length != this.CorpApi.getDivision(this.data.m_division).products.length) {

				for (let i = 0; i < this.products.length; i++) {
					this.products.shift()
				}

				for (let i = 0; i < this.CorpApi.getDivision(this.data.m_division).products.length; i++) {
					let t_product = this.CorpApi.getProduct(this.data.m_division, this.CorpApi.getDivision(this.data.m_division).products[i]);
					this.products.push({ name: t_product.name, prog: t_product.developmentProgress, max: this.data.productMin, min: this.data.productMin, invest: this.data.invest, time: 0 })
				}

			}

			if (this.products.length == 0) {
				let invest = Math.max(this.CorpApi.getCorporation().funds * 0.1, 100000000)
				await this.CorpApi.makeProduct(this.data.m_division, cities[0], 0, invest, invest)
				await this.CorpApi.makeProduct(this.data.m_division, cities[0], 1, invest, invest)
				this.products.push({ name: 0, prog: 0, max: this.data.productMin, min: this.data.productMin, invest: invest, time: 0 })
				this.products.push({ name: 1, prog: 0, max: this.data.productMin, min: this.data.productMin, invest: invest, time: 0 })

			}

			let currProduct = this.products.find(x => x.prog < 100)

			if (this.products.length == max && currProduct == undefined) {
				this.CorpApi.discontinueProduct(this.data.m_division, this.products[0].name)
				this.products.shift()
			}

			if (this.products.length < max) {
				const oldProduct = this.products[this.products.length - 1];
				const invest = this.CorpApi.getCorporation().funds * 0.1
				const name = parseInt(oldProduct.name) + 1
				this.CorpApi.makeProduct(this.data.m_division, cities[0], name, invest, invest)
				this.products.push({ name: name, prog: 0, max: this.data.productMin, min: this.productMin, invest: invest, time: 0 })
				currProduct == undefined ? currProduct = this.products[this.products.length - 1] : null;
			}

			for (let i = 0; i < this.products.length; i++) {

				const tmpProg = this.CorpApi.getProduct(this.data.m_division, this.products[i].name)

				const qty = tmpProg.cityData[cities[0]][0]
				const prod = tmpProg.cityData[cities[0]][1]
				const sell = tmpProg.cityData[cities[0]][2]
				this.products[i].prog = tmpProg.developmentProgress
				if (this.products[i].prog < 100) {
					if (this.products[i].time < 1 && this.products[i].time != 0) {
						this.products[i].time = performance.now() + ((1 - this.products[i].prog) / (this.products[i].prog - this.products[i].time) * 10000)
					} else if (this.products[i].time >= performance.now()) {
						this.products[i].time = this.products[i].prog
					}
				} else {
					if (!this.TA2) {
						//sell >= prod ? (this.products[i].min = this.products[i].max, this.products[i].max = this.products[i].max * 10) : sell < prod ? this.products[i].max = this.products[i].max - (this.products[i].max - this.products[i].min) / 2 : null;
						this.CorpApi.sellProduct(this.data.m_division, cities[0], this.products[i].name, "MAX", "MP", true)
					} else {
						if (qty > prod * 10) {
							this.CorpApi.sellProduct(this.data.m_division, cities[0], this.products[i].name, "MAX", "MP", true)
							this.CorpApi.setProductMarketTA2(this.data.m_division, this.products[i].name, false)
							this.CorpApi.setProductMarketTA1(this.data.m_division, this.products[i].name, true)
						} else {
							this.CorpApi.sellProduct(this.data.m_division, cities[0], this.products[i].name, "MAX", "MP", true)
							this.CorpApi.setProductMarketTA2(this.data.m_division, this.products[i].name, true)
						}
					}
				}
			}
		}

		async TakeOffer() {
			this.ns.print("Taking Offer *.*");

			while (this.Round == 1 && this.CorpApi.getCorporation().funds - this.CorpApi.getUpgradeLevelCost("Smart Storage") > this.CorpApi.getExpandIndustryCost(all_divisions[this.CorpApi.getCorporation().divisions.length])) { await this.CorpApi.levelUpgrade("Smart Storage"); }
			while (this.Round == 2 && this.CorpApi.getCorporation().funds - this.CorpApi.getUpgradeLevelCost("Smart Storage") > 1e12) { await this.CorpApi.levelUpgrade("Smart Storage"); }
			if (this.Round == 3) {
				// eslint-disable-next-line no-empty
				try { this.CorpApi.research(this.data.m_division, "Market-TA.I"); } catch { }
				// eslint-disable-next-line no-empty
				try { this.CorpApi.research(this.data.m_division, "Market-TA.II"); } catch { }
				for (let i = 0; i < this.products.length; i++) {
					if (this.products[i].prog < 100) { continue }
					this.CorpApi.hasResearched(this.data.m_division, "Market-TA.II") ? this.CorpApi.setProductMarketTA2(this.data.m_division, this.products[i].name, false) : null;
					this.CorpApi.sellProduct(this.data.m_division, cities[0], this.products[i].name, "MAX", "MP", true)
					this.CorpApi.hasResearched(this.data.m_division, "Market-TA.II") ? this.CorpApi.setProductMarketTA2(this.data.m_division, this.products[i].name, true) : null;
				}

			}
			for (const division of this.CorpApi.getCorporation().divisions) {
				if (this.Round == 3 && division.name == this.data.m_division && this.data.mode == "product") { continue }
				for (const city of cities) {
					this.CorpApi.sellMaterial(division.name, city, this.data.prodMat, 0, "MP")
					const freeSpace = 5;
					const amt = (this.CorpApi.getWarehouse(division.name, city).size - this.CorpApi.getWarehouse(division.name, city).sizeUsed - freeSpace) * this.data.prodMatSize;
					this.CorpApi.buyMaterial(division.name, city, this.data.prodMat, amt);
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", 0);
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Engineer", this.CorpApi.getOffice(division.name, city).employees.length);
				}
			}
			//wait for stock
			await this.WaitState("PURCHASE", 1, true)
			//reset buys to 0
			for (const division of this.CorpApi.getCorporation().divisions) { for (let city of cities) { this.CorpApi.buyMaterial(division.name, city, this.data.prodMat, 0) } }
			//set employees for fraud
			for (const division of this.CorpApi.getCorporation().divisions) {
				if (this.Round == 3 && division.name == this.data.m_division && this.data.mode == "product") { await this.Assign(3, 2); continue }
				for (let city of cities) {
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", 0);
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Operations", 0);
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Engineer", 0);
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Management", 0);
					await this.CorpApi.setAutoJobAssignment(division.name, city, "Business", this.CorpApi.getOffice(division.name, city).employees.length);
				}
			}
			await this.WaitState("EXPORT")
			for (const division of this.CorpApi.getCorporation().divisions) {
				if (this.Round == 3 && division.name == this.data.m_division && this.data.mode == "product") { await this.Assign(3, 2); continue }
				for (const city of cities) {
					//let price = Round > 0 ? MatPrice(division.name, city) : "MP"
					this.CorpApi.sellMaterial(division.name, city, this.data.prodMat, "MAX", "MP");
				}
			}
			if (this.CorpApi.getCorporation().divisions.length < 14 && this.CorpApi.getCorporation().funds > this.CorpApi.getExpandIndustryCost(all_divisions[this.CorpApi.getCorporation().divisions.length])) { this.CorpApi.expandIndustry(all_divisions[this.CorpApi.getCorporation().divisions.length], all_divisions[this.CorpApi.getCorporation().divisions.length]) }

			await this.WaitState("START", 5, true)

			try {
				this.offer = this.CorpApi.getInvestmentOffer().funds;
				await this.CorpApi.acceptInvestmentOffer();
				this.Round += 1
				this.Analyze(0);
			} catch (err) {
				this.ExitError("Taking Offer Error" + err)
			}
		}

		Analyze(mode) {
			const end = this.ns.getPlayer().playtimeSinceLastBitnode;
			const runtime = this.ns.tFormat(end - start);
			let result;
			switch (mode) {
				case 0:
					result = this.Round + ": " + this.FormatMoney(this.offer, 3, 1) + " after " + runtime;
					this.Round == 1 ? this.ns.write(analyzefile, "\n" + result, "a") : this.ns.write(analyzefile, " " + result, "a");
					this.ns.tprint(result); break;
				case 1:
					result = "Public after: " + runtime;
					this.ns.write(analyzefile, " " + result, "a");
					this.ns.tprint(result); break;
				case 2:
					result = "First Product at: " + runtime;
					this.ns.write(analyzefile, " " + result, "a");
					this.ns.tprint(result); break;
				case 3:
					result = "e30 : " + runtime;
					this.ns.write(analyzefile, " " + result, "a");
					this.ns.tprint(result); break;
				case 4:
					result = "e70 : " + runtime;
					this.ns.write(analyzefile, " " + result, "a");
					this.ns.tprint(result); break;
				case 5:
					result = "e100 : " + runtime;
					this.ns.write(analyzefile, " " + result, "a");
					this.ns.tprint(result); break;
				default:
					this.ExitError("No Mode Set?"); break;

			}
		}
		//from https://github.com/alainbryden/bitburner-scripts/blob/main/helpers.js
		FormatMoney(num, maxSignificantFigures = 6, maxDecimalPlaces = 3) {
			let numberShort = this.formatNumberShort(num, maxSignificantFigures, maxDecimalPlaces);
			return num >= 0 ? "$" + numberShort : numberShort.replace("-", "-$");
		}
		formatNumberShort(num, maxSignificantFigures = 6, maxDecimalPlaces = 3) {
			const symbols = ["", "k", "m", "b", "t", "q", "Q", "s", "S", "o", "n", "e33", "e36", "e39"];
			if (Math.abs(num) > 10 ** (3 * symbols.length)) // If we've exceeded our max symbol, switch to exponential notation
				return num.toExponential(Math.min(maxDecimalPlaces, maxSignificantFigures - 1));
			for (var i = 0, sign = Math.sign(num), num = Math.abs(num); num >= 1000 && i < symbols.length; i++)
				num /= 1000;
			// TODO: A number like 9.999 once rounded to show 3 sig figs, will become 10.00, which is now 4 sig figs.
			return ((sign < 0) ? "-" : "") + num.toFixed(Math.max(0, Math.min(maxDecimalPlaces, maxSignificantFigures - Math.floor(1 + Math.log10(num))))) + symbols[i];
		}
		ExitError(err) {
			this.ns.tprint("WARN: " + err)
			this.ns.exit()
		}
		async CreateCorp() {
			if (PLAYER.bitNodeN == 3) {
				this.CorpApi.createCorporation("corp", false);
			} else {
				while (this.ns.getPlayer().money < 15e+10) {
					this.ns.clearLog();
					this.ns.print("Waiting for Money to create Corp");
					await this.ns.sleep(30 * 1000);
				}
				this.CorpApi.createCorporation("corp", true);
			}
		}
	}
	let corp = new Corp(ns);
	await corp.Initialize(ns)

}