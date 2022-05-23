export function GetAllServers(ns, set = new Set(['home'])) {
	return set.forEach(hn => ns.scan(hn).forEach(o => set.add(o))) || [...set.values()];
}

export async function main(ns) {
    let servers= GetAllServers(ns);
    let serverMap= new Map();
    for (const server of servers)
        serverMap[server]= ns.scan(server);

    //ns.tprint(servers);
    ns.tprint(serverMap);
}



    // const active = new Map();
    // var current = "n00dles";
    // var temp = "home"; 
    // var v = 0;
    // var e = 1;
    // var x = 1;

    // active.set("home", ns.scan());
    // if (ns.serverExists("pserv-0")) {
    //     for (var i = 0; i < 25; ++i) {
    //         active.get("home").pop();
    //     }
    // }
    // if (ns.serverExists("darkweb")) {
    //     active.get("home").pop();
    // }
    // while (active.get("home").length > v) {
    //     if (active.get(temp) == undefined) {
    //         ns.tprint('ERROR: active.get(temp) is undefined ' + temp);
    //         return;
    //     }
    //     while (active.get(temp).length > x ){
    //         while (ns.scan(current).length > 1) {
    //             if (!active.get(current)) {
    //                 ns.tprint("hello");
    //                 active.set(current, ns.scan(current));
    //                 var e = 1
    //             }
    //             ns.tprint(ns.scan(current));
    //             var current = active.get(current)[e];
    //             await ns.sleep(100);
    //         }
    //         active.set(current, ns.scan(current));
    //         var current = active.get(current)[0];
    //         var temp = current;
    //         ++x;
    //         ++e;
    //         ns.tprint(active.get(temp).length);
    //         await ns.sleep(100);
    //     }
    //     var x = 1;
    //     var e = 1;
    //     var current = ns.scan(active.get(current)[0]);
    //     var temp = current;
    //     await ns.sleep(100);
    // }
    // ns.tprint(active.get("n00dles")[1]);
//}