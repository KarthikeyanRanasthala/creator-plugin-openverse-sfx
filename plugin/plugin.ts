import { createRuntime } from "./runtime.ts";

creator.ui.show({ width: 400, height: 640 });
const handle = createRuntime(creator);
creator.ui.onMessage((message: unknown) => { void handle(message); });
