/** @param {NS} ns **/
export async function main(ns) {
    const gameRoot = globalThis['document'].getElementById('root');
    const sideBar = findReact(gameRoot.firstElementChild.firstElementChild.nextElementSibling);
    const { router } = sideBar.pendingProps.children[0].props;
    router.toDevMenu();
}

function findReact(element) {
  const reactKey = Object.keys(element).find((key) => key.startsWith('__reactFiber'));
  return element[reactKey];
}