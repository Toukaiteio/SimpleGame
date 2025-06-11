/**
 * 物品系统 - 管理游戏中的物品、装备和背包
 */
import messageManager from './MessageManager.js';
import errorHandler from './ErrorHandler.js';

// 物品类型枚举
export const ItemType = {
    CONSUMABLE: 'consumable',  // 消耗品
    EQUIPMENT: 'equipment',    // 装备
    MATERIAL: 'material',      // 材料
    QUEST: 'quest',            // 任务物品
    MISC: 'misc'               // 杂项
};

// 装备类型枚举
export const EquipmentType = {
    HEAD: 'head',          // 头部
    BODY: 'body',          // 身体
    HANDS: 'hands',        // 手部
    LEGS: 'legs',          // 腿部
    FEET: 'feet',          // 脚部
    ACCESSORY: 'accessory',// 饰品
    WEAPON: 'weapon',      // 武器
    SHIELD: 'shield'       // 盾牌
};

// 稀有度枚举
export const Rarity = {
    COMMON: 'common',      // 普通
    UNCOMMON: 'uncommon',  // 优秀
    RARE: 'rare',          // 稀有
    EPIC: 'epic',          // 史诗
    LEGENDARY: 'legendary' // 传说
};

/**
 * 物品类 - 表示游戏中的物品
 */
export class Item {
    constructor(config) {
        this.id = config.id || crypto.randomUUID();
        this.name = config.name || 'Unknown Item';
        this.description = config.description || '';
        this.type = config.type || ItemType.MISC;
        this.rarity = config.rarity || Rarity.COMMON;
        this.stackable = config.stackable !== undefined ? config.stackable : false;
        this.maxStack = config.maxStack || 1;
        this.count = config.count || 1;
        this.icon = config.icon || 'default_item.png';
        this.value = config.value || 0;
        this.usable = config.usable !== undefined ? config.usable : false;
        this.stats = config.stats || {};
        this.durability = config.durability !== undefined ? config.durability : null;
        this.maxDurability = config.maxDurability !== undefined ? config.maxDurability : null;
        this.level = config.level || 1;
        this.enhanceLevel = config.enhanceLevel || 0;
        this.equipmentType = config.equipmentType || null;
        this.effects = config.effects || [];
        this.requirements = config.requirements || {};
        this.onUse = config.onUse || null;
        this.onEquip = config.onEquip || null;
        this.onUnequip = config.onUnequip || null;
    }

    /**
     * 检查物品是否可堆叠
     * @returns {boolean} 是否可堆叠
     */
    isStackable() {
        return this.stackable && this.count < this.maxStack;
    }

    /**
     * 检查物品是否为装备
     * @returns {boolean} 是否为装备
     */
    isEquipment() {
        return this.type === ItemType.EQUIPMENT;
    }

    /**
     * 检查物品是否可使用
     * @returns {boolean} 是否可使用
     */
    isUsable() {
        return this.usable && (this.durability === null || this.durability > 0);
    }

    /**
     * 检查物品是否已损坏
     * @returns {boolean} 是否已损坏
     */
    isBroken() {
        return this.durability !== null && this.durability <= 0;
    }

    /**
     * 使用物品
     * @param {Object} player - 玩家对象
     * @returns {boolean} 是否使用成功
     */
    use(player) {
        if (!this.isUsable()) {
            errorHandler.handleItemError(errorHandler.errorCodes.CANNOT_USE_ITEM, this);
            return false;
        }

        // 如果有自定义使用函数，调用它
        if (typeof this.onUse === 'function') {
            const result = this.onUse(player, this);
            if (result === false) return false;
        }

        // 应用物品效果
        this.applyEffects(player);

        // 减少耐久度
        if (this.durability !== null) {
            this.durability--;
            if (this.durability <= 0) {
                messageManager.warning('message_item_broken');
            }
        }

        // 如果是消耗品，减少数量
        if (this.type === ItemType.CONSUMABLE) {
            this.count--;
        }

        messageManager.success('message_item_used', [this.name]);
        return true;
    }

