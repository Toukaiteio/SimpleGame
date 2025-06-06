// 1、玩家状态与位置
// 2、物品状态
import {
  getPlayerInstance,
  getGameInstance,
  getUIInstance,
  setRandom,
} from "../Scripts/Shared.js";
import { i18n } from "./I18n.js";
import { General_Skills } from "../Scripts/Skills/General.js";
import { SeededRandom } from "./Random.js";
import { log } from "./Game.js";
export class Save {
  static HasSaveRunning = false;
  constructor(player, location,hookList = [], saveName = null) {
    this.player = player;
    this.location = location;
    this.hookList = hookList;
    this.gameSettings = getGameInstance().gameSettings;
    this.saveName = i18n.t("default_save")
  }
  save() {
    const oSaveSlots = SaveController.getSaveSlots();
    oSaveSlots[this.saveName] = {
      player: this.player,
      location: this.location,
      saveName: this.saveName,
      gameSettings: this.gameSettings,
    };
    localStorage.setItem("game-local-saves", JSON.stringify(oSaveSlots));
  }
  load() {
    if (!Save.HasSaveRunning) {
      Save.HasSaveRunning = true;
      SaveController.setInstance(new SaveController(this));
    }
  }
}
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
        SaveController.instance.runningSave.player = result;
        const curLocation = getPlayerInstance().currentLocation;
        if (curLocation != "#BattleScene")
          SaveController.instance.runningSave.location = curLocation.startsWith(
            "#"
          )
            ? curLocation.replace("#", "")
            : curLocation;
      });
  }
  static getInstance() {
    if (!SaveController.instance) {
      throw new Error("SaveController not initialized");
    }
    return SaveController.instance;
  }
  static getSaveSlots() {
    const saves = JSON.parse(localStorage.getItem("game-local-saves")) || {};
    const result = {};
    if (saves instanceof Object) {
      for (const i in saves) {
        result[i] = new Save(
          saves[i].player,
          saves[i].location,
          saves[i].saveName
        );
      }
      return result;
    } else return {};
  }
}
