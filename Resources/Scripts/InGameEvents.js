import { InGameEvent } from "../Classes/Game.js";
import { i18n } from "../Classes/I18n.js";
import { Player } from "../Classes/Player.js";
import {
  getStoryTellerElement,
  getPlayerInstance,
  getGameInstance,
} from "./Shared.js";
import { Animations } from "../Classes/UI.js";
import { SeededRandom } from "../Classes/Random.js";
const writeH = Animations.writeWithHTML;
export class InGameEvents {
  static instance = null;
  static getInstance() {
    if (InGameEvents.instance == null) {
      InGameEvents.instance = new InGameEvents();
    }
    return InGameEvents.instance;
  }
  static allowEnteringSubscene = ["BerryForest", "BareGround","MiddleTown"];
  static randomChoose(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  constructor() {
    const move_out_correctly = () => {
      /** @type {Player} */
      const player = getPlayerInstance();
      player.moveTo(
        "#" +
          InGameEvents.randomChoose(InGameEvents.allowEnteringSubscene)
      );
    };
    const move_out_wrongly = () => {
      /** @type {Player} */
      const player = getPlayerInstance();
      player.moveTo(
        "#" +
          InGameEvents.randomChoose(InGameEvents.allowEnteringSubscene)
      );
    }
    this._events = {
      hero_start_adventure: [
        "hero_go_for_princess",
        {
          ready() {
            /** @type {Player} */
            const player = getPlayerInstance();
            player
              .moveTo("#BerryForest")
              .addHook("after", async (self, game) => {
                player.giveItem("broken_hero_sword");
                getPlayerInstance().addFlag("has_leaved_palace", true);
              });
          },
        },
        (key) => {
          switch (key) {
            case "name":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_start_adventure")
              );
              return null;
            case "content":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_start_adventure_log_1")
              );
              return null;
            case "event_end":
              return null;
            default:
              return "hero_start_adventure_" + key;
          }
        },
      ],
      hero_do_first_action: [
        "hero_do_first_action",
        {
          goBackPalace() {
            /** @type {Player} */
            const player = getPlayerInstance();
            player
              .moveTo("#KingdomPalace")
              .addHook("after", async (self, game) => {
                getPlayerInstance().addFlag("back_palace_at_just_begin", true);
              });
          },
          goCorrectPath:() =>{getPlayerInstance().addFlag("has_done_all_begin_dialog",true);move_out_correctly();},
          goWrongPath:() =>{getPlayerInstance().addFlag("has_done_all_begin_dialog",true);move_out_wrongly();},
        },
        (key) => {
          switch (key) {
            case "name":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_start_adventure")
              );
              return null;
            case "content":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_go_first_action_log_1")
              );
              return null;
            case "event_end":
              return null;
            default:
              return "hero_do_first_action_" + key;
          }
        },
      ],
      hero_do_second_action: [
        "hero_do_first_action",
        {
          goCorrectPath:() =>{getPlayerInstance().addFlag("has_done_all_begin_dialog",true);move_out_correctly();},
          goWrongPath:() =>{getPlayerInstance().addFlag("has_done_all_begin_dialog",true);move_out_wrongly();},
        },
        (key) => {
          switch (key) {
            case "name":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_start_adventure")
              );
              return null;
            case "content":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_go_first_action_log_1")
              );
              return null;
            default:
              return "hero_do_first_action_" + key;
          }
        },
      ],
      hero_got_kicked_off: [
        "hero_got_kicked_off",
        {
          leavePalace() {
            /** @type {Player} */
            i18n.m("info_hero", i18n.t("info_hero_loser"));
            const player = getPlayerInstance();
            player.moveTo("#BerryForest");
          },
        },
        (key) => {
          switch (key) {
            case "name":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_got_kicked_off")
              );
              return null;
            case "content":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_got_kicked_off_log_1")
              );
              return null;
            default:
              return "hero_got_kicked_off_" + key;
          }
        },
      ],
      hero_find_a_town:[
        "hero_find_a_town",
        {
          explore() {
            /** @type {Player} */
            const player = getPlayerInstance();
            player
              .modifyAttribute(player._status.charm - 99, "charm")
              .addHook("after", async (self, game) => {
                writeH(getStoryTellerElement(), i18n.f("status_decline_info",{
                  StatusName: i18n.t("status_charm"),
                  Count: self.data.current - self.data.value,
                }));
              });
            player.setFlag("player_saved_lona",false);
            player.setFlag("npc_lona_dead",true);
            writeH(getStoryTellerElement(), i18n.t("important_npc_dead_warning"));
          },
          check() {
            /** @type {Player} */
            const player = getPlayerInstance();
            player
              .modifyAttribute(player._status.charm + 2, "charm")
              .addHook("after", async (self, game) => {
                writeH(getStoryTellerElement(), i18n.f("status_up_info",{
                  StatusName: i18n.t("status_charm"),
                  Count:self.data.value - self.data.current,
                }));
              });
            player.setFlag("player_saved_lona",true);
            player.setFlag("lona_likability",15);
            // 触发下一个事件 hero_save_lona
          }
        },
        (key) => {
          switch (key) {
            case "name":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_find_a_town")
              );
              return null;
            case "content":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_find_a_town_log_1")
              );
              return null;
            default:
              return "hero_find_a_town_" + key;
          }
        },
      ],
      hero_save_lona:[
        "hero_save_lona",
        {
          fight() {
            /** @type {Player} */
            const player = getPlayerInstance();
            
            // Create A fight
          },
          talk() {
            /** @type {Player} */
            const player = getPlayerInstance();
            
            // Do a charm judge
          }
        }
      ]
    };
    this.events = {
      hero_find_free_money: [
        "hero_find_free_money",
        {
          pickUp() {
            /** @type {Player} */
            const player = getPlayerInstance();
            player.addCoins(5).addHook("after", async (self, game) => {
              writeH(
                getStoryTellerElement(),
                i18n.f("pick_up_info", {
                  ItemName: i18n.t("info_status_coin"),
                  ItemCount: self.data.amount,
                })
              );
            });
          },
          leave() {
            /** @type {Player} */
            const player = getPlayerInstance();
            player.addFlag("leave_the_free_money", 1);
            if (player.getFlag("leave_the_free_money") >= 3) {
              player
                .modifyAttribute(player._status.charm + 1, "charm")
                .addHook("after", async (self, game) => {
                  writeH(getStoryTellerElement(), i18n.f("status_up_info",{
                    StatusName: i18n.t("status_charm"),
                    Count: self.data.value - self.data.current,
                  }));
                });
              player.setFlag("leave_the_free_money", 0);
            }
          },
        },
        (key) => {
          switch (key) {
            case "name":
              writeH(
                getStoryTellerElement(),
                i18n.t("ingame_event_hero_find_free_money")
              );
              return null;
            case "content":
              writeH(
                getStoryTellerElement(),
                i18n.f("ingame_event_hero_find_free_money_log_1", {
                  CurrentLocation: i18n.t(
                    getPlayerInstance().currentLocation.startsWith("#")
                      ? getPlayerInstance().currentLocation.slice(1)
                      : getPlayerInstance().currentLocation
                  ),
                })
              );
              return null;
            case "event_end":
              return null;
              break;
            default:
              return "hero_find_free_money_" + key;
          }
        },
      ],

    };
    this.move_out_event = [
      "move_out",
      {
        goCorrectPath:move_out_correctly,
        goWrongPath:move_out_wrongly,
      },
      (key) => {
        switch (key) {
          case "name":
            writeH(getStoryTellerElement(), i18n.t("ingame_event_move_out"));
            return null;
          case "content":
            writeH(
              getStoryTellerElement(),
              i18n.t("ingame_event_move_out_log_1")
            );
            return null;
          case "event_end":
            return null;
          default:
            return "move_out_" + key;
        }
      },
    ];
    this.events_list = Object.keys(this.events);
  }
  getAvailableEvents() {
    return this.events_list;
  }
  starter_event_trigger(event_name) {
    if (this._events[event_name]) {
      return getGameInstance().insertEvent(
        new InGameEvent(...this._events[event_name])
      ).addHook("after",(self,game) =>{
        getGameInstance().allowSave = false;
      });
    }
  }
  trigger(event_name,chance = 100) {
    if (this.events[event_name] && SeededRandom.randomProbability(chance)) {
      return getGameInstance().insertEvent(
        new InGameEvent(...this.events[event_name])
      ).addHook("after",(self,game) =>{
        getGameInstance().allowSave = false;
      });
    }
  }
  trigger_move_out_event() {
    return getGameInstance().insertEvent(
      new InGameEvent(...this.move_out_event)
    );
  }
  get(event_name) {
    return this.events[event_name];
  }
  set(event_name, event) {
    if (event instanceof InGameEvent) this.events[event_name] = event;
  }
}
