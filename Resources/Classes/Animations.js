/**
 * Animations类，提供一些动画函数
 *
 * @class Animations
 */
export class Animations {
  /**
   * 创建跟随鼠标的tooltip提示框
   * @param {string} content - tooltip内容
   * @param {Event} event - 触发事件
   * @returns {Object} - 包含tooltip元素和移除方法的对象
   */
  static createTooltip(content, event) {
    // 创建tooltip元素
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = content;
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    document.body.appendChild(tooltip);
    
    // 创建移除tooltip的函数
    const removeTooltip = () => {
      if (tooltip && document.body.contains(tooltip)) {
        tooltip.remove();
        document.removeEventListener("mousemove", onDocMove);
        document.removeEventListener("mousedown", removeTooltip);
      }
    };
    
    // 用于判断鼠标是否离开了目标元素
    const onDocMove = (e) => {
      if (!e.target.closest(".item-card") && !e.target.closest(".equipped-item")) {
        removeTooltip();
      } else {
        // 更新tooltip位置
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
      }
    };
    
    // 添加事件监听
    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("mousedown", removeTooltip, { once: true });
    
    return {
      tooltip,
      removeTooltip
    };
  }
  
  static appendUsingDocumentFragment(parentElement, htmlString) {
    const fragment = document.createDocumentFragment();
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = htmlString;
    while (tempContainer.firstChild) {
      fragment.appendChild(tempContainer.firstChild);
    }
    parentElement.appendChild(fragment);
  }
  static write(element, text) {
    Animations.appendUsingDocumentFragment(element, `<div>${text}</div>`);
  }
  static writeWithHTML(element, htmlString) {
    Animations.appendUsingDocumentFragment(element, htmlString);
  }

  static attachHoverDescription(element, title, desc) {
    let timer;
    let tooltip;
    let isInsideTooltip = false;
    element.hasTooltip = true;
    const updateTooltipPosition = (e) => {
      tooltip.style.left = `${e.pageX}px`;
      tooltip.style.top = `${e.pageY}px`;
    };

    const showTooltip = (e) => {
      if (tooltip) return; // 防止重复创建 tooltip

      try {
        tooltip = document.createElement("div");
        tooltip.style.all = "initial";
        tooltip.style.position = "absolute";
        tooltip.style.background = "rgba(0, 0, 0, 0.8)";
        tooltip.style.color = "#fff";
        tooltip.style.padding = "10px";
        tooltip.style.borderRadius = "5px";
        tooltip.style.transition = "opacity 0.4s ease-in-out";
        tooltip.style.opacity = "0";
        tooltip.style.pointerEvents = "none";
        tooltip.classList.add("Tooltip", "DYSTooltip");
        // 使用 textContent 替代 innerHTML 提升安全性
        const strongElement = document.createElement("strong");
        strongElement.textContent = title;
        tooltip.appendChild(strongElement);
        tooltip.appendChild(document.createElement("br"));
        const descElement = document.createElement("div");
        descElement.innerHTML = desc;
        tooltip.appendChild(descElement);

        element.appendChild(tooltip);

        updateTooltipPosition(e);
        tooltip.style.opacity = "1";
        element.addEventListener("mousemove", updateTooltipPosition, {
          once: true,
        });

        // 添加事件监听器以处理子 Tooltip 的情况
        tooltip.addEventListener("mouseenter", () => {
          isInsideTooltip = true;
        });

        tooltip.addEventListener("mouseleave", () => {
          isInsideTooltip = false;
          hideTooltip();
        });
        if (!element.isConnected) {
          isInsideTooltip = false;
          hideTooltip(true);
        }
      } catch (error) {
        console.error("Failed to create tooltip:", error);
      }
    };
    const hideTooltip = (isForced = false) => {

      if (tooltip) {
        if(isForced) {
          tooltip.remove();
          tooltip = null;
        } else {
          tooltip.style.opacity = "0";
          setTimeout(() => {
            if (tooltip && !isInsideTooltip) {
              try {
                tooltip.remove();
                tooltip = null;
              } catch (error) {
                console.error("Failed to remove tooltip:", error);
              }
            }
          }, 400);
        }

      }
    };
    const handleMouseEnter = (e) => {
      clearTimeout(timer); // 清除之前的计时器
      timer = setTimeout(() => showTooltip(e), 1000);
    };

    const handleMouseLeave = () => {
      clearTimeout(timer);
      if (!isInsideTooltip) hideTooltip();
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
  }
  static clearAllTooltips() {
    const ExsitingTooltips = document.querySelectorAll(
      "div.Tooltip.DYSTooltip"
    );
    for (const tooltip of ExsitingTooltips) {
      tooltip.remove();
    }
  }
  static displayMessage(type = "info", msg, duration = 3000) {
    const containerId = "message-container";
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.position = "fixed";
      container.style.top = "10px";
      container.style.right = "10px";
      container.style.zIndex = "1000";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "flex-end";
      container.style.gap = "10px";
      document.body.appendChild(container);
    }

    const message = document.createElement("div");
    message.style.position = "relative";
    message.style.padding = "10px 20px";
    message.style.width = "fit-content";
    message.style.borderRadius = "5px";
    message.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
    message.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    message.style.transform = "translateX(100%)";
    message.style.opacity = "0";
    message.innerHTML = msg;

    switch (type) {
      case "warning":
        message.style.backgroundColor = "#f0ad4e";
        message.style.color = "#fff";
        break;
      case "error":
        message.style.backgroundColor = "#d9534f";
        message.style.color = "#fff";
        break;
      case "info":
      default:
        message.style.backgroundColor = "#5bc0de";
        message.style.color = "#fff";
        break;
    }

    container.insertBefore(message, container.firstChild);

    requestAnimationFrame(() => {
      message.style.transform = "translateX(0)";
      message.style.opacity = "1";
    });

    setTimeout(() => {
      message.style.transform = "translateX(100%)";
      message.style.opacity = "0";
      message.addEventListener("transitionend", () => {
        message.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      });
    }, duration);
  }
}