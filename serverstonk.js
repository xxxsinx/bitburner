import { GetAllServers } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    // Get source code enum data
    await ns.wget('https://raw.githubusercontent.com/danielyxie/bitburner/master/src/Locations/data/LocationNames.ts', 'locations.txt');;
    await ns.wget('https://raw.githubusercontent.com/danielyxie/bitburner/master/src/StockMarket/data/StockSymbols.ts', 'stocksymbols.txt');

    let location = "";
    let company = "";
    let locations = ns.read('locations.txt');
    let locationMap = Object();
    for (let line of locations.split("\n")) {
        if (line.includes('=')) {
            location = line.split(" = ")[0];
            company = line.split(" = ")[1];
            while (company.includes('"')) { company = company.replace('"', '').replace(",", ""); }
            while (location.includes(' ')) { location = location.replace(' ', ''); }
        }
        locationMap[location] = company;
    }

    let data = [];
    let companies = ns.read('stocksymbols.txt');
    for (let line of companies.split("\n")) {
        let location;
        let sym;
        let serverName;
        let organization;

        if (line.includes("LocationName")) {
            for (let line2 of Object.keys(locationMap)) {
                if (line2.length > 3 && line.includes(line2)) {
                    location = locationMap[line2];
                    sym = line.split("=")[1].replace(";", "").replace('\"', '').replace('\"', '').replace(' ', '');
                }
            }
        } else {
            if (line.includes("StockSymbols") && !line.includes("LocationName") && !line.includes("export")) {
                location = line.substring(14, line.indexOf(']') - 1);
                sym = line.substring(line.indexOf('=') + 3, line.length - 2);
            }
        }


        for (let server of GetAllServers(ns)) {
            let so = ns.getServer(server);
            if (so.organizationName == location) {
                serverName = server;
                organization = so.organizationName;
            }
        }

        if (location != undefined && serverName != undefined)
            data.push({ location: location, sym: sym, server: serverName, organization: organization });
    }

    let symbols = ns.stock.getSymbols();
    for (let sym of symbols) {
        let match = data.find(s => s.sym == sym);
        if (match == undefined)
            ns.tprint('WARN: ' + sym.padEnd(10) + ' : ' + 'No match!'.padEnd(20) + '???'.padEnd(25) + ' ' + 'N/A'.padEnd(25));
        else
            ns.tprint('INFO: ' + match.sym.padEnd(10) + ' : ' + match.server.padEnd(20) + match.organization.padEnd(25) + ' ' + match.location.padEnd(25));
    }

    // Remove temporary files
    ns.rm('locations.txt');
    ns.rm('stocksymbols.txt');
}