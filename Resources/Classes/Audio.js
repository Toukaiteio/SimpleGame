import { musicList } from "../Assets/audio/AudioList.js";
class GameAudio {
  static instance = null;

  static getInstance() {
    if (GameAudio.instance === null) {
      GameAudio.instance = new GameAudio();
    }
    return GameAudio.instance;
  }

  constructor(musicList) {
    this.bgmChannel = new Audio(); // 专用于 BGM 播放
    this.bgmChannel.loop = true;
    this.bgmChannel.volume = 0; // 初始音量为 0，用于淡入效果

    this.sfxChannels = []; // 用于 SFX 播放的音轨池
    this.maxSFXChannels = 10; // 最大 SFX 同时播放数
    for (let i = 0; i < this.maxSFXChannels; i++) {
      this.sfxChannels.push(new Audio());
    }

    this.currentBGM = null; // 当前播放的 BGM
    this.bgmQueue = []; // BGM 播放队列
    this.bgmFadeDuration = 2000; // BGM 淡入淡出时长（毫秒）
    this.musicList = musicList; // 存储所有 BGM 文件路径
    this.bgmMetadata = {}; // 存储 BGM 版权信息
    this.loadMetadata(); // 加载 BGM 版权信息
    this._initBGMInfoDisplay(); // 初始化 BGM 信息显示
    this.underDisplaying = false;
    this.displayHandleList = [];
    GameAudio.instance = this;
  }
  loadMetadata() {
    for (const i in this.musicList) {
      for (const j of this.musicList[i]) {
        this.bgmMetadata[j.name] = j;
      }
    }
  }
  /**
   * 初始化 BGM 信息显示区域。
   */
  _initBGMInfoDisplay() {
    this.bgmInfoDisplay = document.createElement("div");
    this.bgmInfoDisplay.style.position = "fixed";
    this.bgmInfoDisplay.style.bottom = "10px";
    this.bgmInfoDisplay.style.right = "10px";
    this.bgmInfoDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    this.bgmInfoDisplay.style.color = "white";
    this.bgmInfoDisplay.style.padding = "10px";
    this.bgmInfoDisplay.style.borderRadius = "5px";
    this.bgmInfoDisplay.style.fontSize = "14px";
    this.bgmInfoDisplay.style.display = "none";
    this.bgmInfoDisplay.style.transition =
      "transform 0.5s ease, opacity 0.5s ease";
    this.bgmInfoDisplay.style.transform = "translateX(100%)";
    this.bgmInfoDisplay.style.opacity = "0";
    document.body.appendChild(this.bgmInfoDisplay);
  }

  /**
   * 显示 BGM 的版权信息。
   * @param {string} title - 歌名。
   * @param {string} author - 作者。
   * @param {string} copyright - 著作权所有者。
   */
  _showBGMInfo(title, author, copyright) {
    if (!this.underDisplaying) {
      this.underDisplaying = true;
      this.bgmInfoDisplay.innerHTML = `
        <strong>Now Playing:</strong><br>
        <strong>Title:</strong> ${title}<br>
        <strong>Author:</strong> ${author}<br>
        <strong>Copyright:</strong> ${copyright}
    `;
      this.bgmInfoDisplay.style.display = "block";
      this.bgmInfoDisplay.style.transform = "translateX(0)";
      this.bgmInfoDisplay.style.opacity = "1";

      // 隐藏信息框 3 秒后
      setTimeout(() => {
        this.bgmInfoDisplay.style.transform = "translateX(100%)";
        this.bgmInfoDisplay.style.opacity = "0";
        setTimeout(() => {
          this.bgmInfoDisplay.style.display = "none";
          this.underDisplaying = false;
          if (this.displayHandleList.length > 0) {
            const next = this.displayHandleList.shift();
            this._showBGMInfo(next.title, next.author, next.copyright);
          }
        }, 500);
      }, 3000);
    } else {
      this.displayHandleList.push({ title, author, copyright });
    }
  }

  /**
   * 设置 BGM 版权信息。
   * @param {string} src - BGM 文件路径。
   * @param {Object} metadata - 包含歌名、作者和著作权信息的对象。
   */
  setBGMMetadata(metadata) {
    this.bgmMetadata[metadata.name] = metadata;
  }

