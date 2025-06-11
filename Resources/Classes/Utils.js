/**
 * 输出日志信息，包括发起位置（文件名、行号、列号）和发起时间。
 * This function inspects the call stack to automatically determine the caller's location.
 * @param {...any} logText - 要输出的日志内容，可以传入多个参数，它们会被空格连接。
 */
export function log(...logText) {
  // 获取当前时间
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0"); // 获取小时，并确保是两位数
  const minutes = now.getMinutes().toString().padStart(2, "0"); // 获取分钟，并确保是两位数
  const seconds = now.getSeconds().toString().padStart(2, "0"); // 获取秒，并确保是两位数
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0"); // 获取毫秒，并确保是三位数
  const currentTime = `${hours}:${minutes}:${seconds}:${milliseconds}`;

  // 创建一个 Error 对象以获取调用栈信息
  const error = new Error();
  const stackLines = error.stack.split("\n");

  // stackLines[0] is "Error"
  // stackLines[1] is the log() function itself
  // stackLines[2] is the actual caller of log()
  const callerInfoLine = stackLines[2] ? stackLines[2].trim() : "Unknown Caller";

  let functionName = "anonymous";
  let fileInfo = "unknown.js:0:0";

  // Try to parse out function name and file:line:column
  const match = callerInfoLine.match(/at (.*?) \((.*?)\)|at (.*)/);
  if (match) {
    if (match[1] && match[2]) { // Format: "at functionName (filePath)"
      functionName = match[1];
      fileInfo = match[2];
    } else if (match[3]) { // Format: "at filePath" (often for anonymous functions or global scope)
      fileInfo = match[3];
    }
  }

  // Extract just the filename and line/col from full path
  const simpleFileInfoMatch = fileInfo.match(/\/([^\/]+\.js:\d+:\d+)/);
  if (simpleFileInfoMatch && simpleFileInfoMatch[1]) {
    fileInfo = simpleFileInfoMatch[1];
    // If functionName was part of the path (e.g. "at Object.log (file.js:1:1)"),
    // try to clean it up.
    if(functionName.includes(fileInfo)) {
        functionName = functionName.split(" (")[0] || "anonymous";
    }
  } else {
      // Fallback for fileInfo if regex fails (e.g. different stack trace format)
      const lastPart = fileInfo.substring(fileInfo.lastIndexOf('/') + 1);
      if(lastPart) fileInfo = lastPart;
  }

  // Refine function name if it's "Object.log" or similar due to how it was called
  if (functionName.startsWith("Object.")) {
      functionName = functionName.substring("Object.".length);
  }
  if (functionName === callerInfoLine) functionName = "anonymous"; // If parsing failed to separate function name

  // 格式化输出日志
  console.log(
    `[${functionName}(${fileInfo})][${currentTime}]:`,...logText
  );
}