    /**
     * 应用物品效果
     * @param {Object} target - 效果目标
     */
    applyEffects(target) {
        if (!this.effects || !this.effects.length) return;

        this.effects.forEach(effect => {
            if (effect.type === 'heal') {
                target.health += effect.value;
                if (target.health > target.maxHealth) {
                    target.health = target.maxHealth;
                }
            } else if (effect.type === 'mana') {
                target.mana += effect.value;
                if (target.mana > target.maxMana) {
                    target.mana = target.maxMana;
                }
            } else if (effect.type === 'buff') {
                // 添加buff到目标
                if (target.addBuff) {
                    target.addBuff(effect.buffId, effect.duration);
                }
            }
        });
    }

    /**
     * 获取物品的JSON表示
     * @returns {Object} 物品的JSON表示
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            rarity: this.rarity,
            stackable: this.stackable,
            maxStack: this.maxStack,
            count: this.count,
            icon: this.icon,
            value: this.value,
            usable: this.usable,
            stats: this.stats,
            durability: this.durability,
            maxDurability: this.maxDurability,
            level: this.level,
            enhanceLevel: this.enhanceLevel,
            equipmentType: this.equipmentType,
            effects: this.effects,
            requirements: this.requirements
        };
    }

    /**
     * 从JSON创建物品
     * @param {Object} json - 物品的JSON表示
     * @returns {Item} 创建的物品
     */
    static fromJSON(json) {
        return new Item(json);
    }

    /**
     * 克隆物品
     * @returns {Item} 克隆的物品
     */
    clone() {
        return Item.fromJSON(this.toJSON());
    }
}

/**
 * 物品管理器类 - 管理物品的创建和注册
 */
export class ItemManager {
    constructor() {
        this.itemTemplates = new Map();
        this.i18n = null;
    }

    /**
     * 设置国际化实例
     * @param {Object} i18nInstance - I18n实例
     */
    setI18n(i18nInstance) {
        this.i18n = i18nInstance;
    }

    /**
     * 注册物品模板
     * @param {string} templateId - 模板ID
     * @param {Object} config - 物品配置
     */
    registerItemTemplate(templateId, config) {
        this.itemTemplates.set(templateId, config);
    }

    /**
     * 批量注册物品模板
     * @param {Object} templates - 物品模板对象
     */
    registerItemTemplates(templates) {
        for (const [id, config] of Object.entries(templates)) {
            this.registerItemTemplate(id, config);
        }
    }

    /**
     * 创建物品
     * @param {string} templateId - 模板ID
     * @param {Object} overrides - 覆盖默认配置的属性
     * @returns {Item|null} 创建的物品或null
     */
    createItem(templateId, overrides = {}) {
        const template = this.itemTemplates.get(templateId);
        if (!template) {
            console.error(`Item template not found: ${templateId}`);
            return null;
        }

        // 合并模板和覆盖属性
        const config = { ...template, ...overrides };
        
        // 如果有国际化实例，翻译名称和描述
        if (this.i18n) {
            if (config.nameKey && this.i18n.exists(config.nameKey)) {
                config.name = this.i18n.t(config.nameKey);
            }
            if (config.descriptionKey && this.i18n.exists(config.descriptionKey)) {
                config.description = this.i18n.t(config.descriptionKey);
            }
        }

        return new Item(config);
    }

    /**
     * 获取物品模板
     * @param {string} templateId - 模板ID
     * @returns {Object|null} 物品模板或null
     */
    getItemTemplate(templateId) {
        return this.itemTemplates.get(templateId) || null;
    }

    /**
     * 获取所有物品模板
     * @returns {Map} 物品模板Map
     */
    getAllItemTemplates() {
        return this.itemTemplates;
    }
}

/**
 * 背包类 - 管理玩家的物品栏
 */
export class Inventory {
    constructor(size = 20) {
        this.size = size;
        this.slots = new Array(size).fill(null);
        this.onItemAdded = null;
        this.onItemRemoved = null;
        this.onItemUpdated = null;
    }