  /**
   * 播放指定的 BGM。
   * @param {string} src - BGM 的音频文件路径。
   */
  playBGM(songName) {
    const src = this.bgmMetadata[songName].src;
    // console.log(src,this.bgmMetadata);
    if (this.currentBGM === src) return; // 如果当前正在播放相同的 BGM，则不切换

    const previousBGM = this.bgmChannel;
    const newBGM = new Audio(src);
    newBGM.loop = true;
    newBGM.volume = 0;
    this.currentBGM = src;

    // 显示版权信息
    const metadata = Object.assign(
      { name: "Unknown", author: "Unknown", copyright: "Unknown" },
      this.bgmMetadata[songName]
    );
    // 旧 BGM 的淡出效果并停止播放
    if (!previousBGM.paused) {
      previousBGM.breakFadeIn = true;
      this._fadeOut(previousBGM, this.bgmFadeDuration, () => {
        previousBGM.pause();
        previousBGM.src = ""; // 清除资源
        // 新 BGM 的淡入效果
        newBGM.play().then(() => {
          this._showBGMInfo(metadata.name, metadata.author, metadata.copyright);
          this._fadeIn(newBGM, this.bgmFadeDuration);
        });
      });
    } else {
      // 新 BGM 的淡入效果
      newBGM.play().then(() => {
        this._showBGMInfo(metadata.name, metadata.author, metadata.copyright);
        this._fadeIn(newBGM, this.bgmFadeDuration);
      });
    }

    this.bgmChannel = newBGM;
  }

  /**
   * 淡入音频。
   * @param {HTMLAudioElement} audio - 目标音频对象。
   * @param {number} duration - 淡入时长（毫秒）。
   */
  _fadeIn(audio, duration) {
    const step = 0.01;
    const interval = duration / (1 / step);
    const fadeInterval = setInterval(() => {
      if (audio.volume < 1 && !audio.breakFadeIn) {
        audio.volume = Math.min(audio.volume + step, 1);
      } else {
        clearInterval(fadeInterval);
      }
    }, interval);
  }

  /**
   * 淡出音频。
   * @param {HTMLAudioElement} audio - 目标音频对象。
   * @param {number} duration - 淡出时长（毫秒）。
   * @param {Function} callback - 淡出完成后的回调函数。
   */
  _fadeOut(audio, duration, callback) {
    const step = 0.01;
    const interval = duration / (1 / step);
    const fadeInterval = setInterval(() => {
      if (audio.volume > 0) {
        audio.volume = Math.max(audio.volume - step, 0);
      } else {
        clearInterval(fadeInterval);
        if (callback) callback();
      }
    }, interval);
  }

  /**
   * 将 BGM 加入播放队列。
   * @param {string[]} bgmList - BGM 文件路径数组。
   */
  addBGMToQueue(bgmList) {
    this.bgmQueue.push(...bgmList);
  }

  /**
   * 播放队列中的下一个 BGM。
   */
  playNextBGM() {
    if (this.bgmQueue.length > 0) {
      const nextBGM = this.bgmQueue.shift();
      this.playBGM(nextBGM);
    }
  }

  /**
   * 播放指定的音效。
   * @param {string} src - 音效文件路径。
   */
  playSFX(src) {
    const availableChannel = this.sfxChannels.find(
      (channel) => channel.paused || channel.ended
    );
    if (availableChannel) {
      availableChannel.src = src;
      availableChannel.volume = 1; // 可根据需要调整默认音量
      availableChannel.play();
    } else {
      console.warn("所有 SFX 通道都在使用中，音效播放失败：", src);
    }
  }

  /**
   * 停止所有 SFX。
   */
  stopAllSFX() {
    this.sfxChannels.forEach((channel) => {
      channel.pause();
      channel.src = "";
    });
  }

  /**
   * 停止当前的 BGM。
   */
  stopBGM() {
    if (this.bgmChannel) {
      this._fadeOut(this.bgmChannel, this.bgmFadeDuration, () => {
        this.bgmChannel.pause();
        this.bgmChannel.src = "";
        this.currentBGM = null;
      });
    }
  }
}

// 使用示例
export const audioManager = new GameAudio(musicList);
