/**
 * 基于种子的随机数生成器类
 *
 * 该类使用线性同余生成器（LCG）算法生成伪随机数序列。
 * 通过提供一个种子，可以确保每次运行时生成相同的随机数序列。
 *
 * @class SeededRandom
 */
export class SeededRandom {
  static UniqueIDCounter = 0;
  static instance = null;
  static getInstance() {
    if(SeededRandom.instance === null){
      SeededRandom.instance = new SeededRandom(SeededRandom.getRandom());
    }
    return SeededRandom.instance;
  }
  /**
   * 构造函数
   * @param {number} seed - 随机数生成器的种子
   */
  constructor(seed) {
    this.seed = seed;
    this.prevRandom = null;
    SeededRandom.instance = this;
  }

  /**
   * 生成下一个随机数
   * @returns {number} 0到1之间的随机小数
   */
  next() {
    // 线性同余生成器
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  /**
   * 生成下一个满足间隔要求的随机数
   * @param {number} gap - 连续生成的随机数前后差的绝对值最小值
   * @returns {number} 满足要求的随机数
   */
  nextWithGap(gap) {
    if(!this.prevRandom){
        this.prevRandom = this.next();
        return this.prevRandom;
    }
    let newRandom;
    let prevRandom = this.prevRandom;
    do {
      newRandom = this.next();
    } while (Math.abs(newRandom - prevRandom) < gap);
    prevRandom = newRandom;
    return newRandom;
  }
  /**
   * 生成指定范围内的随机整数
   * @param {number} min - 随机数的最小值
   * @param {max} max - 随机数的最大值
   * @returns {number} min到max之间的随机整数
   */
  randomInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  /**
   * 生成一个随机数
   * @returns {number} 0到1之间的随机小数
   */
  static getRandomDecimal() {
    const randomBytes = new Uint32Array(1);
    window.crypto.getRandomValues(randomBytes);
    const maxUint32 = 0xFFFFFFFF; // 32位无符号整数的最大值
    return randomBytes[0] / maxUint32;
  }
  /**
   * 生成一个随机数
   * @returns {number} 随机数
   */
  static getRandom() {
    const randomBytes = new Uint32Array(1);
    window.crypto.getRandomValues(randomBytes);
    return randomBytes[0];
  }
  /**
   * 传入一个0~100的整数作为概率判断是否生效
   */
  static randomProbability(probability) {
    if(probability >= 100) return true;
    if(probability <= 0) return false;
    return Math.random() < probability / 100;
  }
  static getUniqueId() {
    return ++SeededRandom.UniqueIDCounter;
  }
}