    /**
     * 添加物品到背包
     * @param {Item} item - 要添加的物品
     * @returns {boolean} 是否添加成功
     */
    addItem(item) {
        if (!item) return false;

        // 如果物品可堆叠，尝试合并
        if (item.stackable) {
            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                if (slot && slot.name === item.name && slot.isStackable()) {
                    const spaceLeft = slot.maxStack - slot.count;
                    const amountToAdd = Math.min(item.count, spaceLeft);
                    
                    slot.count += amountToAdd;
                    item.count -= amountToAdd;
                    
                    if (this.onItemUpdated) {
                        this.onItemUpdated(i, slot);
                    }
                    
                    if (item.count <= 0) {
                        return true;
                    }
                }
            }
        }

        // 找到空槽位
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = item;
                
                if (this.onItemAdded) {
                    this.onItemAdded(i, item);
                }
                
                return true;
            }
        }

        // 背包已满
        errorHandler.handleError(errorHandler.errorCodes.INVENTORY_FULL);
        return false;
    }

    /**
     * 从背包移除物品
     * @param {number} slotIndex - 槽位索引
     * @param {number} count - 要移除的数量
     * @returns {Item|null} 移除的物品或null
     */
    removeItem(slotIndex, count = 1) {
        if (slotIndex < 0 || slotIndex >= this.slots.length) {
            return null;
        }

        const item = this.slots[slotIndex];
        if (!item) {
            return null;
        }

        if (item.count <= count) {
            // 移除整个物品
            this.slots[slotIndex] = null;
            
            if (this.onItemRemoved) {
                this.onItemRemoved(slotIndex, item);
            }
            
            return item;
        } else {
            // 减少数量
            item.count -= count;
            
            if (this.onItemUpdated) {
                this.onItemUpdated(slotIndex, item);
            }
            
            // 创建一个新物品实例返回
            const removedItem = item.clone();
            removedItem.count = count;
            return removedItem;
        }
    }

    /**
     * 获取槽位中的物品
     * @param {number} slotIndex - 槽位索引
     * @returns {Item|null} 槽位中的物品或null
     */
    getItem(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.slots.length) {
            return null;
        }
        return this.slots[slotIndex];
    }

    /**
     * 交换两个槽位的物品
     * @param {number} fromIndex - 源槽位索引
     * @param {number} toIndex - 目标槽位索引
     * @returns {boolean} 是否交换成功
     */
    swapItems(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.slots.length ||
            toIndex < 0 || toIndex >= this.slots.length) {
            return false;
        }

        const temp = this.slots[fromIndex];
        this.slots[fromIndex] = this.slots[toIndex];
        this.slots[toIndex] = temp;

        if (this.onItemUpdated) {
            this.onItemUpdated(fromIndex, this.slots[fromIndex]);
            this.onItemUpdated(toIndex, this.slots[toIndex]);
        }

        return true;
    }

    /**
     * 获取背包中的所有物品
     * @returns {Array} 物品数组
     */
    getAllItems() {
        return this.slots.filter(item => item !== null);
    }

    /**
     * 获取背包的JSON表示
     * @returns {Object} 背包的JSON表示
     */
    toJSON() {
        return {
            size: this.size,
            slots: this.slots.map(item => item ? item.toJSON() : null)
        };
    }

    /**
     * 从JSON加载背包
     * @param {Object} json - 背包的JSON表示
     */
    fromJSON(json) {
        this.size = json.size || this.size;
        this.slots = new Array(this.size).fill(null);
        
        if (json.slots) {
            for (let i = 0; i < json.slots.length && i < this.size; i++) {
                if (json.slots[i]) {
                    this.slots[i] = Item.fromJSON(json.slots[i]);
                }
            }
        }
    }
}

/**
 * 装备管理器类 - 管理玩家的装备
 */
export class EquipmentManager {
    constructor() {
        this.slots = {
            [EquipmentType.HEAD]: null,
            [EquipmentType.BODY]: null,
            [EquipmentType.HANDS]: null,
            [EquipmentType.LEGS]: null,
            [EquipmentType.FEET]: null,
            [EquipmentType.ACCESSORY]: null,
            [EquipmentType.WEAPON]: null,
            [EquipmentType.SHIELD]: null
        };
        
        this.onEquipItem = null;
        this.onUnequipItem = null;
        this.i18n = null;
    }

