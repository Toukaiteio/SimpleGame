/**
 * 物品配置文件 - 定义游戏中的各种物品模板
 */
import { ItemType, EquipmentType, Rarity } from '../Classes/ItemSystem.js';

export const ItemTemplates = {
    // 武器
    wooden_sword: {
        nameKey: 'item_wooden_sword_name',
        descriptionKey: 'item_wooden_sword_desc',
        type: ItemType.EQUIPMENT,
        equipmentType: EquipmentType.WEAPON,
        rarity: Rarity.COMMON,
        icon: 'wooden_sword.png',
        value: 50,
        stats: {
            attack: 5,
            speed: 1
        },
        durability: 100,
        maxDurability: 100,
        level: 1,
        requirements: {
            level: 1
        }
    },
    
    iron_sword: {
        nameKey: 'item_iron_sword_name',
        descriptionKey: 'item_iron_sword_desc',
        type: ItemType.EQUIPMENT,
        equipmentType: EquipmentType.WEAPON,
        rarity: Rarity.UNCOMMON,
        icon: 'iron_sword.png',
        value: 200,
        stats: {
            attack: 12,
            speed: 2,
            critical: 5
        },
        durability: 200,
        maxDurability: 200,
        level: 5,
        requirements: {
            level: 5
        }
    },
    
    // 防具
    leather_armor: {
        nameKey: 'item_leather_armor_name',
        descriptionKey: 'item_leather_armor_desc',
        type: ItemType.EQUIPMENT,
        equipmentType: EquipmentType.BODY,
        rarity: Rarity.COMMON,
        icon: 'leather_armor.png',
        value: 100,
        stats: {
            defense: 8,
            health: 10
        },
        durability: 150,
        maxDurability: 150,
        level: 1,
        requirements: {
            level: 1
        }
    },
    
    iron_armor: {
        nameKey: 'item_iron_armor_name',
        descriptionKey: 'item_iron_armor_desc',
        type: ItemType.EQUIPMENT,
        equipmentType: EquipmentType.BODY,
        rarity: Rarity.UNCOMMON,
        icon: 'iron_armor.png',
        value: 300,
        stats: {
            defense: 15,
            health: 25
        },
        durability: 300,
        maxDurability: 300,
        level: 5,
        requirements: {
            level: 5
        }
    },
    
    // 消耗品
    health_potion: {
        nameKey: 'item_health_potion_name',
        descriptionKey: 'item_health_potion_desc',
        type: ItemType.CONSUMABLE,
        rarity: Rarity.COMMON,
        icon: 'health_potion.png',
        value: 50,
        stackable: true,
        maxStack: 10,
        usable: true,
        effects: [
            {
                type: 'heal',
                value: 50
            }
        ]
    },
    
    mana_potion: {
        nameKey: 'item_mana_potion_name',
        descriptionKey: 'item_mana_potion_desc',
        type: ItemType.CONSUMABLE,
        rarity: Rarity.COMMON,
        icon: 'mana_potion.png',
        value: 50,
        stackable: true,
        maxStack: 10,
        usable: true,
        effects: [
            {
                type: 'mana',
                value: 50
            }
        ]
    },
    
    strength_potion: {
        nameKey: 'item_strength_potion_name',
        descriptionKey: 'item_strength_potion_desc',
        type: ItemType.CONSUMABLE,
        rarity: Rarity.UNCOMMON,
        icon: 'strength_potion.png',
        value: 100,
        stackable: true,
        maxStack: 5,
        usable: true,
        effects: [
            {
                type: 'buff',
                buffId: 'strength',
                duration: 300 // 5分钟
            }
        ]
    },
    
    // 材料
    iron_ore: {
        nameKey: 'item_iron_ore_name',
        descriptionKey: 'item_iron_ore_desc',
        type: ItemType.MATERIAL,
        rarity: Rarity.COMMON,
        icon: 'iron_ore.png',
        value: 20,
        stackable: true,
        maxStack: 50
    },
    
    wood: {
        nameKey: 'item_wood_name',
        descriptionKey: 'item_wood_desc',
        type: ItemType.MATERIAL,
        rarity: Rarity.COMMON,
        icon: 'wood.png',
        value: 10,
        stackable: true,
        maxStack: 50
    },
    
    leather: {
        nameKey: 'item_leather_name',
        descriptionKey: 'item_leather_desc',
        type: ItemType.MATERIAL,
        rarity: Rarity.COMMON,
        icon: 'leather.png',
        value: 15,
        stackable: true,
        maxStack: 50
    },
    
    enhancement_stone: {
        nameKey: 'item_enhancement_stone_name',
        descriptionKey: 'item_enhancement_stone_desc',
        type: ItemType.MATERIAL,
        rarity: Rarity.UNCOMMON,
        icon: 'enhancement_stone.png',
        value: 100,
        stackable: true,
        maxStack: 20
    },
    
    // 饰品
    lucky_charm: {
        nameKey: 'item_lucky_charm_name',
        descriptionKey: 'item_lucky_charm_desc',
        type: ItemType.EQUIPMENT,
        equipmentType: EquipmentType.ACCESSORY,
        rarity: Rarity.RARE,
        icon: 'lucky_charm.png',
        value: 500,
        stats: {
            critical: 10,
            speed: 5
        },
        level: 10,
        requirements: {
            level: 10
        }
    },
    
    health_ring: {
        nameKey: 'item_health_ring_name',
        descriptionKey: 'item_health_ring_desc',
        type: ItemType.EQUIPMENT,
        equipmentType: EquipmentType.ACCESSORY,
        rarity: Rarity.RARE,
        icon: 'health_ring.png',
        value: 500,
        stats: {
            health: 50
        },
        level: 10,
        requirements: {
            level: 10
        }
    }
};

export default ItemTemplates;