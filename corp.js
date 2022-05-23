import { ColorPrint } from 'hack-once.js';

const CITIES = [
	'Aevum',
	'Sector-12',
	'Volhaven',
	'Chongqing',
	'New Tokyo',
	'Ishima'
];

let corpapi;

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	corpapi = eval('ns.corporation');

	let [count, mainCount, divisionIndex, doIt] = ns.args;

	if (count == 'fraud') {
		if (mainCount == 'fraud') {
			ns.tprint('FAIL: THIS IS THE REAL DEAL NOT A DRY RUN');
		}

		let corp = corpapi.getCorporation();

		// *** INITIAL OFFER ***
		let offer = corpapi.getInvestmentOffer();
		let prevOffer = offer;
		ns.tprint('WARN: Initial offer is ' + ns.nFormat(offer.funds, '$0.00a'));

		// *** DROP INVENTORY SOME ***
		ns.tprint('INFO: Lowering stocks');
		await SetSales(ns, corp.divisions[0], SALE_MODES.EMPTY);
		while (true) {
			let storage = await GetStorageInfo(ns, corp.divisions[0]);
			if (storage.sizeUsed <= storage.size * 0.6) {
				await SetSales(ns, corp.divisions[0], SALE_MODES.NORMAL);
				ns.tprint('WARN: Inventory near empty!');
				break;
			}

			ns.tprint('INFO: Waiting for storage to empty ' + storage.sizeUsed + ' / ' + storage.size);
			await ns.sleep(1000);
		}

		// *** STOCK UP ***
		ns.tprint('WARN: Freezing sales in preparation of fraud');
		await SetSales(ns, corp.divisions[0], SALE_MODES.FREEZE);
		while (true) {
			let storage = await GetStorageInfo(ns, corp.divisions[0]);
			if (storage.sizeUsed >= storage.size * 0.99) {
				ns.tprint('WARN: Inventory full!');
				break;
			}

			ns.tprint('INFO: Waiting for storage to fill ' + storage.sizeUsed + ' / ' + storage.size);
			await ns.sleep(1000);
		}
		await SetSales(ns, corp.divisions[0], SALE_MODES.FRAUD);

		// *** FISH FOR A BETTER OFFER ***
		while (true) {
			offer = corpapi.getInvestmentOffer();

			let storage = await GetStorageInfo(ns, corp.divisions[0]);
			ns.tprint('INFO: Waiting for storage to empty ' + storage.sizeUsed + ' / ' + storage.size + ' current offer: ' + ns.nFormat(offer.funds, '$0.00a'));

			if (offer.funds > prevOffer.funds * 3) {
				if (mainCount == 'fraud') {
					ns.tprint('FAIL: Accepting current offer: ' + ns.nFormat(offer.funds, '$0.00a'));
					corpapi.acceptInvestmentOffer();
				}
				else {
					ns.tprint('FAIL: Best offer was: ' + ns.nFormat(offer.funds, '$0.00a'));
				}

				await SetSales(ns, corp.divisions[0], SALE_MODES.NORMAL);
				return;
			}
			prevOffer = offer;

			//corpapi.getUpgradeWarehouseCost())

			if (storage.sizeUsed <= storage.size * 0.6) {
				await SetSales(ns, corp.divisions[0], SALE_MODES.NORMAL);
				ns.tprint('WARN: Inventory near empty!');
				break;
			}

			await ns.sleep(1000);
		}

		return;
	}

	if (count == undefined) count = 3;
	if (mainCount == undefined) mainCount = 6;
	if (divisionIndex == undefined) divisionIndex = 0;
	if (doIt == undefined) doIt = false;

	// // Check if we have a corp
	let corp = undefined;

	// Try to find existing corp	
	try {
		ColorPrint('white', 'Getting corporation info');
		corp = corpapi.getCorporation();
	}
	catch {
		ColorPrint('orange', 'Exception getting corp, probably because we don\'t have one yet');
	}

	// // Create corp if we do not have one
	// if (corp == undefined) {
	// 	ColorPrint('green', 'Creating corporation');
	// 	if (corpapi.createCorporation('ACME', false)) {
	// 		ColorPrint('lightgreen', 'Created corporation using government money');
	// 	}
	// 	else if (corpapi.createCorporation('ACME', true)) {
	// 		ColorPrint('green', 'Created corporation using our own funds');
	// 	}
	// 	else {
	// 		ColorPrint('red', 'Error creating corporation');
	// 	}

	// 	// Try to find existing corp again now that we probably created one
	// 	try {
	// 		ColorPrint('yellow', 'Getting new corporation info');
	// 		corp = corpapi.getCorporation();
	// 	}
	// 	catch {
	// 		ColorPrint('red', 'Exception getting new corp, not enough funds I guess?');
	// 	}
	// }

	ColorPrint('');
	ColorPrint('white', 'Corporation info:');
	for (let key of Object.keys(corp)) {
		ColorPrint('white', key + ': ' + corp[key]);
	}

	// // Check divisions
	// if (corp.divisions.length == 0) {
	// 	//corpapi.expandIndustry('Agriculture', 'ACME Farms');
	// 	corp = corpapi.getCorporation();
	// 	ColorPrint('green', 'Created new division: ' + corp.divisions[0].name);
	// }
	// if (corp.divisions.length == 0) {
	// 	ColorPrint('red', 'Could not create division?! Aborting');
	// 	return;
	// }

	await UpgradeOfficesAndHire(ns, corp.divisions[divisionIndex].name, 'Sector-12', count, mainCount, !doIt);


	// for (let division of corp.divisions) {
	// 	ColorPrint('');
	// 	ColorPrint('white', 'Division info:');
	// 	for (let key of Object.keys(division)) {
	// 		ColorPrint('white', key + ': ' + division[key]);
	// 	}

	// 	//await UpgradeOfficesAndHire(ns, division.name, 'Sector-12', count, mainCount, !doIt);
	// }
}

