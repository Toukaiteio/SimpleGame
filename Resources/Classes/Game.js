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

  /**
   * Executes the event, progressing through its defined timings (e.g., 'before', 'during', 'after').
   * It runs callbacks and hooks for each timing.
   * If the event is cancelled during the 'before' phase, further execution is halted.
   * If an `insertRequest` is present (e.g., a child event needs to run),
   * the current event is paused, the inserted event executes, and then the current event resumes.
   * @param {Game | null} game - The game instance, passed to callbacks and hooks.
   * @returns {Promise<any>} - The result of the event, often set in `this.data.result`.
   */
  async execute(game = null) {
    // Determine the starting phase, defaults to "before" or resumes from currentPhase if paused.
    const start = this.currentPhase || "before";
    // Iterate through the defined timings for this event (e.g., ["before", "during", "after"])
    for (let i = this.timings.indexOf(start); i < this.timings.length; i++) {
      const currentTiming = this.timings[i];
      this.currentPhase = currentTiming; // Update current phase

      // Execute the main callback for the current timing phase (if defined)
      if (this.callbacks[currentTiming]) {
        await this.callbacks[currentTiming](this, game);
      }
      // Execute any registered hooks for the current timing phase
      await this.executeHooks(currentTiming, game);

      // If the event is cancelled during the 'before' phase (or the first phase in timings array),
      // stop further processing of this event.
      if ((currentTiming === "before" || i === 0) && this.isCancelled) {
        break;
      }

      // If there's a request to insert another event (e.g., a child event created via game.createEvent()),
      // pause this event, execute the inserted event, and then resume.
      if (this.insertRequest) {
        this.paused = true; // Mark this event as paused
        await this.insertRequest(); // Execute the inserted event/logic
        this.insertRequest = null; // Clear the insert request
        this.paused = false; // Unmark as paused
      }
    }
    this.isFinished = true; // Mark the event as finished
    return this.data.result; // Return any result stored in the event's data
  }

  /**
   * 取消事件，仅在before阶段调用有效。
   * 如果事件被取消，后续的during和after阶段将不会执行。
   * @returns {GameEvent} - 返回自身。
   */
  cancel() {
    // Cancellation is only effective if called during the 'before' phase (or the first phase).
    if (this.currentPhase !== "before" && this.currentPhase !== this.timings[0]) {
      console.warn("Event can only be effectively cancelled during its 'before' phase.");
      // Allow cancellation but it might not prevent already executed parts of 'during' or 'after'
      // if called too late directly. Standard cancellation is checked after 'before' hooks.
    }
    this.isCancelled = true;
    return this;
  }

  /**
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
 * 继承自Event类，增加了一些游戏内特有的属性和方法。
 * Typically used for player choices or narrative moments within a sub-scene.
 * @param {string} EventType - 事件类型 (e.g., "PlayerChoice", "NarrativeBlock").
 * @param {Object<string, Function>} Options - An object where keys are identifiers for choices/options
 *                                            and values are the callback functions to execute when
 *                                            that choice is made.
 * @param {Function} Writer - A function responsible for presenting the event's text and options.
 *                            It takes a key (e.g., "name", "content", or an option key from `Options`)
 *                            and should return the displayable string (often using i18n).
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
          // Only proceed if the event hasn't already been resolved (e.g., by a pre-emptive hook)
          if (!self.data.result) {
            // Get the player's current location to ensure this event is appropriate.
            const curLocation = getPlayerInstance().currentLocation;
            // Do not show InGameEvents if player is in BattleScene (or other non-narrative scenes)
            if (curLocation !== "#BattleScene") {
              /** @type {UI} */
              const ui = getUIInstance(UI); // Get the main UI instance
              const currentScene = ui.getCurrentScene(); // Get the currently active scene

              // Ensure the current scene is a SubScene, where InGameEvents are typically displayed.
              if (currentScene instanceof SubScene) {
                // Use the Writer function to get the display text for the event's name and content.
                self.Writer("name"); // Typically displays the event title.
                self.Writer("content"); // Typically displays the main descriptive text of the event.

                const options = {}; // This will hold the display text and callback for each choice.
                // Iterate over the provided Options (choices) for this event.
                for (const i in self.data._options) {
                  // The key `i` is the internal identifier for the choice.
                  // `self.Writer(i)` translates this identifier to the displayable text for the button.
                  options[self.Writer(i)] = () => {
                    // When a choice button is clicked, create a new "playerMadeChoice" event.
                    // This new event wraps the original choice's callback.
                    game
                      .createEvent(
                        game.eventWrapper(
                          "playerMadeChoice", // Type of the new event
                          { // Data for the new event
                            ori_event: self, // Reference to this parent InGameEvent
                            _choice: i, // The internal identifier of the choice made
                            choice: self.Writer(i), // The display text of the choice made
                            _choices: self.data._options, // Original options object
                            choices: options, // Processed options with display text
                          },
                          { // Callbacks for the new event
                            during: async (choiceEvent, gameInstance) => {
                              // Execute the original callback associated with the chosen option.
                              if (
                                choiceEvent.data._choices[choiceEvent.data._choice] instanceof
                                Function
                              )
                                choiceEvent.data._choices[choiceEvent.data._choice]();
                            },
                          }
                        )
                      )
                      // After the "playerMadeChoice" event (and its 'during' callback) completes,
                      // resolve the promise of this InGameEvent, signaling it's done.
                      .addHook("after", async (choiceEvent, gameInstance) => {
                        this.resolveFunc(choiceEvent.data);
                      });
                  };
                }
                // Create the actual button UI elements for the choices.
                const btns = UI.createButtons(options);
                // Append the buttons to the story teller element (main narrative display area).
                getStoryTellerElement().append(...btns);

                // Find all elements with `hasDescription` attribute to attach tooltips.
                const nodeList = [
                  ...getStoryTellerElement().querySelectorAll(
                    "span[hasDescription]"
                  ),
                ];
                if (nodeList.length > 0) {
                  for (const node of nodeList) {
                    if (!node.hasTooltip) { // Avoid re-attaching tooltips
                      const title = node.textContent;
                      const description = node.getAttribute("data-description")
                        ? node.getAttribute("data-description") // Direct description
                        : i18n.th(node.getAttribute("data-description-at")); // Description from i18n
                      Animations.attachHoverDescription(
                        node,
                        title,
                        description
                      );
                    }
                  }
                }
                // Wait for the player to make a choice (which resolves `statePromise` via `resolveFunc`).
                await this.statePromise;
                // Once a choice is made and processed, remove the choice buttons.
                for (const btn of btns) {
                  btn.remove();
                }
                return self.data.result; // Return the result from the choice.
              } else {
                // If not in a SubScene, cancel this InGameEvent.
                self.cancel();
              }
            } else {
              // If in BattleScene, cancel this InGameEvent.
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
     * 全局触发器列表，按照事件类型和触发时机存储。
     * These are standard, non-persistent triggers.
     * e.g., this.globalTriggers["TimeUpdate"]["after"] = [func1, func2];
     * @type {Object<string, Object<string, Function[]>>}
     */
    this.globalTriggers = {};
    /**
     * 存档内全局触发器列表，按照事件类型、触发时机以及钩子标识符存储。
     * Triggers stored here are identified by a string key (from HookList) and are saved with the game.
     * When a save is loaded, these string identifiers are used to re-attach the corresponding
     * functions from `HookList`.
     * e.g., this.globalSaveTriggers["PlayerMove"]["before"] = ["onPlayerMoveHook1", "onPlayerMoveHook2"];
     * @type {Object<string, Object<string, string[]>>}
     */
    this.globalSaveTriggers = {};
    /**
     * 临时全局触发器列表，按照事件类型、触发时机和 unique symbol 存储。
     * Temporary global triggers are not saved with the game. They have a limited 'life',
     * meaning they are removed after being triggered a certain number of times.
     * This is useful for effects that should only last for a short duration or a specific number of events.
     * e.g., this.tempGlobalTriggers["MonsterDefeated"]["after"][Symbol()] = { hook: func, life: 1 };
     * @type {Object<string, Object<string, Object<string, {hook: Function, life: number}>>>}
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
   * 插入一个新事件到主事件队列。
   * If the event queue is not currently running, the event is executed immediately.
   * Otherwise, it's added to the end of the queue.
   * Global triggers are applied to the event before it's processed.
   * @param {GameEvent} event - 要插入的事件对象。
   * @returns {GameEvent} - The event that was inserted (returns the input event).
   */
  insertEvent(event) {
    this.applyGlobalTriggers(event); // Apply any relevant global triggers to this event.
    if (!this.isEventQueueRunning) {
      // If no event is currently running, execute this one immediately.
      this.currentEvent = event;
      this.executeEvent(event);
    } else {
      // If an event is already running, add this to the queue.
      this.eventQueue.push(event);
    }
    return event; // Return the event itself, allowing for chaining or reference.
  }
  /**
   * 创建并插入一个新事件作为当前正在执行事件的子事件。
   * The parent event is paused, the new child event is executed, and then the parent event resumes.
   * If there is no current event running, or if the current event already has an `insertRequest`
   * (meaning it's already trying to insert another child), this method falls back to `insertEvent`,
   * adding the event to the main queue instead.
   * Global triggers are applied to the event.
   * @param {GameEvent} event - 要插入的事件对象。
   * @returns {GameEvent} - The event that was created/inserted.
   */
  createEvent(event) {
    if (this.currentEvent) {
      const parentEvent = this.currentEvent;
      // Check if the parent event can accept a child event (i.e., no existing insertRequest).
      if (!parentEvent.insertRequest) {
        this.applyGlobalTriggers(event); // Apply global triggers to the new child event.
        parentEvent.childEvents.push(event); // Add to parent's list of children.
        event.parentEvent = parentEvent; // Set the parent reference.

        // Create a request on the parent event to execute this child event.
        // When the parent event's `execute` method checks `insertRequest`, this will run.
        parentEvent.insertRequest = async () => {
          this.currentEvent = event; // Set child as the current event for execution.
          await this.executeEvent(event); // Execute the child event.
          this.currentEvent = parentEvent; // Restore parent as the current event.
        };
      } else {
        // If parent already has an insertRequest, queue this event normally to avoid conflicts.
        this.insertEvent(event);
      }
    } else {
      // If there's no current event running, just insert this event into the main queue.
      this.insertEvent(event);
    }
    return event; // Return the event itself.
  }
  /**
   * 获取当前生效的所有全局触发器
   * @returns {Object<string, Object<string, Function[]>>} - 返回全局触发器列表
   */
  getGlobalTriggers() {
    return this.globalTriggers;
  }
  /**
   * 为新创建的事件应用全局触发器 (standard, save-persistent, and temporary).
   * @param {GameEvent} event - 新创建的事件对象.
   */
  applyGlobalTriggers(event) {
    const eventType = event.type;

    // Apply standard global triggers
    if (this.globalTriggers[eventType]) {
      const triggers = this.globalTriggers[eventType];
      for (let timing in triggers) { // 'before', 'during', 'after'
        if (triggers[timing]) {
          triggers[timing].forEach((hook) => {
            event.addHook(timing, hook);
          });
        }
      }
    }

    // Apply temporary global triggers
    if (this.tempGlobalTriggers[eventType]) {
      const tempTriggersForType = this.tempGlobalTriggers[eventType];
      for (let timing in tempTriggersForType) { // 'before', 'during', 'after'
        if (tempTriggersForType[timing]) {
          const triggersForTiming = tempTriggersForType[timing];
          for (const symbol in triggersForTiming) { // Iterate using unique symbols
            const triggerEntry = triggersForTiming[symbol];
            if (triggerEntry.life > 0) {
              // Wrap the original hook to manage its 'life' (number of times it can be triggered)
              const hookWrapper = async (...args) => {
                // Execute the actual hook
                const result = await triggerEntry.hook(...args);
                // If the hook logic implies it was "used" (convention might be for hook to return true), decrement life
                // Or, more simply, always decrement life after execution if specific return value isn't used.
                // For this example, let's assume any execution decrements life.
                triggerEntry.life -= 1;
                return result;
              };
              event.addHook(timing, hookWrapper);
            }
            // Clean up expired temporary triggers (optional here, could be a separate cleanup process)
            if (triggerEntry.life <= 0) {
              delete triggersForTiming[symbol];
            }
          }
        }
      }
    }
    // Note: Save-persistent triggers (this.globalSaveTriggers) are applied by resolving their string names
    // to functions from HookList during addGlobalTrigger. Those resolved functions are then part of
    // this.globalTriggers and are handled by the first block above.
  }
  /**
   * 获取下一个标识符
   * @returns {String} 一个不会出现冲突的标识符
   */
  getNextSymbol() {
    return this.symbol++;
  }
  /**
   * 添加全局触发器。
   * If `hook` is a string, it's treated as an identifier for a save-persistent hook from `HookList`.
   * The actual function is retrieved from `HookList` and stored in `this.globalTriggers`.
   * The string identifier is stored in `this.globalSaveTriggers` for persistence.
   * If `hook` is a function, it's added as a non-persistent global trigger.
   * @param {string} eventType - 要监听的事件类型.
   * @param {string} timing - 触发器的时机（before, during, after）.
   * @param {Function | string} hook - 要添加的钩子函数或钩子标识符.
   * @returns {Function} The actual function that was added as a trigger.
   */
  addGlobalTrigger(eventType, timing, hook) {
    // Ensure the structure for this eventType exists in globalTriggers
    if (!this.globalTriggers[eventType]) {
      this.globalTriggers[eventType] = { before: [], during: [], after: [] };
    }

    let isPersistentHook = typeof hook === 'string';
    let actualHookFunction;

    if (isPersistentHook) {
      // Ensure the structure for this eventType exists in globalSaveTriggers
      if (!this.globalSaveTriggers[eventType]) {
        this.globalSaveTriggers[eventType] = { before: [], during: [], after: [] };
      }
      // Store the string identifier for saving purposes
      if (!this.globalSaveTriggers[eventType][timing].includes(hook)) {
          this.globalSaveTriggers[eventType][timing].push(hook);
      }

      // Resolve the string identifier to an actual function from HookList.
      // The hook function from HookList is bound with a context that includes itself,
      // allowing for self-referential logic or removal if needed.
      if (HookList && HookList[hook]) {
        actualHookFunction = (...args) => {
          // Create a new context for each call, merging default HookContext with self-reference
          const executionContext = Object.assign({}, HookContext, { self: actualHookFunction });
          return HookList[hook].bind(executionContext)(...args);
        };
      } else {
        console.error(`Hook with identifier "${hook}" not found in HookList.`);
        return null; // Or throw an error
      }
    } else {
      // If hook is already a function, use it directly.
      actualHookFunction = hook;
    }

    // Add the (potentially resolved) function to the active globalTriggers.
    if (this.globalTriggers[eventType][timing] && actualHookFunction) {
      this.globalTriggers[eventType][timing].push(actualHookFunction);
    }
    return actualHookFunction; // Return the function that was actually added.
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
   * 执行事件，包括触发所有相关钩子。
   * Sets `isEventQueueRunning` to true while processing.
   * Processes the current event, then recursively calls itself for the next event in the queue.
   * @param {GameEvent} event - 要执行的事件对象。
   */
  async executeEvent(event) {
    console.log("Event:", event); // Log the event being executed.
    this.isEventQueueRunning = true; // Indicate that the event queue is active.
    this.currentEvent = event; // Set the currently executing event.

    // Execute the event's logic (which includes its own phases and hooks).
    await event.execute(this);

    // After the current event is finished:
    if (this.eventQueue.length === 0) {
      // If there are no more events in the queue, mark the queue as not running.
      this.isEventQueueRunning = false;
    } else {
      // If there are more events, take the next one from the queue and execute it.
      // This creates a recursive-like chain for sequential event processing.
      await this.executeEvent(this.eventQueue.shift()).catch((e) => {
        // Catch and re-throw errors to ensure they propagate up if not handled locally.
        throw e;
      });
    }
    // Once an event and any subsequent queued events are done (for this branch of execution),
    // clear the currentEvent if this was the top-level call for this event.
    // Note: In the recursive call, this.currentEvent is reset by the calling executeEvent's finally or next step.
    // However, if this is the last event in a chain, it should be cleared.
    if (!this.isEventQueueRunning) { // if queue truly empty now
        this.currentEvent = null;
    }
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
 * 输出日志信息，包括发起位置（文件名、行号、列号）和发起时间。
 * This function inspects the call stack to automatically determine the caller's location.
 * @param {...any} logText - 要输出的日志内容，可以传入多个参数，它们会被空格连接。
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

  // stackLines[0] is "Error"
  // stackLines[1] is the log() function itself
  // stackLines[2] is the actual caller of log()
  const callerInfoLine = stackLines[2] ? stackLines[2].trim() : "Unknown Caller";

  let functionName = "anonymous";
  let fileInfo = "unknown.js:0:0";

  // Try to parse out function name and file:line:column
  const match = callerInfoLine.match(/at (.*?) \((.*?)\)|at (.*)/);
  if (match) {
    if (match[1] && match[2]) { // Format: "at functionName (filePath)"
      functionName = match[1];
      fileInfo = match[2];
    } else if (match[3]) { // Format: "at filePath" (often for anonymous functions or global scope)
      fileInfo = match[3];
    }
  }

  // Extract just the filename and line/col from full path
  const simpleFileInfoMatch = fileInfo.match(/\/([^\/]+\.js:\d+:\d+)/);
  if (simpleFileInfoMatch && simpleFileInfoMatch[1]) {
    fileInfo = simpleFileInfoMatch[1];
    // If functionName was part of the path (e.g. "at Object.log (file.js:1:1)"),
    // try to clean it up.
    if(functionName.includes(fileInfo)) {
        functionName = functionName.split(" (")[0] || "anonymous";
    }
  } else {
      // Fallback for fileInfo if regex fails (e.g. different stack trace format)
      const lastPart = fileInfo.substring(fileInfo.lastIndexOf('/') + 1);
      if(lastPart) fileInfo = lastPart;
  }

  // Refine function name if it's "Object.log" or similar due to how it was called
  if (functionName.startsWith("Object.")) {
      functionName = functionName.substring("Object.".length);
  }
  if (functionName === callerInfoLine) functionName = "anonymous"; // If parsing failed to separate function name

  // 格式化输出日志
  console.log(
    `[${functionName}(${fileInfo})][${currentTime}]: ${logText.join(
      " "
    )}`
  );
}