    /**
     * 设置国际化实例
     * @param {Object} i18nInstance - I18n实例
     */
    setI18n(i18nInstance) {
        this.i18n = i18nInstance;
    }

    /**
     * 装备物品
     * @param {Item} item - 要装备的物品
     * @param {Object} player - 玩家对象
     * @returns {Item|null} 被替换的物品或null
     */
    equipItem(item, player) {
        if (!item || !item.isEquipment() || !item.equipmentType) {
            errorHandler.handleItemError(errorHandler.errorCodes.CANNOT_EQUIP_ITEM, item);
            return null;
        }

        // 检查是否满足装备要求
        if (!this.checkRequirements(item, player)) {
            errorHandler.handleItemError(errorHandler.errorCodes.CANNOT_EQUIP_ITEM, item);
            return null;
        }

        const slotType = item.equipmentType;
        const oldItem = this.slots[slotType];

        // 卸下旧物品
        if (oldItem && typeof oldItem.onUnequip === 'function') {
            oldItem.onUnequip(player, oldItem);
        }

        // 装备新物品
        this.slots[slotType] = item;
        
        if (typeof item.onEquip === 'function') {
            item.onEquip(player, item);
        }

        if (this.onEquipItem) {
            this.onEquipItem(slotType, item, oldItem);
        }

        messageManager.success('message_item_equipped', [item.name]);
        return oldItem;
    }

    /**
     * 卸下物品
     * @param {string} slotType - 装备槽位类型
     * @param {Object} player - 玩家对象
     * @returns {Item|null} 卸下的物品或null
     */
    unequipItem(slotType, player) {
        if (!this.slots[slotType]) {
            return null;
        }

        const item = this.slots[slotType];
        this.slots[slotType] = null;

        if (typeof item.onUnequip === 'function') {
            item.onUnequip(player, item);
        }

        if (this.onUnequipItem) {
            this.onUnequipItem(slotType, item);
        }

        messageManager.success('message_item_unequipped', [item.name]);
        return item;
    }

