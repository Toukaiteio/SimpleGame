import { i18n } from "./I18n.js";
import { html, render } from "../ThirdParty/lit-html.js";

export class FastComponent {
  static RadioGroup(title, choices, defaultIndex = 0, onChange = () => {}) {
    const wrapper = document.createElement("div");
    let selected = defaultIndex;

    const update = () => {
      const template = html`
        <div class="radio-group card">
          <div class="primaryTitle">${title}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; width: 100%;">
            ${choices.map(
              (choice, i) => html`
                <button
                  class="primaryButton ${selected === i ? "active" : ""}"
                  @click=${() => handleClick(i)}
                >
                  ${choice.content}
                </button>
              `
            )}
          </div>
        </div>
      `;
      render(template, wrapper);
    };

    const handleClick = (i) => {
      if (selected !== i) {
        if (choices[selected]?.onCancel) choices[selected].onCancel(wrapper);
        if (choices[i]?.onSelect) choices[i].onSelect(wrapper);
        selected = i;
        wrapper.value = selected;
        onChange(i);
        update();
      }
    };

    if (
      choices[defaultIndex]?.onSelect &&
      defaultIndex >= 0 &&
      defaultIndex < choices.length
    ) {
      choices[defaultIndex].onSelect(wrapper);
    }

    onChange(selected);
    wrapper.value = selected;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    update();
    return wrapper.firstElementChild;
  }

  static CheckboxGroup(
    title,
    desc,
    selections,
    defaultIndices = [],
    onChange = () => {}
  ) {
    const wrapper = document.createElement("div");
    const selected = new Set(defaultIndices);

    const update = () => {
      const template = html`
        <div
          class="checkbox-group card"
          style="display: flex; flex-wrap: wrap; justify-content: space-around;"
        >
          <div class="primaryTitle">${title}</div>
          <div class="primaryDesc">${desc}</div>
          ${selections.map(
            (choice, i) => html`
              <button
                class="primaryButton ${selected.has(i) ? "active" : ""}"
                @click=${() => handleClick(i)}
              >
                ${choice.content}
              </button>
            `
          )}
        </div>
      `;
      render(template, wrapper);
    };

    const handleClick = (i) => {
      if (selected.has(i)) {
        selected.delete(i);
        selections[i].onCancel?.(wrapper);
      } else {
        selected.add(i);
        selections[i].onSelect?.(wrapper);
      }
      wrapper.value = [...selected];
      onChange([...selected]);
      update();
    };

    onChange([...selected]);
    defaultIndices.forEach((i) => {
      if (selections[i]?.onSelect) {
        selections[i].onSelect(wrapper);
      }
    });

    wrapper.value = [...selected];
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    update();
    return wrapper.firstElementChild;
  }

  static RangedSlide(
    title,
    desc,
    min = 0,
    max = 100,
    step = 1,
    defaultVal = 15,
    onChange = () => {}
  ) {
    const wrapper = document.createElement("div");
    let currentValue = defaultVal;

    const update = () => {
      const template = html`
        <div class="card">
          <div class="primaryTitle">${title}</div>
          <div class="primaryDesc">${desc}</div>
          <div style="display: flex; align-items: center;">
            <input
              type="range"
              class="primaryRange"
              .min=${min}
              .max=${max}
              .step=${step}
              .value=${currentValue}
              @input=${handleInput}
            />
            <input
              type="number"
              class="primaryInputText"
              .min=${min}
              .max=${max}
              .step=${step}
              .value=${currentValue}
              @input=${handleInput}
            />
          </div>
        </div>
      `;
      render(template, wrapper);
    };

    const handleInput = (e) => {
      sync(e.target.value);
    };

    function sync(val) {
      currentValue = parseFloat(val);
      wrapper.value = currentValue;
      onChange(wrapper.value);
      update();
    }

    if (defaultVal != null) {
      wrapper.value = defaultVal;
      onChange(wrapper.value);
    }
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    update();
    return wrapper.firstElementChild;
  }

  static TextInput(
    title,
    desc,
    label,
    placeholder,
    defaultVal = "",
    onChange = () => {}
  ) {
    const wrapper = document.createElement("div");
    let currentValue = defaultVal;

    const update = () => {
      const template = html`
        <div class="text-input card">
          ${title ? html`<div class="primaryTitle">${title}</div>` : ""}
          ${desc ? html`<div class="primaryDesc">${desc}</div>` : ""}
          <label class="primaryLabel">
            ${label ? label : ""}
            <input
              class="primaryInputText"
              .placeholder=${placeholder}
              .value=${currentValue}
              @input=${handleInput}
            />
          </label>
        </div>
      `;
      render(template, wrapper);
    };

    const handleInput = (e) => {
      currentValue = e.target.value;
      wrapper.value = currentValue;
      onChange(currentValue);
    };

    wrapper.value = defaultVal;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    update();
    return wrapper.firstElementChild;
  }