/*
assignJob(divisionName, cityName, employeeName, job)			// Assign an employee to a job.
buyCoffee(divisionName, cityName)								// Buy coffee for your employees
getEmployee(divisionName, cityName, employeeName)				// Get data about an employee
getHireAdVertCost(divisionName)									// Get the cost to Hire AdVert
getHireAdVertCount(adivisionName)								// Get the number of times you have Hired AdVert
getOffice(divisionName, cityName)								// Get data about an office
getOfficeSizeUpgradeCost(divisionName, cityName, asize)			// Cost to Upgrade office size.
getResearchCost(divisionName, researchName)						// Get the cost to unlock research
hasResearched(divisionName, researchName)						// Gets if you have unlocked a research
hireAdVert(divisionName)										// Hire AdVert.
hireEmployee(divisionName, cityName)							// Hire an employee.
research(divisionName, researchName)							// Purchase a research
setAutoJobAssignment(divisionName, cityName, job, amount)		// Set the auto job assignment for a job
throwParty(divisionName, cityName, costPerEmployee)				// Throw a party for your employees
upgradeOfficeSize(divisionName, cityName, size)					// Upgrade office size.
*/


async function UpgradeOfficesAndHire(ns, division, mainCity, targetEmployeeCount, mainCount, dryRun = true) {
	let totalCost = 0;

	for (const city of CITIES) {
		ColorPrint('yellow', division, 'white', ' in ', 'yellow', city, 'white', ':');

		if (city == mainCity) {
			// 	// Upgrade main office?
			// 	continue;
		}

		let office = undefined;

		try {
			office = corpapi.getOffice(division, city);
		}
		catch {
			let cost = corpapi.getExpandCityCost() + corpapi.getPurchaseWarehouseCost();
			ColorPrint('Red', '    No office in ', 'yellow', city, 'white', ' cost of expansion would be ', 'orange', ns.nFormat(cost, '$0.00a'));
			totalCost += cost;

			if (!dryRun) {
				corpapi.expandCity(division, city);
				corpapi.purchaseWarehouse(division, city);

				// Update
				office = corpapi.getOffice(division, city);
			}

			continue;
		}
		ColorPrint('white', '    Current: ', 'yellow', office.size, 'white', ' employees');


		let missing = Math.ceil((city == mainCity ? mainCount : targetEmployeeCount) - office.size);
		if (missing > 0) {
			ColorPrint('white', '    Target:  ', 'yellow', office.size + missing, 'white', ' employees');
			ColorPrint('white', '    Missing: ', 'red', missing, 'white', ' employees');

			let cost = corpapi.getOfficeSizeUpgradeCost(division, city, missing);
			totalCost += cost;
			ColorPrint('white', '    Cost:    ', 'orange', ns.nFormat(cost, '$0.00a'));

			if (!dryRun) {
				ColorPrint('white', '    Upgrading ', 'yellow', city, 'white', ' office space to ', 'lightgreen', office.size + missing);
				corpapi.upgradeOfficeSize(division, city, missing);

				await HireEmployees(ns, division, city);
				await DistributeEmployees(ns, division, city, mainCity)
				//upgraded = true;

				// const office = corpapi.getOffice(division, city);
				// corpapi.hireEmployee(division, city)
				// corpapi.getEmployee(division, city, employee)
				// corpapi.assignJob(division, city, employee, job)
				// corpapi.setAutoJobAssignment(division, city, job, amount)	
			}
		}
	}

	ColorPrint('white', 'TOTAL COST:    ', 'orange', ns.nFormat(totalCost, '$0.00a'));

	let corp = corpapi.getCorporation();
	ColorPrint('white', 'CORP FUNDS:    ', 'orange', ns.nFormat(corp.funds, '$0.00a'));
}

async function HireEmployees(ns, division, city) {
	const office = corpapi.getOffice(division, city);
	let missing = office.size - office.employees.length;
	for (let i = 0; i < missing; i++) {
		let emp = corpapi.hireEmployee(division, city);
		ColorPrint('white', '    Hired employee:  ', 'yellow', emp.name, 'white', ' city: ', 'yellow', city);
	}
}

