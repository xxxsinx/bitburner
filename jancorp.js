/** @param {NS} ns **/
export async function main(ns) {

	ns.tail()
	ns.disableLog('sleep')

	const cities = ['Aevum', 'Chongqing', 'Sector-12', 'New Tokyo', 'Ishima', 'Volhaven']
	const divisionNames = ['Energy', 'Water Utilities', 'Agriculture', 'Fishing', 'Mining', 'Food', 'Tobacco', 'Chemical', 'Pharmaceutical', 'Computer Hardware', 'Robotics', 'Software', 'RealEstate']
	const divisionNamesCode = ['Energy', 'Utilities', 'Agriculture', 'Fishing', 'Mining', 'Food', 'Tobacco', 'Chemical', 'Pharmaceutical', 'Computer', 'Robotics', 'Software', 'RealEstate']
	const jobs = ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development', 'Training', 'Unassigned']
	const upgrades = ['Smart Factories', 'Smart Storage', 'DreamSense', 'Wilson Analytics', 'Nuoptimal Nootropic Injector Implants', 'Speech Processor Implants', 'Neural Accelerators', 'FocusWires', 'ABC SalesBots', 'Project Insight']

	let corpdata = ns.corporation.getCorporation()
	const newCities = ['Aevum', 'Chongqing', 'New Tokyo', 'Ishima', 'Volhaven']
	const usefuljobs = ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development']
	const workingresearchjobs = ['Operations', 'Engineer', 'Business', 'Management', ...Array(11).fill('Research & Development')]

	let firstoffer = 3e12
	let secondoffer = 300e12


	let workingdivisions = divisionNames[5]
	let researchcity = 'Aevum'
	let researchworkdistribution = ['Engineer', 'Management', 'Management', 'Management']

	ns.corporation.expandIndustry(workingdivisions, workingdivisions)
	ns.corporation.unlockUpgrade('Smart Supply')

	for (let ii in upgrades) {
		if (ns.corporation.getUpgradeLevel(upgrades[ii]) > 0) {
			continue
		}
		if (['Wilson Analytics', 'Project Insight'].includes(upgrades[ii])) {
			continue
		}
		ns.corporation.levelUpgrade(upgrades[ii])
	}

	for (let ii in newCities) {
		ns.corporation.expandCity(workingdivisions, newCities[ii])
		ns.corporation.purchaseWarehouse(workingdivisions, newCities[ii])
	}

	for (let ii in cities) {
		let escape = 0
		let warehouseinfo = ns.corporation.getWarehouse(workingdivisions, cities[ii])
		while (warehouseinfo['size'] <= 300 && escape <= 2) {
			ns.corporation.upgradeWarehouse(workingdivisions, cities[ii])
			warehouseinfo = ns.corporation.getWarehouse(workingdivisions, cities[ii])
			await ns.sleep(10)
			escape++
		}

		ns.corporation.setSmartSupply(workingdivisions, cities[ii], true)
		if (ns.corporation.getOffice(workingdivisions, cities[ii]).size == 3) {
			ns.corporation.upgradeOfficeSize(workingdivisions, cities[ii], 3)
		}
		while (ns.corporation.getOffice(workingdivisions, cities[ii]).employees.length < ns.corporation.getOffice(workingdivisions, cities[ii]).size) {
			ns.corporation.hireEmployee(workingdivisions, cities[ii])
			await ns.sleep(10)
		}
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		if (cities[ii] == researchcity) {
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], researchworkdistribution[jj % 4])
			}
		} else {
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[4])
			}
		}
	}

	// Develop first product
	ns.corporation.makeProduct(workingdivisions, researchcity, 'Prod-1', ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
	ns.corporation.makeProduct(workingdivisions, researchcity, 'Prod-2', ns.corporation.getCorporation().funds / 10, ns.corporation.getCorporation().funds / 10)
	ns.corporation.makeProduct(workingdivisions, researchcity, 'Prod-3', ns.corporation.getCorporation().funds / 5, ns.corporation.getCorporation().funds / 5)

	// buy production materials
	for (let ii in cities) {
		if (ns.corporation.getWarehouse(workingdivisions, cities[ii]).size >= 300) {
			let storedrobots = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Robots')
			let storedhardware = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Hardware')
			let storedaiCores = ns.corporation.getMaterial(workingdivisions, cities[ii], 'AI Cores')
			let storedRealEstate = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Real Estate')

			while (storedrobots['qty'] < 0) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Robots', (0 - storedrobots['qty']) / 10)
				storedrobots = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Robots')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Robots', 0)

			while (storedhardware['qty'] < 967) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Hardware', (967 - storedhardware['qty']) / 10)
				storedhardware = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Hardware')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Hardware', 0)

			while (storedaiCores['qty'] < 1396) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'AI Cores', (1396 - storedaiCores['qty']) / 10)
				storedaiCores = ns.corporation.getMaterial(workingdivisions, cities[ii], 'AI Cores')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'AI Cores', 0)

			while (storedRealEstate['qty'] < 476) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Real Estate', (476 - storedRealEstate['qty']) / 10)
				storedRealEstate = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Real Estate')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Real Estate', 0)
		} else {
			ns.alert('Unable to Buy first round of production material; Warehouse Capacity too low.')
		}
	}

	while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0]).developmentProgress < 100) {
		ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0]).developmentProgress)
		await ns.sleep(15000)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[0], 'MAX', 'MP', true)

	while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[1]).developmentProgress < 100) {
		ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[1]).developmentProgress)
		await ns.sleep(15000)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[1], 'MAX', 'MP', true)

	while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[2]).developmentProgress < 100) {
		ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[2]).developmentProgress)
		await ns.sleep(15000)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[2], 'MAX', 'MP', true)


	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		for (let jj in employees) {
			await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[jj % 5])
		}
	}
	ns.print('Stockpiling Product')
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[0], 'PROD*0.1', 'MP', true)
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[1], 'PROD*0.1', 'MP', true)
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[2], 'PROD*0.1', 'MP', true)


	for (let ii in cities) {
		while (ns.corporation.getWarehouse(workingdivisions, cities[ii]).sizeUsed < ns.corporation.getWarehouse(workingdivisions, cities[ii]).size * 0.8) {
			await ns.sleep(15000)
		}
	}
	for (let ii in cities) {
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'Robots', 'MAX', 0)
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'Hardware', 'MAX', 0)
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'AI Cores', 'MAX', 0)
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'Real Estate', 'MAX', 0)
	}
	while (ns.corporation.getMaterial(workingdivisions, cities[0], 'Real Estate').qty > 0) {
		ns.print('Waiting to sell Material')
		await ns.sleep(60000)
	}
	for (let ii in cities) {
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'Robots', 0, 0)
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'Hardware', 0, 0)
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'AI Cores', 0, 0)
		ns.corporation.sellMaterial(workingdivisions, cities[ii], 'Real Estate', 0, 0)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[0], 0, 0, true)
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[1], 0, 0, true)
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[2], 0, 0, true)

	//	// Store up max product
	while (true) {
		for (let ii in cities) {
			while (ns.corporation.getWarehouse(workingdivisions, cities[ii]).sizeUsed < ns.corporation.getWarehouse(workingdivisions, cities[ii]).size * 0.99) {
				ns.print('Awaiting for max Warehouse: ' + cities[ii])
				await ns.sleep(60000)
			}
		}
		for (let ii in cities) {
			let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], 'Business')
			}
		}

		while (ns.corporation.getCorporation().state != 'START') {
			ns.print('Awaiting Start')
			await ns.sleep(100)
		}
		while (ns.corporation.getCorporation().state == 'START') {
			ns.print('Awaiting Start to End')
			await ns.sleep(100)
		}
		ns.print('Selling Product')
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[0], 'MAX', 'MP', true)
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[1], 'MAX', 'MP', true)
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[2], 'MAX', 'MP', true)

		ns.print('Awaiting Start')
		while (ns.corporation.getCorporation().state != 'START') {

			await ns.sleep(10)
		}
		ns.print('Awaiting Start to End')
		while (ns.corporation.getCorporation().state == 'START') {
			await ns.sleep(10)
		}
		ns.print('Start has ended.')
		while ((ns.corporation.getCorporation().state != 'START') && (ns.corporation.getInvestmentOffer().round == 1)) {
			ns.print(ns.corporation.getInvestmentOffer().funds)
			ns.print(firstoffer * ns.getBitNodeMultipliers()['CorporationValuation'])
			ns.print(ns.corporation.getInvestmentOffer().funds >= (firstoffer * ns.getBitNodeMultipliers()['CorporationValuation']))
			if (ns.corporation.getInvestmentOffer().funds >= firstoffer * ns.getBitNodeMultipliers()['CorporationValuation']) {
				ns.corporation.acceptInvestmentOffer()
				break
			}
			await ns.sleep(100)
		}
		if (ns.corporation.getInvestmentOffer().round == 2) {
			break
		}
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[0], 0, 0, true)
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[1], 0, 0, true)
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[2], 0, 0, true)

		for (let ii in cities) {
			let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[jj % 5])
			}
		}
		await ns.sleep(100)
	}

	//	// Got first funding round
	//	// Now to spend it

	//	// upgrade to 20 for the employee upgrades
	//	// upgrade to 10 for the others
	//	// ignore Wilson for now

	for (let ii in upgrades) {
		let upgradelevel = 0
		switch (upgrades[ii]) {
			case 'Nuoptimal Nootropic Injector Implants':
				upgradelevel = 20;
				break
			case 'Speech Processor Implants':
				upgradelevel = 20;
				break
			case 'Neural Accelerators':
				upgradelevel = 20;
				break
			case 'FocusWires':
				upgradelevel = 20;
				break
			case 'Smart Factories':
				upgradelevel = 10;
				break
			case 'Smart Storage':
				upgradelevel = 10;
				break
			case 'DreamSense':
				upgradelevel = 10;
				break
			case 'ABC SalesBots':
				upgradelevel = 10;
				break
			case 'Project Insight':
				upgradelevel = 10;
				break
			case 'Wilson Analytics':
				upgradelevel = 0;
				break
		}
		while (ns.corporation.getUpgradeLevel(upgrades[ii]) < upgradelevel) {
			ns.corporation.levelUpgrade(upgrades[ii])
		}
	}

	// upgrade warehouses to 1600
	// upgrade employees to 60
	for (let ii in cities) {
		while (ns.corporation.getOffice(workingdivisions, cities[ii]).size < 60) {
			while (ns.corporation.getCorporation.funds < ns.corporation.getOfficeSizeUpgradeCost(workingdivisions, cities[ii], 3)) {
				await ns.sleep(1000)
			}
			ns.corporation.upgradeOfficeSize(workingdivisions, cities[ii], 3)
			await ns.sleep(10)
		}
		while (ns.corporation.getOffice(workingdivisions, cities[ii]).employees.length < ns.corporation.getOffice(workingdivisions, cities[ii]).size) {
			ns.corporation.hireEmployee(workingdivisions, cities[ii])
			await ns.sleep(10)
		}
	}
	for (let ii in cities) {
		while (ns.corporation.getWarehouse(workingdivisions, cities[ii]).size <= 1600) {
			ns.corporation.upgradeWarehouse(workingdivisions, cities[ii])
			await ns.sleep(10)
		}
	}

	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		for (let jj in employees) {
			await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], workingresearchjobs[jj % 15])
		}
	}

	//		// for remaining money 
	//	//  cycle through employee upgrades 2x
	//		// cycle through production, storage, research upgrades 1x

	escape = 0
	while ((ns.corporation.getCorporation().funds > ns.corporation.getUpgradeLevelCost('FocusWires')) && (escape == 0)) {
		for (let ii in upgrades) {
			let upgradelevel = 0
			switch (upgrades[ii]) {
				case 'Nuoptimal Nootropic Injector Implants':
					upgradelevel = 2;
					break
				case 'Speech Processor Implants':
					upgradelevel = 2;
					break
				case 'Neural Accelerators':
					upgradelevel = 2;
					break
				case 'FocusWires':
					upgradelevel = 2;
					break
				case 'Smart Factories':
					upgradelevel = 1;
					break
				case 'Smart Storage':
					upgradelevel = 1;
					break
				case 'Project Insight':
					upgradelevel = 1;
					break
				case 'Wilson Analytics':
					upgradelevel = 0;
					break
				case 'DreamSense':
					upgradelevel = 0;
					break
				case 'ABC SalesBots':
					upgradelevel = 1;
					break
			}
			let testcondition = 0
			while (testcondition < upgradelevel) {
				if (ns.corporation.getCorporation().funds > ns.corporation.getUpgradeLevelCost(upgrades[ii])) {
					ns.corporation.levelUpgrade(upgrades[ii])
				} else {
					escape++
					break
				}
				testcondition++
			}
		}
	}


	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		if (cities[ii] == researchcity) {
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], researchworkdistribution[jj % 4])
			}
		} else {
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], workingresearchjobs[jj % 15])
			}
		}
	}

	//	develop new product x3
	ns.print(ns.corporation.getDivision(workingdivisions).products)
	ns.corporation.discontinueProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0])
	let oldname = ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1].split('-')
	ns.print(oldname)
	let newname = oldname[0] + '-' + (parseInt(oldname[1]) + 1)
	ns.print(newname)
	ns.corporation.makeProduct(workingdivisions, researchcity, newname, ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
	ns.print(ns.corporation.getDivision(workingdivisions).products)
	while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress < 100) {
		ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress)
		await ns.sleep(15000)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], 'MAX', 'MP', true)

	ns.print(ns.corporation.getDivision(workingdivisions).products)
	ns.corporation.discontinueProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0])
	oldname = ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1].split('-')
	ns.print(oldname)
	newname = oldname[0] + '-' + (parseInt(oldname[1]) + 1)
	ns.print(newname)
	ns.corporation.makeProduct(workingdivisions, researchcity, newname, ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
	while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress < 100) {
		ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress)
		await ns.sleep(15000)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], 'MAX', 'MP', true)

	ns.print(ns.corporation.getDivision(workingdivisions).products)
	ns.corporation.discontinueProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0])
	oldname = ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1].split('-')
	ns.print(oldname)
	newname = oldname[0] + '-' + (parseInt(oldname[1]) + 1)
	ns.print(newname)
	ns.corporation.makeProduct(workingdivisions, researchcity, newname, ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
	while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress < 100) {
		ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress)
		await ns.sleep(15000)
	}
	ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], 'MAX', 'MP', true)

	while (ns.corporation.getDivision(workingdivisions).research <= 75000) {
		ns.print('waiting for research')
		await ns.sleep(10000)
	}
	ns.corporation.research(workingdivisions, 'Market-TA.I')
	ns.corporation.research(workingdivisions, 'Market-TA.II')

	for (let ii in ns.corporation.getDivision(workingdivisions).products) {
		ns.corporation.setProductMarketTA2(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ii], true)
	}

	for (let ii in cities) {
		ns.print(cities[ii] + ' Employee Moving')
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		for (let jj in employees) {
			await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[jj % 5])
		}
	}

	//  //	// buy production materials
	for (let ii in cities) {
		if (ns.corporation.getWarehouse(workingdivisions, cities[ii]).size >= 1200) {
			let storedrobots = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Robots')
			let storedhardware = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Hardware')
			let storedaiCores = ns.corporation.getMaterial(workingdivisions, cities[ii], 'AI Cores')
			let storedRealEstate = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Real Estate')

			while (storedrobots['qty'] < 0) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Robots', (0 - storedrobots['qty']) / 10)
				storedrobots = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Robots')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Robots', 0)

			while (storedhardware['qty'] < 5514) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Hardware', (5514 - storedhardware['qty']) / 10)
				storedhardware = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Hardware')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Hardware', 0)

			while (storedaiCores['qty'] < 5514) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'AI Cores', (5514 - storedaiCores['qty']) / 10)
				storedaiCores = ns.corporation.getMaterial(workingdivisions, cities[ii], 'AI Cores')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'AI Cores', 0)

			while (storedRealEstate['qty'] < 23556) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Real Estate', (23556 - storedRealEstate['qty']) / 10)
				storedRealEstate = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Real Estate')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Real Estate', 0)
		} else {
			ns.tprint('Unable to Buy second round of production material; Warehouse Capacity too low.')
		}
	}

	for (let ii in cities) {
		if (ns.corporation.getWarehouse(workingdivisions, cities[ii]).size >= 3000) {
			let storedrobots = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Robots')
			let storedhardware = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Hardware')
			let storedaiCores = ns.corporation.getMaterial(workingdivisions, cities[ii], 'AI Cores')
			let storedRealEstate = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Real Estate')

			while (storedrobots['qty'] < 0) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Robots', (0 - storedrobots['qty']) / 10)
				storedrobots = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Robots')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Robots', 0)

			while (storedhardware['qty'] < 13847) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Hardware', (13847 - storedhardware['qty']) / 10)
				storedhardware = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Hardware')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Hardware', 0)

			while (storedaiCores['qty'] < 13847) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'AI Cores', (13847 - storedaiCores['qty']) / 10)
				storedaiCores = ns.corporation.getMaterial(workingdivisions, cities[ii], 'AI Cores')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'AI Cores', 0)

			while (storedRealEstate['qty'] < 56889) {
				ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Real Estate', (56889 - storedRealEstate['qty']) / 10)
				storedRealEstate = ns.corporation.getMaterial(workingdivisions, cities[ii], 'Real Estate')
				await ns.sleep(10)
			}
			ns.corporation.buyMaterial(workingdivisions, cities[ii], 'Real Estate', 0)
		} else {
			ns.tprint('Unable to Buy third round of production material; Warehouse Capacity too low.')
		}
	}

	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		for (let jj in employees) {
			await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[jj % 5])
		}
	}

	ns.exit()
	await ns.sleep(100000)


	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		if (cities[ii] == researchcity) {
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], researchworkdistribution[jj % 4])
			}
		} else {
			for (let jj in employees) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], workingresearchjobs[jj % 15])
			}
		}
	}


	while (true) {

		ns.print(ns.corporation.getDivision(workingdivisions).products)
		oldname = ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1].split('-')
		ns.print(oldname)
		newname = oldname[0] + '-' + (parseInt(oldname[1]) + 1)
		ns.print(newname)
		ns.corporation.discontinueProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0])
		ns.corporation.makeProduct(workingdivisions, researchcity, newname, ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
		ns.print(ns.corporation.getDivision(workingdivisions).products)
		while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress < 100) {
			ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress)
			await ns.sleep(15000)
		}
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], 'MAX', 'MP', true)
		ns.corporation.setProductMarketTA2(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], true)

		await ns.sleep(300000)

		while ((ns.corporation.getCorporation().state != 'START') && (ns.corporation.getInvestmentOffer().round == 2)) {
			ns.print(ns.corporation.getInvestmentOffer().funds)
			ns.print(secondoffer * ns.getBitNodeMultipliers()['CorporationValuation'])
			ns.print(ns.corporation.getInvestmentOffer().funds >= (secondoffer * ns.getBitNodeMultipliers()['CorporationValuation']))
			if (ns.corporation.getInvestmentOffer().funds >= secondoffer * ns.getBitNodeMultipliers()['CorporationValuation']) {
				ns.tprint(ns.nFormat(ns.corporation.getInvestmentOffer().funds, '$0,0'))
				ns.corporation.acceptInvestmentOffer()
				break
			}
			await ns.sleep(100)
		}
		if (ns.corporation.getInvestmentOffer().round == 3) {
			break
		}
	}

	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		for (let jj in employees) {
			await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[jj % 5])
		}
	}


	//	// Done with second investment
	//	// Move to 3rd investment, possible TA2
	while (parseInt(oldname[1]) < 100) {
		ns.print(ns.corporation.getDivision(workingdivisions).products)
		oldname = ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1].split('-')
		ns.print(oldname)
		newname = oldname[0] + '-' + (parseInt(oldname[1]) + 1)
		ns.print(newname)
		ns.corporation.discontinueProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0])
		ns.corporation.makeProduct(workingdivisions, researchcity, newname, ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
		ns.print(ns.corporation.getDivision(workingdivisions).products)
		while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress < 100) {
			ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress)
			await ns.sleep(15000)
		}
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], 'MAX', 'MP', true)
		ns.corporation.setProductMarketTA2(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], true)
	}



	for (let ii in cities) {
		while (ns.corporation.getOffice(workingdivisions, cities[ii]).size < 150) {
			while (ns.corporation.getCorporation.funds < (ns.corporation.getOfficeSizeUpgradeCost(workingdivisions, cities[ii], 3))) {
				await ns.sleep(1000)
			}
			//			for (let jj in cities) {
			ns.corporation.upgradeOfficeSize(workingdivisions, cities[ii], 3)
			//			}
			await ns.sleep(10)
		}
		while (ns.corporation.getOffice(workingdivisions, cities[ii]).employees.length < ns.corporation.getOffice(workingdivisions, cities[ii]).size) {
			ns.corporation.hireEmployee(workingdivisions, cities[ii])
			await ns.sleep(10)
		}
	}
	for (let ii in cities) {
		while (ns.corporation.getWarehouse(workingdivisions, cities[ii]).size <= 5000) {
			ns.corporation.upgradeWarehouse(workingdivisions, cities[ii])
			await ns.sleep(10)
		}
	}

	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		for (let jj in employees) {
			if (ns.corporation.getEmployee(workingdivisions, cities[ii], employees[jj]).pos != usefuljobs[jj % 5]) {
				await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], usefuljobs[jj % 5])
			}
		}
	}


	escape = 0
	while (escape == 0) {
		let upgradecosts = 0
		for (let ii in upgrades) {
			let upgradelevel = 0
			switch (upgrades[ii]) {
				case 'Nuoptimal Nootropic Injector Implants':
					upgradelevel = 2;
					break
				case 'Speech Processor Implants':
					upgradelevel = 2;
					break
				case 'Neural Accelerators':
					upgradelevel = 2;
					break
				case 'FocusWires':
					upgradelevel = 2;
					break
				case 'Smart Factories':
					upgradelevel = 1;
					break
				case 'Smart Storage':
					upgradelevel = 1;
					break
				case 'Project Insight':
					upgradelevel = 1;
					break
				case 'Wilson Analytics':
					upgradelevel = 0;
					break
				case 'DreamSense':
					upgradelevel = 0;
					break
				case 'ABC SalesBots':
					upgradelevel = 1;
					break
			}
			let testcondition = 0
			while (testcondition < upgradelevel) {
				upgradecosts += ns.corporation.getUpgradeLevelCost(upgrades[ii])
				testcondition++
			}
		}
		if (ns.corporation.getCorporation().funds > upgradecosts) {
			for (let ii in upgrades) {
				let upgradelevel = 0
				switch (upgrades[ii]) {
					case 'Nuoptimal Nootropic Injector Implants':
						upgradelevel = 2;
						break
					case 'Speech Processor Implants':
						upgradelevel = 2;
						break
					case 'Neural Accelerators':
						upgradelevel = 2;
						break
					case 'FocusWires':
						upgradelevel = 2;
						break
					case 'Smart Factories':
						upgradelevel = 1;
						break
					case 'Smart Storage':
						upgradelevel = 1;
						break
					case 'Project Insight':
						upgradelevel = 1;
						break
					case 'Wilson Analytics':
						upgradelevel = 0;
						break
					case 'DreamSense':
						upgradelevel = 0;
						break
					case 'ABC SalesBots':
						upgradelevel = 1;
						break
				}
				let testcondition = 0
				while (testcondition < upgradelevel) {
					if (ns.corporation.getCorporation().funds > ns.corporation.getUpgradeLevelCost(upgrades[ii])) {
						ns.corporation.levelUpgrade(upgrades[ii])
					} else {
						escape++
						break
					}
					testcondition++
				}
			}
		} else {
			escape++
		}
		await ns.sleep(10)
	}

	let researchqueue = 3

	if (ns.corporation.hasResearched(workingdivisions, 'uPgrade: Capacity.I')) {
		researchqueue++
	}
	if (ns.corporation.hasResearched(workingdivisions, 'uPgrade: Capacity.II')) {
		researchqueue++
	}

	for (let ii in cities) {
		let employees = ns.corporation.getOffice(workingdivisions, cities[ii]).employees
		if (cities[ii] == researchcity) {
			for (let jj in employees) {
				if (ns.corporation.getEmployee(workingdivisions, cities[ii], employees[jj]).pos != researchworkdistribution[jj % 4]) {
					await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], researchworkdistribution[jj % 4])
				}
			}
		} else {
			for (let jj in employees) {
				if (ns.corporation.getEmployee(workingdivisions, cities[ii], employees[jj]).pos != workingresearchjobs[jj % 15]) {
					await ns.corporation.assignJob(workingdivisions, cities[ii], employees[jj], workingresearchjobs[jj % 15])
				}
			}
		}
	}

	while (parseInt(oldname[1]) < 100) {
		ns.print(oldname)
		ns.print((parseInt(oldname[1]) % 3))
		if ((parseInt(oldname[1]) % 3) == 0) {
			while (ns.corporation.getCorporation().funds > ns.corporation.getHireAdVertCost(workingdivisions)) {
				ns.corporation.hireAdVert(workingdivisions)
			}
		} else {
			while (ns.corporation.getCorporation().funds > ns.corporation.getUpgradeLevelCost('Wilson Analytics')) {
				ns.corporation.levelUpgrade('Wilson Analytics')
				await ns.sleep(10)
			}
		}
		ns.print(ns.corporation.getDivision(workingdivisions).products)
		oldname = ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1].split('-')
		//		ns.print(oldname)
		newname = oldname[0] + '-' + (parseInt(oldname[1]) + 1)
		//		ns.print(newname)
		if (ns.corporation.getDivision(workingdivisions).products.length == researchqueue) {
			ns.corporation.discontinueProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[0])
		}
		ns.corporation.makeProduct(workingdivisions, researchcity, newname, ns.corporation.getCorporation().funds / 20, ns.corporation.getCorporation().funds / 20)
		//		ns.print(ns.corporation.getDivision(workingdivisions).products)
		while (ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress < 100) {
			//			ns.print(ns.corporation.getProduct(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1]).developmentProgress)
			await ns.sleep(15000)
		}
		ns.corporation.sellProduct(workingdivisions, cities[0], ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], 'MAX', 'MP', true)
		ns.corporation.setProductMarketTA2(workingdivisions, ns.corporation.getDivision(workingdivisions).products[ns.corporation.getDivision(workingdivisions).products.length - 1], true)
	}

	ns.alert('Produced 100 products')
}