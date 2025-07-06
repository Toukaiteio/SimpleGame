import { html, render } from "../ThirdParty/lit-html.js";
/**
 * Animations类，提供一些动画函数
 *
 * @class Animations
 */
export class Animations {
  static createTooltip(content, event, parseHTML = false) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    document.body.appendChild(tooltip);

    const template = parseHTML ? html`${content}` : content;
    render(template, tooltip);

    gsap.set(tooltip, { 
      left: event.pageX + 10,
      top: event.pageY + 10,
      opacity: 0,
      scale: 0.95
    });
    gsap.to(tooltip, { opacity: 1, scale: 1, duration: 0.2 });

    const removeTooltip = () => {
      gsap.to(tooltip, { opacity: 0, scale: 0.95, duration: 0.2, onComplete: () => {
        if (tooltip && document.body.contains(tooltip)) {
          tooltip.remove();
          document.removeEventListener("mousemove", onDocMove);
          document.removeEventListener("mousedown", removeTooltip);
        }
      }});
    };

    const onDocMove = (e) => {
      if (
        !e.target.closest(".item-card") &&
        !e.target.closest(".equipped-item") &&
        !e.target.closest("span[hasDescription]")
      ) {
        removeTooltip();
      } else {
        gsap.to(tooltip, { left: e.pageX + 10, top: e.pageY + 10, duration: 0.1 });
      }
    };

    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("mousedown", removeTooltip, { once: true });

    return {
      tooltip,
      removeTooltip,
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
  static isWriting = false;
  static writingQueue = [];

  static processWritingQueue() {
    if (this.isWriting || this.writingQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    const { element, text, isHTML, resolve } = this.writingQueue.shift();
    const target = element;
    const vars = {
      duration: text.length * 0.05,
      text: text,
      ease: "none",
      onComplete: () => {
        this.isWriting = false;
        this.processWritingQueue();
        resolve();
      },
    };

    if (isHTML) {
      vars.type = "html";
    }

    const animation = gsap.to(target, vars);

    const skipAnimation = () => {
      animation.progress(1);
    };
    setTimeout(() => {
      document.addEventListener("click", skipAnimation, { once: true });
    }, 100);
  }

  static write(element, text) {
    return new Promise((resolve) => {
      this.writingQueue.push({ element, text, isHTML: false, resolve });
      this.processWritingQueue();
    });
  }

  static writeWithHTML(element, htmlString) {
    return new Promise((resolve) => {
      this.writingQueue.push({
        element,
        text: htmlString,
        isHTML: true,
        resolve,
      });
      this.processWritingQueue();
    });
  }
  /**@deprecated */
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
        if (isForced) {
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
  /**@deprecated */
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
    const template = html`${msg}`;
    render(template, message);

    const colors = {
        warning: "#f0ad4e",
        error: "#d9534f",
        info: "#5bc0de"
    }

    gsap.set(message, {
        backgroundColor: colors[type] || colors.info,
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "5px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        x: "100%",
        opacity: 0
    });

    container.insertBefore(message, container.firstChild);

    gsap.to(message, { x: 0, opacity: 1, duration: 0.3 });

    gsap.to(message, { 
        x: "100%", 
        opacity: 0, 
        duration: 0.3, 
        delay: duration / 1000, 
        onComplete: () => {
            message.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }
    });
  }
  static breakElement(element) {
    const split = new SplitText(element, { type: "chars,words" });
    const chars = split.chars;

    gsap.set(element, { perspective: 400 });

    gsap.to(chars, {
      duration: 2,
      opacity: 0,
      physics2D: {
        velocity: "random(200, 600)",
        angle: "random(250, 290)",
        gravity: 600,
      },
      stagger: {
        each: 0.1,
        from: "random",
      }
    });
  }
}