  static DropMenu(title, desc, items, defaultVal = "", onChange = () => {}) {
    const wrapper = document.createElement("div");

    const renderOptions = (item, depth = 0) => {
      return html`
        <option .value=${item.value}>
          ${ "—".repeat(depth) + item.content }
        </option>
        ${item.sub ? renderOptions(item.sub, depth + 1) : ""}
      `;
    };

    const update = () => {
      const template = html`
        <div class="card">
          <div class="primaryTitle">${title}</div>
          <div class="primaryDesc">${desc}</div>
          <select class="primaryInputText" @change=${handleChange}>
            ${items.map((item) => renderOptions(item))}
          </select>
        </div>
      `;
      render(template, wrapper);
      wrapper.querySelector("select").value = defaultVal;
    };

    const handleChange = (e) => {
      wrapper.value = e.target.value;
      onChange(wrapper.value);
    };

    wrapper.value = defaultVal;
    wrapper.setWarning = (msg) => {
      wrapper.title = msg;
    };

    update();
    return wrapper.firstElementChild;
  }

  static createDialog(options) {
    const { title = "", onClose = () => {}, onRefresh = () => {}, tabs = [] } = options;
    const dialogOverlay = document.createElement("div");
    dialogOverlay.className = "dialog-overlay";
    let activeTab = tabs.length > 0 ? tabs[0].id : null;

    const update = () => {
      const template = html`
        <div class="dialog-content">
          <div class="dialog-title-bar">
            <h2>${title}</h2>
            <button class="dialog-close-button" @click=${closeDialog}>×</button>
          </div>
          ${tabs.length > 0
            ? html`
                <div class="dialog-tabs">
                  ${tabs.map(
                    (tabInfo) => html`
                      <button
                        class="dialog-tab-button ${activeTab === tabInfo.id
                          ? "active"
                          : ""}"
                        @click=${() => (activeTab = tabInfo.id) && update()}
                      >
                        ${tabInfo.label}
                      </button>
                    `
                  )}
                </div>
                <div class="dialog-panes">
                  ${tabs.map(
                    (tabInfo) => html`
                      <div
                        class="dialog-pane"
                        style="display: ${activeTab === tabInfo.id
                          ? "block"
                          : "none"};"
                      >
                        ${tabInfo.content()}
                      </div>
                    `
                  )}
                </div>
              `
            : ""}
        </div>
      `;
      render(template, dialogOverlay);
    };

    const closeDialog = () => {
      onClose();
      dialogOverlay.remove();
    };

    dialogOverlay.onclick = (event) => {
      if (event.target === dialogOverlay) {
        closeDialog();
      }
    };

    const handleKeyPress = (event) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };
    document.addEventListener("keydown", handleKeyPress);

    dialogOverlay.addEventListener("remove", () => {
      document.removeEventListener("keydown", handleKeyPress);
    });

    dialogOverlay.refresh = () => {
        onRefresh();
        update();
    };