    /**
     * 检查是否满足装备要求
     * @param {Item} item - 要检查的物品
     * @param {Object} player - 玩家对象
     * @returns {boolean} 是否满足要求
     */
    checkRequirements(item, player) {
        if (!item.requirements) return true;

        const { level, stats } = item.requirements;

        // 检查等级要求
        if (level && player.level < level) {
            return false;
        }

        // 检查属性要求
        if (stats) {
            for (const [stat, value] of Object.entries(stats)) {
                if (!player.stats || player.stats[stat] < value) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 获取装备槽位中的物品
     * @param {string} slotType - 装备槽位类型
     * @returns {Item|null} 槽位中的物品或null
     */
    getEquippedItem(slotType) {
        return this.slots[slotType] || null;
    }

    /**
     * 获取所有已装备的物品
     * @returns {Object} 装备槽位和物品的映射
     */
    getAllEquippedItems() {
        return { ...this.slots };
    }

    /**
     * 计算装备提供的属性加成
     * @returns {Object} 属性加成
     */
    calculateEquipmentStats() {
        const stats = {
            attack: 0,
            defense: 0,
            health: 0,
            mana: 0,
            speed: 0,
            critical: 0
        };

        // 累加所有装备的属性
        Object.values(this.slots).forEach(item => {
            if (item && item.stats) {
                Object.entries(item.stats).forEach(([stat, value]) => {
                    if (stats[stat] !== undefined) {
                        stats[stat] += value;
                    }
                });
            }
        });

        return stats;
    }

    /**
     * 获取装备管理器的JSON表示
     * @returns {Object} 装备管理器的JSON表示
     */
    toJSON() {
        const slots = {};
        for (const [slotType, item] of Object.entries(this.slots)) {
            slots[slotType] = item ? item.toJSON() : null;
        }
        return { slots };
    }

    /**
     * 从JSON加载装备管理器
     * @param {Object} json - 装备管理器的JSON表示
     */
    fromJSON(json) {
        if (json.slots) {
            for (const [slotType, itemData] of Object.entries(json.slots)) {
                if (itemData) {
                    this.slots[slotType] = Item.fromJSON(itemData);
                } else {
                    this.slots[slotType] = null;
                }
            }
        }
    }

    /**
     * 获取装备槽位名称
     * @param {string} slotType - 装备槽位类型
     * @returns {string} 装备槽位名称
     */
    getSlotName(slotType) {
        if (!this.i18n) return slotType;
        
        const key = `equipment_slot_${slotType}`;
        return this.i18n.exists(key) ? this.i18n.t(key) : slotType;
    }
}

/**
 * 物品强化系统类 - 管理物品的强化
 */
export class ItemEnhanceSystem {
    constructor() {
        this.baseSuccessRate = 0.8; // 基础成功率
        this.levelPenalty = 0.1;    // 每级降低的成功率
        this.materialBonus = 0.05;  // 每个材料增加的成功率
        this.maxMaterials = 5;      // 最大材料数量
        this.enhanceCost = {        // 强化基础消耗
            coins: 100,             // 基础金币消耗
            multiplier: 1.5         // 每级增加的消耗倍率
        };
        this.statGrowth = {         // 属性成长率
            attack: 1.2,
            defense: 1.2,
            health: 1.1,
            mana: 1.1,
            speed: 1.05,
            critical: 1.05
        };
    }

    /**
     * 计算强化成功率
     * @param {Item} item - 要强化的物品
     * @param {number} materialCount - 使用的材料数量
     * @returns {number} 成功率(0-1)
     */
    calculateSuccessRate(item, materialCount) {
        const level = item.enhanceLevel || 0;
        let rate = this.baseSuccessRate - (level * this.levelPenalty);
        rate += Math.min(materialCount, this.maxMaterials) * this.materialBonus;
        return Math.max(0.1, Math.min(0.95, rate));
    }

    /**
     * 计算强化消耗
     * @param {Item} item - 要强化的物品
     * @returns {Object} 消耗信息
     */
    calculateEnhanceCost(item) {
        const level = item.enhanceLevel || 0;
        const coins = Math.floor(this.enhanceCost.coins * Math.pow(this.enhanceCost.multiplier, level));
        const materials = Math.min(this.maxMaterials, Math.floor(level / 2) + 1);
        
        return { coins, materials };
    }

    /**
     * 强化物品
     * @param {Item} item - 要强化的物品
     * @param {number} materialCount - 使用的材料数量
     * @param {Object} player - 玩家对象
     * @returns {Object} 强化结果
     */
    enhanceItem(item, materialCount, player) {
        if (!item || !item.isEquipment()) {
            return { success: false, reason: 'INVALID_ITEM' };
        }

        // 计算消耗
        const cost = this.calculateEnhanceCost(item);
        
        // 检查材料和金币
        if (materialCount < cost.materials) {
            errorHandler.handleError(errorHandler.errorCodes.NOT_ENOUGH_MATERIALS);
            return { success: false, reason: 'NOT_ENOUGH_MATERIALS' };
        }
        
        if (player.coins < cost.coins) {
            errorHandler.handleError(errorHandler.errorCodes.NOT_ENOUGH_COINS);
            return { success: false, reason: 'NOT_ENOUGH_COINS' };
        }
        
        // 扣除消耗
        player.coins -= cost.coins;
        
        // 计算成功率
        const successRate = this.calculateSuccessRate(item, materialCount);
        const success = Math.random() < successRate;
        
        if (success) {
            // 强化成功，提升物品等级和属性
            item.enhanceLevel = (item.enhanceLevel || 0) + 1;
            
            // 提升物品属性
            if (item.stats) {
                for (const [stat, value] of Object.entries(item.stats)) {
                    if (this.statGrowth[stat]) {
                        item.stats[stat] = Math.floor(value * this.statGrowth[stat]);
                    }
                }
            }
            
            messageManager.success('enhance_success');
        } else {
            // 强化失败
            messageManager.error('enhance_failed');
        }
        
        return { 
            success, 
            newLevel: item.enhanceLevel, 
            stats: item.stats,
            cost: cost
        };
    }
}

// 导出单例实例
export const itemManager = new ItemManager();
export const itemEnhanceSystem = new ItemEnhanceSystem();
export default itemManager;