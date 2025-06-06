import { HookContext, HookList } from "../Scripts/HookRegister.js";
import {
  getStoryTellerElement,
  getUIInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { Animations,SubScene, UI } from "./UI.js";
/**
 * 事件类
 *
 * 一个游戏事件的框架
 *
 * @class GameEvent
 */
class GameEvent {
  insertRequest = null;
  /**
   * 构造函数，初始化Event类的属性
   * @param {string} type - 事件的类型（如"TimeUpdate"）
   * @param {Object} [data={}] - 事件相关的数据
   * @param {Object} [callbacks={ before:async ()=>{return;},during:async ()=>{return;},after:async ()=>{return;}}]
   */
  constructor(
    type,
    data = {},
    callbacks = {
      before: async () => {
        return;
      },
      during: async () => {
        return;
      },
      after: async () => {
        return;
      },
    },
    timings = ["before", "during", "after"]
  ) {
    this.type = type;
    this.data = data;
    this.parentEvent = null;
    this.childEvents = [];
    this.hooks = {
      before: [],
      during: [],
      after: [],
    };
    this.paused = false;
    this.timings = timings;
    this.callbacks = callbacks;
    /**
     * 当前事件是否已取消
     * @type {boolean}
     */
    this.isCancelled = false;
    this.isFinished = false;
    /**
     * 当前执行阶段（before, during, after）
     * @type {string | null}
     */
    this.currentPhase = null;
  }

  /**
   * 添加钩子函数到事件
   * @param {string} timing - 钩子的触发时机（before, during, after）
   * @param {Promise<void>} hook - 要添加的钩子函数
   * @returns {GameEvent} - 返回自身
   */
  addHook(timing, hook) {
    if (this.hooks[timing]) {
      this.hooks[timing].push(hook);
    }
    return this;
  }

  /**
   * 执行指定时机的钩子函数
   * @param {string} timing - 钩子的触发时机（before, during, after）
   */
  async executeHooks(timing, game = null) {
    if (this.hooks[timing]) {
      await Promise.all(this.hooks[timing].map((hook) => hook(this, game)));
    }
  }

  async execute(game = null) {
    const start = this.currentPhase || "before";
    for (let i = this.timings.indexOf(start); i < this.timings.length; i++) {
      if (this.callbacks[this.timings[i]]) {
        await this.callbacks[this.timings[i]](this, game);
      }
      await this.executeHooks(this.timings[i], game);
      if ((this.timings[i] === "before" || i === 0) && this.isCancelled) {
        break;
      }
      if (this.insertRequest) {
        this.paused = true;
        await this.insertRequest();
        this.insertRequest = null;
        this.paused = false;
      }
    }
    this.isFinished = true;
    return this.data.result;
  }

  /**
   * 取消事件，仅在before阶段调用有效
   * 如果事件被取消，后续的during和after阶段将不会执行
   * @returns {GameEvent} - 返回自身
   */
  cancel() {
    if (this.currentPhase !== "before") {
      throw new Error("Event can only be cancelled during the 'before' phase.");
    }
    this.isCancelled = true;
    return this;
  }

  /**
   * 实现then方法，使Event类可以被await
   * @param {function} resolve - resolve函数
   * @param {function} [reject] - reject函数（可选）
   * @returns {Promise} - 返回一个Promise对象
   */
  then(resolve, reject) {
    return this.execute().then(resolve).catch(reject);
  }
  // 实现catch
  catch(reject) {
    return this.execute().catch(reject);
  }
}

/**
 * 游戏内事件类
 *
 * 继承自Event类，增加了一些游戏内特有的属性和方法
 * @param {string} EventType - 事件类型
 * @param {Object<String,Function>} Options - 事件相关的选项，提供选项对应的回调。
 * @param {Function} Writer - 控制事件输出
 */
export class InGameEvent extends GameEvent {
  resolveFunc = null;
  statePromise = new Promise((resolve) => {
    this.resolveFunc = (datas) => {
      this.data.result = datas;
      this.data.isBefore = false;
      resolve();
    };
  });
  constructor(EventType, Options, Writer) {
    super(
      EventType,
      { _options: Options, result: null, isBefore: true },
      {
        during: async (self, game) => {
          if (!self.data.result) {
            const curLocation = getPlayerInstance().currentLocation;
            if (curLocation !== "#BattleScene") {
              /** @type {UI} */
              const ui = getUIInstance(UI);
              const currentScene = ui.getCurrentScene();
              if (currentScene instanceof SubScene) {
                self.Writer("name");
                self.Writer("content");
                const options = {};
                for (const i in self.data._options) {
                  options[self.Writer(i)] = () => {
                    game
                      .createEvent(
                        game.eventWrapper(
                          "playerMadeChoice",
                          {
                            ori_event: self,
                            _choice: i,
                            choice: self.Writer(i),
                            _choices: self.data._options,
                            choices: options,
                          },
                          {
                            during: async (self, game) => {
                              if (
                                self.data._choices[self.data._choice] instanceof
                                Function
                              )
                                self.data._choices[self.data._choice]();
                            },
                          }
                        )
                      )
                      .addHook("after", async (self, game) => {
                        this.resolveFunc(self.data);
                      });
                  };
                }
                const btns = UI.createButtons(options);
                getStoryTellerElement().append(...btns);
                const nodeList = [
                  ...getStoryTellerElement().querySelectorAll(
                    "span[hasDescription]"
                  ),
                ];
                if (nodeList.length > 0) {
                  for (const node of nodeList) {
                    if (!node.hasTooltip) {
                      const title = node.textContent;
                      const description = node.getAttribute("data-description")
                        ? node.getAttribute("data-description")
                        : i18n.th(node.getAttribute("data-description-at"));
                      Animations.attachHoverDescription(
                        node,
                        title,
                        description
                      );
                    }
                  }
                }
                await this.statePromise;
                for (const btn of btns) {
                  btn.remove();
                }
                return self.data.result;
              } else {
                self.cancel();
              }
            } else {
              self.cancel();
            }
          }
        },
      }
    );
    this.Writer = Writer;
  }
  /**
   * 取消事件
   * ！先回滚操作再取消
   * @returns {GameEvent} - 返回自身
   */
  cancel() {
    this.isCancelled = true;
    return this;
  }
}
/**
 * 游戏类
 *
 * 负责游戏相关的大部分功能
 * 主要与事件和游戏时间相关
 *
 * @class Game
 */
export class Game {
  /**
   * 构造函数，初始化Game类的属性
   */
  constructor() {
    this.eventQueue = [];
    this.currentEvent = null;
    this.time = 0;
    this.symbol = 0;
    this.isTimePaused = false;
    this.isEventQueueRunning = false;
    this.allowSave = true;
    /**
     * 全局触发器列表，按照事件类型和触发时机存储
     * @type {Object<string, Object<string, Function[]>>}
     */
    this.globalTriggers = {};
    /**
     * 存档内全局触发器列表，按照事件类型和触发时机以及钩子标识符存储。
     * 在存档内全局触发器列表中的所有触发器会被保存进存档中并在存档被加载时被重新应用。
     * 请勿操作此函数，使用addGlobalTrigger()在第三个参数传入钩子标识符来应用一个存档内全局触发器。
     * @type {Object<string, Object<string, string[]>>}
     */
    this.globalSaveTriggers = {};
    /**
     * 临时全局触发器列表，按照事件类型和触发时机存储。临时全局触发器不会被储存进存档中。
     * 故在存在临时全局触发器期间禁用玩家存档功能。
     * @type {Object<string, Object<string, Object<string,Function | number>>>}
     */
    this.tempGlobalTriggers = {};
    /**
     * 记录游戏全局的设置。
     * @type {Object<string, string | boolean | number | null>}
     */
    this.gameSettings = {};
  }
  /**
   * 设置一个全局设置
   * @param {string} key - 要插入的事件对象
   * @param {string | boolean | number | null} value - 值
   */
  setGameSetting(key, value) {
    this.gameSettings[key] = value;
  }
  /**
   * 获取一个全局设置
   * @param {string} key - 要插入的事件对象
   * @returns {string | boolean | number | null}
   */
  getGameSetting(key) {
    return this.gameSettings[key] ?? null;
  }
  /**
   * 插入一个新事件
   * 不会影响当前事件
   * @param {GameEvent} event - 要插入的事件对象
   * @returns {Promise<void>} - 被执行的事件的Promise对象
   */
  insertEvent(event) {
    this.applyGlobalTriggers(event);
    if (!this.isEventQueueRunning) {
      this.currentEvent = event;
      this.executeEvent(event);
    } else {
      this.eventQueue.push(event);
    }
    return event;
  }
  /**
   * 插入一个新事件
   * 如果有事件在执行，则暂停当前事件并插入新事件为子事件
   * @param {GameEvent} event - 要插入的事件对象
   */
  createEvent(event) {
    if (this.currentEvent) {
      const ori_event = this.currentEvent;
      if (!ori_event.insertRequest) {
        this.applyGlobalTriggers(event);
        this.currentEvent.childEvents.push(event);
        event.parentEvent = this.currentEvent;
        ori_event.insertRequest = async () => {
          this.currentEvent = event;
          await this.executeEvent(event);
          this.currentEvent = ori_event;
        };
      } else {
        this.insertEvent(event);
      }
    } else {
      this.insertEvent(event);
    }
    return event;
  }
  /**
   * 获取当前生效的所有全局触发器
   * @returns {Object<string, Object<string, Function[]>>} - 返回全局触发器列表
   */
  getGlobalTriggers() {
    return this.globalTriggers;
  }
  /**
   * 为新创建的事件应用全局触发器
   * @param {GameEvent} event - 新创建的事件对象
   */
  applyGlobalTriggers(event) {
    const eventType = event.type;
    if (this.globalTriggers[eventType]) {
      const triggers = this.globalTriggers[eventType];
      for (let timing in triggers) {
        if (triggers[timing]) {
          triggers[timing].forEach((hook) => {
            event.addHook(timing, hook);
          });
        }
      }
    }
    if (this.tempGlobalTriggers[eventType]) {
      const triggers = this.tempGlobalTriggers[eventType];
      for (let timing in triggers) {
        if (triggers[timing]) {
          for (const symbol in triggers[timing]) {
            if (triggers[timing][symbol]["life"] > 0) {
              const hookWrapper = async () => {
                triggers[timing][symbol]["hook"].then((result) => {
                  if (result) triggers[timing][symbol]["life"] -= 1;
                });
              };
              event.addHook(timing, hookWrapper);
            } else {
              delete triggers[timing][symbol];
            }
          }
        }
      }
    }
  }
  /**
   * 获取下一个标识符
   * @returns {String} 一个不会出现冲突的标识符
   */
  getNextSymbol() {
    return this.symbol++;
  }
  /**
   * 添加全局触发器
   * @param {string} eventType - 要监听的事件类型
   * @param {string} timing - 触发器的时机（before, during, after）
   * @param {Function | string} hook - 要添加的钩子函数或钩子标识符
   */
  addGlobalTrigger(eventType, timing, hook) {
    if (!this.globalTriggers[eventType]) {
      this.globalTriggers[eventType] = {
        before: [],
        during: [],
        after: [],
      };
    }
    let saveFlag = true;
    if (hook instanceof Function) saveFlag = false;
    if (!this.globalSaveTriggers[eventType]) {
      this.globalSaveTriggers[eventType] = {
        before: [],
        during: [],
        after: [],
      };
    }
    let hookFunction = hook;
    if (saveFlag) {
      this.globalSaveTriggers[eventType][timing].push(hook);
      // 通过箭头函数使得在钩子函数自身内可以获取自身
      hookFunction = () => {
        HookList[hook].bind(
          Object.assign(HookContext, { self: hookFunction })
        )();
      };
    }
    if (this.globalTriggers[eventType][timing]) {
      this.globalTriggers[eventType][timing].push(hookFunction);
    }
    return hookFunction;
  }
  /**
   * 移除全局触发器
   * @param {string} eventType - 要监听的事件类型
   * @param {string} timing - 触发器的时机（before, during, after）
   * @param {Function | string} hook - 要移除的钩子函数或钩子标识符
   */
  removeGlobalTrigger(eventType, timing, hook) {
    if (
      this.globalTriggers[eventType] &&
      this.globalTriggers[eventType][timing]
    ) {
      let saveFlag = true;
      if (hook instanceof Function) saveFlag = false;
      const hookFunction = saveFlag ? HookList[hook] : hook;
      this.globalTriggers[eventType][timing] = this.globalTriggers[eventType][
        timing
      ].filter((el) => el !== hookFunction);
      if (saveFlag) {
        this.globalSaveTriggers[eventType][timing].filter((el) => el !== hook);
      }
    }
  }
  /**
   * 添加临时全局触发器
   * @param {string} eventType - 要监听的事件类型
   * @param {string} timing - 触发器的时机（before, during, after）
   * @param {Function} hook - 要添加的钩子函数
   * @param {number} life - 该触发器允许被触发的次数
   */
  addTempGlobalTrigger(eventType, timing, hook, life) {
    if (!this.tempGlobalTriggers[eventType]) {
      this.tempGlobalTriggers[eventType] = {
        before: {},
        during: {},
        after: {},
      };
    }
    let symbol;
    if (this.tempGlobalTriggers[eventType][timing]) {
      symbol = this.getNextSymbol();
      this.tempGlobalTriggers[eventType][timing][symbol] = { hook, life };
    }
    return symbol;
  }
  /**
   * 执行事件，包括触发所有相关钩子
   * @param {GameEvent} event - 要执行的事件对象
   */
  async executeEvent(event) {
    console.log("Event:", event);
    this.isEventQueueRunning = true;
    this.currentEvent = event;
    await event.execute(this);
    if (this.eventQueue.length === 0) {
      this.isEventQueueRunning = false;
    } else {
      await this.executeEvent(this.eventQueue.shift()).catch((e) => {
        throw e;
      });
    }
    this.currentEvent = null;
  }

  /**
   * 获取当前事件流
   * @returns {Array<GameEvent>} - 返回当前事件流的副本
   */
  getEventQueue() {
    return [...this.eventQueue];
  }

  /**
   * 获取当前正在执行的事件
   * @returns {GameEvent | null} - 返回当前正在执行的事件对象，如果没有则返回null
   */
  getCurrentEvent() {
    return this.currentEvent;
  }

  /**
   * 获取当前正在执行事件的所有父事件
   * @returns {Array<GameEvent>} - 返回父事件的数组
   */
  getParentEvents() {
    let parents = [];
    let event = this.currentEvent;
    while (event && event.parentEvent) {
      parents.push(event.parentEvent);
      event = event.parentEvent;
    }
    return parents;
  }

  /**
   * 更新游戏时间，每次调用增加游戏内的时间
   * @param {number} minutes - 增加的时间（以分钟为单位）
   */
  updateTime(minutes) {
    if (!this.isTimePaused) {
      this.time += minutes;
      this.triggerTimeUpdate(minutes);
    }
  }
  /**
   * 事件包装器
   * @param {string} eventName - 事件名称
   * @param {Object} options - 事件携带属性
   * @param {Object} callbacks - 事件各阶段回调(在当前阶段执行触发器之前会被执行)
   * @param {Array<string>} timings - 事件含有的时机
   */
  eventWrapper(
    eventName = "emptyEvent",
    options = {},
    callbacks = void 0,
    timings = void 0
  ) {
    return new GameEvent(eventName, options, callbacks, timings);
  }
  /**
   * 触发时间更新事件
   * @param {number} minutes - 时间变化值（以分钟为单位）
   */
  triggerTimeUpdate(minutes) {
    const timeUpdateEvent = this.eventWrapper("TimeUpdate", {
      minutes: minutes,
    });
    this.createEvent(timeUpdateEvent);
  }

  /**
   * 暂停游戏内时间的流动
   */
  pauseTime() {
    this.isTimePaused = true;
    if (this.gameTimer) clearInterval(this.gameTimer);
  }

  /**
   * 恢复游戏内时间的流动
   */
  resumeTime() {
    this.isTimePaused = false;
    this.startTimer();
  }

  /**
   * 手动调整游戏时间（仅触发一次TimeUpdate事件）
   * @param {number} minutes - 要调整的时间（以分钟为单位）
   */
  adjustTime(minutes) {
    this.time += minutes;
    this.triggerTimeUpdate(minutes);
  }
  /**
   * 启动游戏时间计时器
   */
  startTimer() {
    this.gameTimer = setInterval(() => {
      this.updateTime();
    }, 60000);
  }
}
/**
 * 输出日志信息，包括发起位置和发起时间。
 * @param {string} logText - 要输出的日志内容。
 */
export function log(...logText) {
  // 获取当前时间
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0"); // 获取小时，并确保是两位数
  const minutes = now.getMinutes().toString().padStart(2, "0"); // 获取分钟，并确保是两位数
  const seconds = now.getSeconds().toString().padStart(2, "0"); // 获取秒，并确保是两位数
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0"); // 获取毫秒，并确保是三位数
  const currentTime = `${hours}:${minutes}:${seconds}:${milliseconds}`;

  // 创建一个 Error 对象以获取调用栈信息
  const error = new Error();
  const stackLines = error.stack.split("\n");

  // 第二行是调用 log 函数的位置信息（栈的第一行是错误消息本身）
  const callerInfo = stackLines[2].trim();
  let outsideBrackets = callerInfo.split(" (")[0].replace("at ", ""); // 提取括号外的部分
  const insideBrackets = callerInfo.match(/\/([^\/]+\.js:\d+:\d+)/)[1]; // 提取括号内的部分
  if (outsideBrackets.indexOf("/") !== -1)
    outsideBrackets = insideBrackets.split(":")[0];
  // 格式化输出日志
  console.log(
    `[${outsideBrackets}(${insideBrackets})][${currentTime}]: ${logText.join(
      " "
    )}`
  );
}
