import { GameEvent } from './GameEvent.js';
import {
  getStoryTellerElement,
  getUIInstance,
  getPlayerInstance,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { Animations } from "./Animations.js";
import { SubScene } from "./SubScene.js";
import { UI } from "./UI.js";

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
