import { i18n } from "./I18n.js";
/**
 * 地图类
 *
 * 展示与创建地图
 *
 * @class Map
 */
export class Map {
  constructor(regionData) {
      this.regionData = regionData;
      this.currentHighlightedNode = null;
      this.nodeElements = {};  // 存储节点元素以便后续高亮
  }

  generateMapSvg(regionName, width, height) {
      const region = this.regionData[regionName];
      if (!region) {
          throw new Error(`Region ${regionName} not found.`);
      }

      const svgNamespace = "http://www.w3.org/2000/svg";
      const svgElement = document.createElementNS(svgNamespace, "svg");
      svgElement.setAttribute("width", width);
      svgElement.setAttribute("height", height);
      svgElement.style.border = "1px solid black";

      const nodes = region.nodes;
      const relations = region.relations;

      const nodeCount = nodes.length;
      const nodeRadius = Math.min(width, height) / (10 * nodeCount);
      const arrowSize = nodeRadius / 1.5;
      const nodePositions = this.calculateNodePositions(nodeCount, width, height, nodeRadius);

      // Draw relations (arrows)
      relations.forEach(([fromIndex, toIndex]) => {
          const from = nodePositions[fromIndex];
          const to = nodePositions[toIndex];
          this.drawArrow(svgElement, from, to, nodeRadius, arrowSize);
      });

      // Draw nodes
      nodes.forEach((nodeName, index) => {
          const nodeElement = this.drawNode(svgElement, i18n.t(nodeName), nodePositions[index], nodeRadius);
          this.nodeElements[nodeName] = nodeElement;  // 保存节点元素以便后续高亮
      });

      return svgElement;
  }

  calculateNodePositions(count, width, height, radius) {
      const angleStep = (2 * Math.PI) / count;
      const centerX = width / 2;
      const centerY = height / 2;
      const positions = [];

      for (let i = 0; i < count; i++) {
          const angle = i * angleStep;
          const x = centerX + (centerX - radius * 2) * Math.cos(angle);
          const y = centerY + (centerY - radius * 2) * Math.sin(angle);
          positions.push({ x, y });
      }

      return positions;
  }

  drawArrow(svg, from, to, nodeRadius, arrowSize) {
      const svgNamespace = "http://www.w3.org/2000/svg";

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const adjustedFrom = {
          x: from.x + (dx / dist) * nodeRadius,
          y: from.y + (dy / dist) * nodeRadius,
      };
      const adjustedTo = {
          x: to.x - (dx / dist) * nodeRadius,
          y: to.y - (dy / dist) * nodeRadius,
      };

      const line = document.createElementNS(svgNamespace, "line");
      line.setAttribute("x1", adjustedFrom.x);
      line.setAttribute("y1", adjustedFrom.y);
      line.setAttribute("x2", adjustedTo.x);
      line.setAttribute("y2", adjustedTo.y);
      line.setAttribute("stroke", "black");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);

      const arrow = document.createElementNS(svgNamespace, "polygon");
      const arrowPoints = this.calculateArrowHead(adjustedTo, dx, dy, arrowSize);
      arrow.setAttribute("points", arrowPoints.map(p => `${p.x},${p.y}`).join(" "));
      arrow.setAttribute("fill", "black");
      svg.appendChild(arrow);

      if (this.isBidirectional(svg, adjustedFrom, adjustedTo)) {
          const reverseArrow = document.createElementNS(svgNamespace, "polygon");
          const reverseArrowPoints = this.calculateArrowHead(adjustedFrom, -dx, -dy, arrowSize);
          reverseArrow.setAttribute("points", reverseArrowPoints.map(p => `${p.x},${p.y}`).join(" "));
          reverseArrow.setAttribute("fill", "black");
          svg.appendChild(reverseArrow);
      }
  }

  isBidirectional(svg, from, to) {
      return svg.querySelector(`line[x1="${to.x}"][y1="${to.y}"][x2="${from.x}"][y2="${from.y}"]`) !== null;
  }

  calculateArrowHead(point, dx, dy, size) {
      const angle = Math.atan2(dy, dx);
      const arrowAngle = Math.PI / 6;

      const p1 = {
          x: point.x - size * Math.cos(angle - arrowAngle),
          y: point.y - size * Math.sin(angle - arrowAngle),
      };

      const p2 = {
          x: point.x - size * Math.cos(angle + arrowAngle),
          y: point.y - size * Math.sin(angle + arrowAngle),
      };

      return [point, p1, p2];
  }

  drawNode(svg, nodeName, position, radius) {
      const svgNamespace = "http://www.w3.org/2000/svg";

      const circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", position.x);
      circle.setAttribute("cy", position.y);
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", "lightblue");
      circle.setAttribute("stroke", "black");
      circle.setAttribute("stroke-width", "2");

      const text = document.createElementNS(svgNamespace, "text");
      text.setAttribute("x", position.x);
      text.setAttribute("y", position.y);
      text.setAttribute("dy", "0.35em");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", radius / 2.5);
      text.textContent = nodeName;

      svg.appendChild(circle);
      svg.appendChild(text);

      return { circle, text };
  }

  highlightNode(nodeName) {
      const nodeElement = this.nodeElements[nodeName];
      if (!nodeElement) {
          throw new Error(`Node ${nodeName} not found.`);
      }

      if (this.currentHighlightedNode) {
          this.currentHighlightedNode.circle.setAttribute("fill", "lightblue");
          this.currentHighlightedNode.text.setAttribute("font-weight", "normal");
      }

      nodeElement.circle.setAttribute("fill", "yellow");
      nodeElement.text.setAttribute("font-weight", "bold");

      this.currentHighlightedNode = nodeElement;
  }
}


/**
 *
 * 基于场景的地图生成函数
 *
 * @param {Object} rawNodes - 原始节点
 * @param {string} startNode - 起始点位
 * @param {string} regionName - 区域名称
 * @returns {Object}
 */
export function generateMapData(rawNodes, startNode, regionName) {
  // Helper function to strip '#' from the node names
  function normalizeNodeName(nodeName) {
      return nodeName.startsWith('#') ? nodeName.slice(1) : nodeName;
  }

  // Helper function to perform DFS to find all reachable nodes
  function dfs(node, visited, nodesInRegion, relations) {
      if (visited.has(node)) return;
      visited.add(node);

      const nodeObj = rawNodes[node];
      if (!nodeObj || !nodeObj.hasRoadTo || nodeObj.hasRoadTo.length === 0) return;

      // Add the node to the nodesInRegion if it isn't already there
      if (!nodesInRegion.includes(node)) {
          nodesInRegion.push(node);
      }

      nodeObj.hasRoadTo.forEach(destination => {
          const normalizedDest = normalizeNodeName(destination);
          if (rawNodes[normalizedDest]) {
              // Ensure the destination node is added to nodesInRegion
              if (!nodesInRegion.includes(normalizedDest)) {
                  nodesInRegion.push(normalizedDest);
              }
              // Add the relation using the correct indices
              relations.push([nodesInRegion.indexOf(node), nodesInRegion.indexOf(normalizedDest)]);
              if (!visited.has(normalizedDest)) {
                  dfs(normalizedDest, visited, nodesInRegion, relations);
              }
          }
      });
  }

  // Initialize visited set, nodes array and relations array
  let visited = new Set();
  let nodesInRegion = [];
  let relations = [];

  // Start DFS from the starting node
  dfs(startNode, visited, nodesInRegion, relations);

  // Create the final map data structure
  let mapData = {
      [regionName]: {
          nodes: nodesInRegion,
          relations: relations
      }
  };

  return mapData;
}
