import * as shim from "./rork-sdk-shim";

let real: any = null;
try {
  // Avoid static analysis by Metro by using eval
  // eslint-disable-next-line no-eval
  const req = eval("require");
  real = req("@rork/toolkit-sdk");
} catch (e) {
  console.log("AI Bridge: real SDK not available, using shim");
}

export const useRorkAgent: typeof shim.useRorkAgent = real?.useRorkAgent ?? shim.useRorkAgent;
export const createRorkTool: typeof shim.createRorkTool = real?.createRorkTool ?? shim.createRorkTool;
export const generateObject: typeof shim.generateObject = real?.generateObject ?? shim.generateObject;
export const generateText: typeof shim.generateText = real?.generateText ?? shim.generateText;
