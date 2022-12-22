/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');

    // Go to Aevum if we aren't already there
    if (ns.getPlayer().city != 'Sector-12') {
        ns.tprint('ERROR: We aren\'t in Sector-12, aborting.');
        return;
    }

    for (let i = 0; i < 10; i++) {
        // Go to the city screen
        ToCityScreen();

        // Enter joesguns
        let doc = eval('document');
        let joes = doc.querySelector("[aria-label=\"Joe's Guns\"]");
        joes.children[0].click();

        // Start infiltration
        let xpath = "//button[text()='Infiltrate Company']";
        let infil = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        infil[Object.keys(infil)[1]].onClick({ isTrusted: true });

        // Wait for infiltration to finish
        xpath = "//h4[text()='Infiltration successful!']";
        let win;
        while (true) {
            win = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (win != null)
                break;
            await ns.sleep(100);
        }
        win.innerHtml= 'xxx';
        await ns.sleep(1000);
        

        // Select reward
        xpath = "//button[contains(text(), 'Sell for')]";
        let sell = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        sell[Object.keys(sell)[1]].onClick({ isTrusted: true });

        await ns.sleep(1000);
    }
}

function ToCityScreen() {
    const objects = [];
    const payload_id = "payload" + String(Math.trunc(performance.now()));
    globalThis.webpackJsonp.push([payload_id, {
        [payload_id]: function (_e, _t, require) {
            for (const module of (Object.values(require.c))) {
                for (const object of Object.values(module?.exports ?? {})) {
                    objects.push(object);
                }
            }
        }
    }, [[payload_id]]]);

    let player;
    let router;
    for (const obj of objects) {
        if (!player && typeof obj.whoAmI === "function" && obj.whoAmI() === "Player") {
            player = obj;
        } else if (!router && typeof obj.toDevMenu === "function") {
            router = obj;
        }
        if (player && router) { break; }
    }

    // ns.tprint('Player: ' + player);
    // ns.tprint('Router: ' + router);

    if (router) router.toCity();
}