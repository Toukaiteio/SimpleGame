import { getPlayerInstance, getGameInstance, getUIInstance, setRandom } from "../Scripts/Shared.js";
import { SeededRandom } from "./Random.js";
import { log } from "./Utils.js"; // Corrected path
import { Save } from "./Save.js";
import { i18n } from "./I18n.js";

export class SaveController {
  static instance = null;
  constructor(runningSave) {
    this.runningSave = runningSave;
    const game = getGameInstance();
    const ui = getUIInstance();
    const next = game
      .eventWrapper(
        "gameStart",
        {
          player_data: {},
          player: getPlayerInstance(),
        },
        {
          after: (self, game) => {
            self.data.player
            .applySelfJson(runningSave.player)
            .addHook("after", () => {
              getGameInstance().gameSettings = runningSave.gameSettings;
              setRandom(new SeededRandom(SeededRandom.getRandom()));

              ui.displayScene("GameStoryTeller");

              ui.getScene("GameStoryTeller").switchToSubScene(
                runningSave.location
              );
            })
          },
        }
      )
      game.createEvent(next);
  }
  static setInstance(instance) {
    SaveController.instance = instance;
  }
  static async updateSave(){
    await getPlayerInstance()
      .getSelfJson()
      .then((result) => {
        if (SaveController.instance && SaveController.instance.runningSave) {
          SaveController.instance.runningSave.player = result;
          const curLocation = getPlayerInstance().currentLocation;
          if (curLocation != "#BattleScene") {
            SaveController.instance.runningSave.location = curLocation.startsWith(
              "#"
            )
              ? curLocation.replace("#", "")
              : curLocation;
          }
        } else {
          log("Error: SaveController instance or runningSave is not available for update.");
        }
      });
  }
  static getInstance() {
    if (!SaveController.instance) {
      // Consider creating a default save or handling this state more gracefully
      log("SaveController not initialized, attempting to get a default save slot or creating new.");
      const slots = SaveController.getSaveSlots();
      const defaultSaveName = i18n.t("default_save");
      if (slots[defaultSaveName]) {
         new Save(slots[defaultSaveName].player, slots[defaultSaveName].location, slots[defaultSaveName].hookList, defaultSaveName).load();
      } else {
        // If no default save exists, create a new one and load it.
        // This might require default player/location data.
        log("No default save slot found, creating a new session.");
        // This part is tricky without knowing how a new game is typically started.
        // For now, let's throw an error as per original logic, but ideally, it should recover.
        throw new Error("SaveController not initialized and no default save to load.");
      }
    }
    return SaveController.instance;
  }
  static getSaveSlots() {
    const saves = JSON.parse(localStorage.getItem("game-local-saves")) || {};
    const result = {};
    if (saves instanceof Object) {
      for (const i in saves) {
        // Corrected Save instantiation
        result[i] = new Save(
          saves[i].player,
          saves[i].location,
          saves[i].hookList || [], // Ensure hookList is an array
          saves[i].saveName
        );
      }
      return result;
    } else return {};
  }
}