    update();
    return dialogOverlay;
  }

  static ProgressBar(options = {}) {
    const {
      label,
      initial = 0,
      total = 100,
      height = "20px",
      isShowProgress = true,
      isShowPercent = true,
      isShowFixedAtMid = false,
      isGradient = false,
    } = options;

    const wrapper = document.createElement("div");
    let currentValue = initial;
    const events = {};
    const triggeredMilestones = new Set();

    const fireEvent = (eventName) => {
      if (events[eventName] && !triggeredMilestones.has(eventName)) {
        events[eventName].forEach((cb) => cb(wrapper));
        triggeredMilestones.add(eventName);
      }
    };

    const update = () => {
        const percent = total > 0 ? (currentValue / total) * 100 : 0;
        const fillStyle = {
            width: `${percent}%`,
            background: isGradient ? `rgb(${255 - (percent/100)*255}, ${(percent/100)*255}, 0)` : '#5bc0de'
        }
        const textStyle = {
            left: isShowFixedAtMid ? '50%' : `${percent}%`,
            transform: `translate(-${isShowFixedAtMid ? 50 : percent}%, -50%)`
        }

        const template = html`
            <div class="progress-bar-wrapper">
                ${label ? html`<div class="progress-bar-label">${label}</div>` : ''}
                <div class="progress-bar-container" style="height: ${height};">
                    <div class="progress-bar-fill" style="width: ${fillStyle.width}; background: ${fillStyle.background};"></div>
                    ${isShowProgress ? html`<div class="progress-bar-text" style="left: ${textStyle.left}; transform: ${textStyle.transform}; font-size: calc(${height} * 0.6);">
                        ${isShowPercent ? `${Math.round(percent)}%` : `${currentValue}/${total}`}
                    </div>` : ''}
                </div>
            </div>
        `;
        render(template, wrapper);
    }

    wrapper.on = (eventName, callback) => {
      if (!events[eventName]) {
        events[eventName] = [];
      }
      events[eventName].push(callback);
    };

    wrapper.updateProgress = (newValue) => {
      currentValue = Math.max(0, Math.min(total, newValue));
      update();
      
      const percent = (currentValue/total) * 100;
      if (currentValue <= 0) fireEvent("onEmpty");
      if (percent >= 25) fireEvent("onQuarter");
      if (percent >= 50) fireEvent("onHalf");
      if (percent >= 75) fireEvent("onThreeQuarters");
      if (currentValue >= total) fireEvent("onFull");
    };
    
    wrapper.resetMilestones = () => triggeredMilestones.clear();
    wrapper.value = currentValue;
    wrapper.total = total;

    update();
    return wrapper.firstElementChild;
  }

  static CharacterCard(character) {
    const wrapper = document.createElement("div");

    const update = () => {
        const template = html`
            <div class="character-card card">
                <h3>${i18n.t(character.name) || character.name}</h3>
                ${FastComponent.ProgressBar({
                    label: `HP: ${character.status.hp} / ${character.status.maxHp}`,
                    initial: character.status.hp,
                    total: character.status.maxHp,
                    isGradient: true,
                })}
                <div class="buffs">
                    <h4>${i18n.t("battle_buffs_title") || "Buffs"}:</h4>
                    ${character.status.buffList.length > 0 ? 
                        character.status.buffList.map(buff => {
                            const buffName = i18n.t(`buff_${buff.buff}_name`) || buff.buff;
                            const rounds = Buff_List[buff.buff]?.no_round_limited_symbol ? "Persistent" : `${buff.remainRound}r`;
                            return html`<div>[B] ${buffName} (${rounds}) - ${i18n.t(Buff_List[buff.buff]?.effect_desc) || ""}</div>`;
                        }) :
                        html`<div>${i18n.t("battle_no_buffs") || "No active buffs."}</div>`
                    }
                </div>
            </div>
        `;
        render(template, wrapper);
    }

    update();
    return wrapper.firstElementChild;
  }

  static BattleLogContainer() {
    const wrapper = document.createElement("div");
    const logs = [];
    const parseHtml = (string) => {
      const ele = document.createElement("div")
      ele.innerHTML = string
      return ele;
    }
    const update = () => {
      const template = html`
        <div class="battle-log-container card">
          <h4>${i18n.t("battle_log_title") || "Battle Log"}</h4>
          <div class="log-entries">
            ${logs.map(parseHtml)}
          </div>
        </div>
      `;
      render(template, wrapper);
      wrapper.querySelector(".log-entries").scrollTop = wrapper.querySelector(".log-entries").scrollHeight;
    };

    wrapper.addLog = (logEntry) => {
      logs.push(logEntry);
      update();
    };

    wrapper.clearLog = () => {
      logs.length = 0; // Clear the array
      update();
    };

    update();
    return wrapper;
  }

  static AttributeList(status, getPlayerInstance, i18n) {
    const wrapper = document.createElement("div");

    const update = async () => {
      const attributesHtml = [];
      for (const attrKey in status) {
        if (
          attrKey === "buffList" ||
          attrKey === "skillPoints" ||
          attrKey.startsWith("max") ||
          !status.hasOwnProperty(attrKey)
        )
          continue;

        const attrValue = await getPlayerInstance().getNextAttribute(attrKey);
        const maxAttrKey =
          "max" + attrKey.charAt(0).toUpperCase() + attrKey.slice(1);

        let valueContent;
        if (status.hasOwnProperty(maxAttrKey)) {
          const maxValue = await getPlayerInstance().getNextAttribute(maxAttrKey);
          valueContent = html`${attrValue} / ${maxValue}`;
          const percent = (attrValue / maxValue) * 100;
          attributesHtml.push(html`
            <div class="attribute-item">
              <div class="attribute-name">${i18n.t(`status_${attrKey}`) || attrKey}</div>
              <div class="attribute-value">${valueContent}</div>
              <div class="attribute-bar">
                <div class="attribute-bar-fill" style="width: ${percent}%;"></div>
              </div>
            </div>
          `);
        } else {
          valueContent = html`${attrValue}`;
          attributesHtml.push(html`
            <div class="attribute-item">
              <div class="attribute-name">${i18n.t(`status_${attrKey}`) || attrKey}</div>
              <div class="attribute-value">${valueContent}</div>
            </div>
          `);
        }
      }

      // Add Buff list
      if (status.buffList && status.buffList.length > 0) {
        attributesHtml.push(html`<h3>${i18n.t("dialog_buffs_title") || "Active Buffs"}</h3>`);
        status.buffList.forEach((buff) => {
          attributesHtml.push(html`
            <div class="attribute-item">
              ${i18n.t(`buff_${buff.buff}_name`) || buff.buff}: ${buff.remainRound} rounds
            </div>
          `);
        });
      }

      const template = html`
        <div class="attributes-list">
          ${attributesHtml}
        </div>
      `;
      render(template, wrapper);
    };

    update();
    return wrapper;
  }
}
