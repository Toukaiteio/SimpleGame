// Resources/Scripts/Shared.js

/**
 * 简易 IOC 容器实现
 */
class IoCContainer {
  constructor() {
    this._registry = new Map();
    this._singletons = new Map();
  }

  /**
   * 注册一个依赖项
   * @param {string} name - 依赖名
   * @param {Function|any} resolver - 工厂函数或直接值
   * @param {'singleton'|'factory'|'value'} [type='singleton']
   */
  register(name, resolver, type = "singleton") {
    if (this._registry.has(name)) {
      console.warn(`Dependency "${name}" already registered.`);
    }
    this._registry.set(name, { resolver, type });
  }

  /**
   * 获取依赖实例
   * @param {string} name
   */
  resolve(name) {
    const dep = this._registry.get(name);
    if (!dep) {
      throw new Error(
        `Dependency "${name}" not found. Please register it first.`
      );
    }

    switch (dep.type) {
      case "singleton":
        if (!this._singletons.has(name)) {
          this._singletons.set(name, dep.resolver(this));
        }
        return this._singletons.get(name);

      case "factory":
        return dep.resolver(this);

      case "value":
        return dep.resolver;

      default:
        throw new Error(`Unknown dependency type: ${dep.type}`);
    }
  }

  /**
   * 检查是否已注册某个依赖
   * @param {string} name
   */
  has(name) {
    return this._registry.has(name);
  }

  /**
   * 清除所有依赖（用于重置容器）
   */
  reset() {
    this._singletons.clear();
    this._registry.clear();
  }
}

// 创建全局容器实例
export const container = new IoCContainer();

// 将常用依赖注册为别名函数，保持原有使用方式一致

/**
 * 设置共享的 Game 实例
 * @param {Game} game
 */
export function setGameInstance(game) {
  container.register("Game", () => game, "value");
}

/**
 * 获取共享的 Game 实例
 * @returns {Game|null}
 */
export function getGameInstance() {
  try {
    return container.resolve("Game")();
  } catch (e) {
    return null;
  }
}

/**
 * 设置共享的 Player 实例
 * @param {Player} player
 */
export function setPlayerInstance(player) {
  container.register("Player", () => player, "value");
}

/**
 * 获取共享的 Player 实例
 * @returns {Player|null}
 */
export function getPlayerInstance() {
  try {
    return container.resolve("Player")();
  } catch (e) {
    return null;
  }
}

/**
 * 设置共享的 UI 实例
 * @param {UI} ui
 */
export function setUIInstance(ui) {
  container.register("UI", () => ui, "value");
}

/**
 * 获取共享的 UI 实例
 * @returns {UI|null}
 */
export function getUIInstance() {
  try {
    return container.resolve("UI")();
  } catch (e) {
    return null;
  }
}

let _getRandom = null;
export function setRandom(random) {
  _getRandom = random;
}
export function getRandom() {
  return _getRandom;
}

const _storyTeller = document.createElement("div");
_storyTeller.id = "BeginningStory";
export function getStoryTellerElement() {
  return _storyTeller;
}

export const shared_store = {};
export function store(key, value) {
  shared_store[key] = value;
}
export function getStore(key) {
  return shared_store[key] || null;
}

const item_list = {};
export function addToItemList(item_id, item_data) {
  item_list[item_id] = item_data;
}
export function getItemList() {
  return item_list;
}
