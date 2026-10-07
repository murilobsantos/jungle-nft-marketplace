import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { initialize } from "./database";
export async function startMocks() {
  await initialize();
  const worker = setupWorker(...handlers);
  await worker.start({
    quiet: true,
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
  return worker;
}
