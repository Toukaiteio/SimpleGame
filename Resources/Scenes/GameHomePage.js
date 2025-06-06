import { Scene } from "../Classes/UI.js";
import { log } from "../Classes/Game.js";
import {
  getUIInstance,
  getGameInstance,
  getMapInstance,
  getPlayerInstance,
  setRandom,
} from "../Scripts/Shared.js";
import { i18n } from "../Classes/I18n.js";
import { General_Skills } from "../Scripts/Skills/General.js";
import { SeededRandom } from "../Classes/Random.js";
import { Save, SaveController } from "../Classes/Save.js";
import { audioManager } from "../Classes/Audio.js";
const ui = getUIInstance();
const game = getGameInstance();
/**
 * 游戏主页场景类
 * 显示“开始游戏”、“读取存档”、“设置”三个选项。
 */
class GameHomePage extends Scene {
  /**
   * 创建一个新的 GameHomePage 实例。
   * 在构造函数中初始化场景，设置组件和事件处理程序。
   */
  constructor() {
    super("GameHomePage"); // 调用父类的构造函数，设置场景ID
    // 创建“开始游戏”按钮
    this.createButton("startGame", () => {
      this.startGame();
      audioManager.playBGM("Game Over Zyanaimon");
    });
    this.saves = SaveController.getSaveSlots();
    // 创建“读取存档”按钮
    if (Object.keys(this.saves).length > 0) {
      this.createButton("loadGame", () => {
        this.loadGame();
      });
    }

    // 创建“设置”按钮
    this.createButton("settings", () => {
      this.showSettings();
    });
  }
  render(container) {
    audioManager.playBGM("Ohirusugi");
    super.render(container);
  }
  /**
   * 使用 createComponent 方法创建一个按钮。
   * @param {string} id - 按钮的唯一标识符。
   * @param {string} text - 按钮上显示的文本。
   * @param {Function} onClick - 按钮点击时的处理函数。
   */
  createButton(id, onClick) {
    this.createComponent(id, "button", {
      text: i18n.t(id),
      onClick: onClick,
    });
  }

  /**
   * 处理开始游戏按钮的点击事件。
   * 实现开始新游戏的逻辑，例如加载新游戏场景。
   */
  async startGame() {
    log("Starting new game...");
    // for (const i in General_Skills) {
    //   if (General_Skills[i]["isLearnedByPlayer"]) {
    //     getPlayerInstance().learnSkill(new General_Skills[i]["skill"]());
    //   }
    // }

    getPlayerInstance()
      .getSelfJson(true)
      .addHook("after", (self) => {
        const tempSave = new Save(self.data.result, "KingdomPalace");
        tempSave.load();
      });
    // tempSave.load();
  }

  /**
   * 处理读取存档按钮的点击事件。
   * 实现读取存档的逻辑，例如显示存档选择界面。
   */
  loadGame() {
    log("Loading saved game...");
    // 在这里实现读取存档的逻辑
    // 例如，展示存档选择界面
    // ui.displayScene("GameSaveList");
    this.saves[i18n.t("default_save")].load();
  }

  /**
   * 处理设置按钮的点击事件。
   * 实现打开设置界面的逻辑，例如显示设置选项。
   */
  showSettings() {
    log("Opening settings...");
    // 在这里实现打开设置界面的逻辑
    // 例如，展示设置界面
  }
}

// 导出 GameHomePage 类作为默认模块
export default GameHomePage;
