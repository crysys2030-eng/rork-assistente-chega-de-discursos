import * as shim from "./rork-sdk-shim";

let real: any = null;
try {
  const req = eval("require");
  real = req("@rork/toolkit-sdk");
} catch (e) {
  console.log("AI Bridge: real SDK not available, using shim");
}

const backendURL: string | undefined = (process.env as any)?.EXPO_PUBLIC_TOOLKIT_URL;
const shouldUseShim = !backendURL || !real;
if (shouldUseShim) {
  console.log(
    "AI Bridge: Using local shim — reason:",
    !backendURL ? "No EXPO_PUBLIC_TOOLKIT_URL set" : "Toolkit SDK not resolved"
  );
}

export const isLocalAI: boolean = shouldUseShim;

export const useRorkAgent: typeof shim.useRorkAgent = shouldUseShim ? shim.useRorkAgent : real.useRorkAgent;
export const createRorkTool: typeof shim.createRorkTool = shouldUseShim ? shim.createRorkTool : real.createRorkTool;
export const generateObject: typeof shim.generateObject = shouldUseShim ? shim.generateObject : real.generateObject;
export const generateText: typeof shim.generateText = shouldUseShim ? shim.generateText : real.generateText;
