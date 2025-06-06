import { getGameInstance, getPlayerInstance, getUIInstance } from "./Shared.js";
/**
 * HookContext即HookList中每个钩子函数的上下文。
 * 其中self在每个钩子函数中指向该函数自身
 */
export const HookContext = {
    game: getGameInstance(),
    ui: getUIInstance(),
    player: getPlayerInstance(),
    self: null,
}
/**
 * HookList为需要保存进存档中的钩子函数列表。
 * 每次通过HookList创建的GlobalTrigger的钩子函数对象都是不同的。
 */
export const HookList = {

}