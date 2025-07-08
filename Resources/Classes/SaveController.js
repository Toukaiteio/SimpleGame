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
          after: async (self, game) => {
            // 在应用JSON之前，手动重建物品实例
            if (runningSave.player.inventory) {
              const newInventory = {};
              for (const itemId in runningSave.player.inventory) {
                newInventory[itemId] = [];
                for (const itemData of runningSave.player.inventory[itemId]) {
                  const itemInstance = await getGameInstance().createItem(itemData);
                  newInventory[itemId].push(itemInstance);
                }
              }
              runningSave.player.inventory = newInventory;
            }

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
  // 获取原始存档对象（不实例化Save）
  static getSaveSlotsRaw() {
    const saves = JSON.parse(localStorage.getItem("game-local-saves")) || {};
    // 保证有6个槽
    for (let i = 1; i <= 6; i++) {
      if (!saves[`slot${i}`]) saves[`slot${i}`] = null;
    }
    return saves;
  }
  // 获取实例化后的存档对象
  static getSaveSlots() {
    const saves = SaveController.getSaveSlotsRaw();
    const result = {};
    for (let i = 1; i <= 6; i++) {
      const slot = saves[`slot${i}`];
      if (slot) {
        result[`slot${i}`] = new Save(
          slot.player,
          slot.location,
          slot.hookList || [],
          slot.saveName,
          slot.meta || {}
        );
      } else {
        result[`slot${i}`] = null;
      }
    }
    return result;
  }
  // 存档到指定槽
  static saveToSlot(save, slot) {
    save.save(slot);
  }
}