async function DistributeEmployees(ns, division, city, mainCity) {
	const office = corpapi.getOffice(division, city);

	let assignments = [];
	let jobIndex = 0;

	for (let empName of office.employees) {
		let emp = corpapi.getEmployee(division, city, empName);

		if (emp.pos == 'Unassigned') {
			let newJob = 'Research & Development';
			if (assignments.length > 0) {
				if (jobIndex > assignments.length - 1) jobIndex = 0;
				newJob = assignments[jobIndex].pos;
				jobIndex++;
			}
			await corpapi.assignJob(division, city, emp.name, newJob);
			ColorPrint('white', '    Employee:  ', 'yellow', emp.name, 'white', ' new job: ', 'orange', newJob);
		}
		else {
			let entry = assignments.find(p => p.pos == emp.pos);
			if (entry == undefined) {
				entry = {};
				entry.pos = emp.pos;
				entry.count = 1;
				assignments.push(entry);
			}
			else {
				entry.count++;
			}

			ColorPrint('white', '    Employee:  ', 'yellow', emp.name, 'white', ' current job: ', 'yellow', emp.pos);
		}

		await ns.sleep(0);
	}
}

// buyMaterial(divisionName, cityName, materialName, amt)													Set material buy data
// cancelExportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)			Cancel material export
// discontinueProduct(divisionName, productName)															Discontinue a product.
// exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)				Set material export data
// getMaterial(divisionName, cityName, materialName)														Get material data
// getProduct(divisionName, productName)																	Get product data
// getPurchaseWarehouseCost()																				Gets the cost to purchase a warehouse
// getUpgradeWarehouseCost(adivisionName, acityName)														Gets the cost to upgrade a warehouse to the next level
// getWarehouse(divisionName, cityName)																		Get warehouse data
// hasWarehouse(adivisionName, acityName)																	Check if you have a warehouse in city
// makeProduct(divisionName, cityName, productName, designInvest, marketingInvest)							Create a new product
// purchaseWarehouse(divisionName, cityName)																Purchase warehouse for a new city
// sellMaterial(divisionName, cityName, materialName, amt, price)											Set material sell data.
// sellProduct(divisionName, cityName, productName, amt, price, all)										Set product sell data.
// setMaterialMarketTA1(divisionName, cityName, materialName, on)											Set market TA 1 for a material.
// setMaterialMarketTA2(divisionName, cityName, materialName, on)											Set market TA 2 for a material.
// setProductMarketTA1(divisionName, productName, on)														Set market TA 1 for a product.
// setProductMarketTA2(divisionName, productName, on)														Set market TA 2 for a product.
// setSmartSupply(divisionName, cityName, enabled)															Set smart supply
// upgradeWarehouse(divisionName, cityName)																	Upgrade warehouse

const SALE_MODES = {
	FREEZE: 1,
	FRAUD: 2,
	EMPTY: 3,
	NORMAL: 4
	//SELL,
};

const DIVISION_MATERIAL_PRODUCTS = {
	Agriculture: ['Plants', 'Food'],
	Software: ['AI Cores']
}

async function GetStorageInfo(ns, division) {
	let size = 0;
	let sizeUsed = 0;

	for (let city of CITIES) {
		try {
			let wh = corpapi.getWarehouse(division.name, city);
			size += wh.size;
			sizeUsed += wh.sizeUsed;
		}
		catch {
			ns.tprint('Could not get access to warehouse for ' + city);
		}
	}

	return { size: size, sizeUsed: sizeUsed };
}

async function SetSales(ns, division, saleMode) {
	let matProducts = DIVISION_MATERIAL_PRODUCTS[division.type];
	if (matProducts == undefined) {
		ns.tprint('Could not find material product information for division type: ' + division.type);
		return;
	}
	let products = division.products;

	for (let city of CITIES) {
		// *** MATERIAL PRODUCTS ***
		for (let i = 0; i < matProducts.length; i++) {
			switch (saleMode) {
				case SALE_MODES.FREEZE:
					corpapi.sellMaterial(division.name, city, matProducts[i], '0', 'MP*10000', false);
					break;
				case SALE_MODES.NORMAL:
					corpapi.sellMaterial(division.name, city, matProducts[i], 'MAX', 'MP*22.5', false);
					break;
				case SALE_MODES.EMPTY:
					corpapi.sellMaterial(division.name, city, matProducts[i], 'MAX', 'MP*15', false);
					break;
				case SALE_MODES.FRAUD:
					corpapi.sellMaterial(division.name, city, matProducts[i], 'MAX', 'MP*20', false);
					break;
			}
		}

		// *** PRODUCTS ***
		for (let i = 0; i < products.length; i++) {
			switch (saleMode) {
				case SALE_MODES.FREEZE:
					corpapi.sellProduct(division.name, city, products[i], '0', 'MP*10000', false);
					break;
				case SALE_MODES.NORMAL:
					corpapi.sellProduct(division.name, city, products[i], 'MAX', 'MP', false);
					break;
				case SALE_MODES.EMPTY:
					corpapi.sellProduct(division.name, city, products[i], 'MAX', 'MP*0.75', false);
					break;
				case SALE_MODES.FRAUD:
					corpapi.sellProduct(division.name, city, products[i], 'MAX', 'MP', false);
					break;
			}
		}
	}
}