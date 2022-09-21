/** @param {NS} ns **/
export async function main(ns) {
    let boxes = Array.from(eval("document").querySelectorAll("[class*=MuiBox-root]"));
    let box = boxes.find(s => getProps(s)?.player);
    if (!box) return;
    let props = getProps(box);
    ns.tprint('WARN: Income since last install:');
    for (let entry of Object.entries(props.player.moneySourceA)) {
        ns.tprint(entry[0] + ' : ' + entry[1]);
    }
    ns.tprint('WARN: Income since start of node:');
    for (let entry of Object.entries(props.player.moneySourceB)) {
        ns.tprint(entry[0] + ' : ' + entry[1]);
    }
}

function getProps(obj) {
    return Object.entries(obj).find(entry => entry[0].startsWith("__reactProps"))[1].children.props;
}