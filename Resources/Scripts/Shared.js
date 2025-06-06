// Resources/Scripts/Shared.js

/**
 * 用于在模块间共享的 `Game` 实例
 * @type {Game|null}
 */
let gameInstance = null;

/**
 * 用于在模块间共享的 `UI` 实例
 * @type {UI|null}
 */
let uiInstance = null;

/**
 * 用于在模块间共享的 `Player` 实例
 * @type {Player|null}
 */
let playerInstance = null;



/**
 * 用于在模块间共享的 `Map` 实例
 * @type {Object | null}
 */
let mapInstance = null;

/**
 * 用于在模块间共享的 `Item` 实例
 * @type {Item | null}
 */
let gameItems = {};

/**
 * 设置共享的 `Game` 实例。
 * 在初始化 `Game` 类后调用该函数将实例存储在此模块中，以便其他模块可以访问。
 *
 * @param {Game} game - 需要共享的 `Game` 类实例。
 */
export function setGameInstance(game) {
  gameInstance = game;
}

/**
 * 获取共享的 `Game` 实例。
 * 该函数返回存储的 `Game` 实例，以便其他模块可以访问和使用它。
 *
 * @returns {Game|null} - 返回 `Game` 类的实例，如果未设置则返回 `null`。
 */
export function getGameInstance() {
  return gameInstance;
}

/**
 * 设置共享的 `Player` 实例。
 * 在初始化 `Player` 类后调用该函数将实例存储在此模块中，以便其他模块可以访问。
 *
 * @param {Player} player - 需要共享的 `Player` 类实例。
 */
export function setPlayerInstance(player) {
  playerInstance = player;
}

/**
 * 获取共享的 `Player` 实例。
 * 该函数返回存储的 `Player` 实例，以便其他模块可以访问和使用它。
 *
 * @returns {Player|null} - 返回 `Player` 类的实例，如果未设置则返回 `null`。
 */
export function getPlayerInstance() {
  return playerInstance;
}

/**
 * 设置共享的 `Map` 实例。
 * 在初始化 `Map` 类后调用该函数将实例存储在此模块中，以便其他模块可以访问。
 *
 * @param {Map} map - 需要共享的 `Map` 类实例。
 * @param {SVGAElement} mapElement - 需要共享的 `Map` 元素。
 */
export function setMapInstance(map, mapElement) {
  mapInstance = { map: map, mapElement: mapElement };
}

/**
 * 获取共享的 `Map` 实例。
 * 该函数返回存储的 `Map` 实例，以便其他模块可以访问和使用它。
 *
 * @returns {Map|null} - 返回 `Map` 类的实例，如果未设置则返回 `null`。
 */
export function getMapInstance() {
  return mapInstance;
}

/**
 * 设置共享的 `Item` 实例。
 * 在初始化 `Item` 类后调用该函数将实例存储在此模块中，以便其他模块可以访问。
 *
 * @param {string} name - 物品ID
 * @param {Item} item - 物品实例
 */
export function addGameItem(name, item) {
    gameItems[name] = item;
  }
  
  /**
   * 获取共享的 `Item` 实例。
   * 该函数返回存储的 `Item` 实例，以便其他模块可以访问和使用它。
   *
   * @returns {Object} - 返回所有储存的 `Item` 类的实例，如果未设置则返回 `null`。
   */
  export function getGameItems() {
    return gameItems;
  }

/**
 * 设置共享的 `UI` 实例。
 * 在初始化 `UI` 类后调用该函数将实例存储在此模块中，以便其他模块可以访问。
 *
 * @param {UI} ui - 需要共享的 `UI` 类实例。
 */
export function setUIInstance(ui) {
  uiInstance = ui;
}

/**
 * 获取共享的 `UI` 实例。
 * 该函数返回存储的 `UI` 实例，以便其他模块可以访问和使用它。
 *
 * @returns {UI|null} - 返回 `UI` 类的实例，如果未设置则返回 `null`。
 */
export function getUIInstance() {
  return uiInstance;
}

let _getRandom = null;
export function setRandom(random){
  _getRandom = random;
}
export function getRandom(){
  return _getRandom;
}

let _storyTeller = document.createElement("div");
_storyTeller.id = "BeginningStory";
export function getStoryTellerElement(){
  return _storyTeller;
}
export const shared_store = {};
export function store(key,value){
  shared_store[key] = value;
};
export function getStore(key){
  return shared_store[key] || null;
}

const item_list = {

};
export function addToItemList(item_id,item_data){
  item_list[item_id] = item_data;
}
export function getItemList(){
  return item_list;
}