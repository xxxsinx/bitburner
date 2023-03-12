/** @param {NS} ns **/
export async function main(ns) {
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
        } else if (!router && typeof obj.toPage === "function") {
            router = obj;
        }
        if (player && router) { break; }
    }

    
    if (router) router.toPage("Dev");
}