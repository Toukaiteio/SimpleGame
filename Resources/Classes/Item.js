import { getPlayerInstance,getGameInstance } from "../Scripts/Shared.js";
import { ItemBuffs } from "../Scripts/Buffs/Items.js";
/**
 * @class Item
 * @classdesc 表示游戏中的一个物品实例，包含物品的基本属性、强化机制、装备和使用效果等。
 */
export class Item {
  /**
   * 创建一个Item实例。
   * @param {Object} params - 初始化物品的参数。
   * @param {string} params.item_id - 物品的唯一标识符。
   * @param {string} params.item_name - 物品的名称。
   * @param {string} params.item_desc - 物品的描述。
   * @param {boolean} [params.is_usable=false] - 物品是否可使用。
   * @param {boolean} [params.is_equipable=false] - 物品是否可装备。
   * @param {string|null} [params.equip_slot=null] - 物品可以装备的槽位（如手、双手等）。
   * @param {boolean} [params.is_enhanceable=false] - 物品是否可以强化。
   * @param {Object} [params.enhance_storage={}] - 物品的强化相关信息。
   * @param {Object} [params.enhance_list={}] - 强化列表，包含每次强化的消耗和效果。
   * @param {boolean} [params.is_tradeable=false] - 物品是否可以交易。
   * @param {Object} [params.item_status={}] - 物品的状态（如攻击力、售价等）。
   * @param {Function} [params.onEquipDo=[]] - 物品装备时触发的回调函数。
   * @param {Function} [params.onUnwieldDo=[]] - 物品取消装备时触发的回调函数。
   * @param {Function} [params.onUseDo=[]] - 物品使用时触发的回调函数。
   * @param {Player | Monster} [owner=getPlayerInstance()] - 物品的拥有者。
   */
  constructor(
    item_id,
    item_name,
    item_desc,
    is_usable = false,
    is_equipable = false,
    equip_slot = null,
    is_enhanceable = false,
    enhance_storage = {},
    is_tradeable = false,
    item_status = {},
    onEquipDo = [],
    onUnwieldDo = [],
    onUseDo = [],
    owner = getPlayerInstance(),
  ) {
    // 设置基本属性
    this.item_id = item_id;
    this.item_name = item_name;
    this.item_desc = item_desc;
    this.is_usable = is_usable;
    this.is_equipable = is_equipable;
    this.equip_slot = equip_slot;
    this.is_enhanceable = is_enhanceable;
    this.enhance_storage = enhance_storage;
    this.is_tradeable = is_tradeable;
    this.item_status = item_status;
    this.onEquipDo = onEquipDo;
    this.onUnwieldDo = onUnwieldDo;
    this.onUseDo = onUseDo;
    this.owner = owner;
    this.use_time = 1;
  }
  /** 物品被使用时回调 */
  onUse(status,target){
    return;
  }
  /**
    * 增加物品的使用次数。
    * @param {number} num - 增加的次数。
    */
  addUseTime(num){
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "addUseTime",
        { num, item: this },
        {
          during: async (self, game) => {
            const item = self.data.item;
            item.use_time += num;
          },
        }
      )
    );
  }
  /**
   * 减少物品的使用次数。
   * @param {number} num - 减少的次数。
   */
  costUseTime(num){
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "costUseTime",
        { num, item: this },
        {
          during: async (self, game) => {
            const item = self.data.item;
            if(item.use_time > num){
              item.use_time -= num;
            }else{
              item.use_time = 0;
              // delete item.owner.inventory[item.item_id];
            }
          },
        }
      )
    );
  }
  /**
   * 强化流程变更为如下：
   * 1、设定强化路径，每个不同的武器强化路径有着对应强化后武器ID
   * 2、玩家选择目标武器，然后向玩家背包中添加此武器，并将原武器删除
   */
  enhance(player) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "enhance",
        { item: this, player: player },
        {
          after: async (self, game) => {
            const item = self.data.item;
            if (
              item.is_enhanceable
            ) {

            }
          },
        }
      )
    );
  }

  /**
   * 装备物品时触发，调用装备的回调函数。
   */
  equip(player) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "equip",
        { item: this, player: player }, // 没有参数传入
        {
          after: async (self, game) => {
            const item = self.data.item;
            if (item.is_equipable) {
              for(const i of item.onEquipDo){
                i(item,self.data.player);
              }
            }
          },
        }
      )
    );
  }

  /**
   * 取消装备物品时触发，调用取消装备的回调函数。
   * @param {Player} player
   */
  unwield(player) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "unwield",
        { item: this, player: player }, // 没有参数传入
        {
          after: async (self, game) => {
            const item = self.data.item;
            for(const i of item.onUnwieldDo){
              i(item,self.data.player)
            }
          },
        }
      )
    );
  }

  /**
   * 使用物品时触发，调用使用的回调函数。
   */
  use(target = getPlayerInstance()) {
    const game = getGameInstance();
    return game.insertEvent(
      game.eventWrapper(
        "use",
        { item: this , target }, // 没有参数传入
        {
          after: async (self, game) => {
            const item = self.data.item;
            if (item.is_usable) {
              for(const i of item.onUseDo){
                i(item,self.data.target)
              }
            }
          },
        }
      )
    )
  }
  /**
   * 获取当前物品的关键信息，并返回一个JSON字符串。
   * 只包含可能会变化的属性。
   */
  getSelfJson() {
    return game.insertEvent(
      game.eventWrapper(
        "getSelfJson",
        { item: this },
        {
          after: async (self, game) => {
            const item = self.data.item;
            const jsonObject = {
              item_id: item.item_id,
              item_name: item.item_name,
              item_desc: item.item_desc,
              use_time:this.use_time
            };
            self.result = JSON.stringify(jsonObject);
          },
        }
      )
    );
  }
}

/**
 * 从物品数据定义中加载物品，并将其转化为ITEM类的实例。
 * @param {Object} itemData - 物品数据定义对象。
 * @returns {Item} 返回转化后的ITEM类实例。
 */
export function loadItem(itemData) {
  const transformedData = { ...itemData };

  // 将字符串形式的函数名转换为实际的函数引用
  for (const key in transformedData.enhance_list) {
    if (
      transformedData.enhance_list[key].cost &&
      typeof transformedData.enhance_list[key].cost === "string"
    ) {
      transformedData.enhance_list[key].cost =
        transformedData[transformedData.enhance_list[key].cost];
    }
    if (
      transformedData.enhance_list[key].enhance &&
      typeof transformedData.enhance_list[key].enhance === "string"
    ) {
      transformedData.enhance_list[key].enhance =
        transformedData[transformedData.enhance_list[key].enhance];
    }
  }

  return new Item(transformedData);
}
