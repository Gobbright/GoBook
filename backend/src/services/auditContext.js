import { AsyncLocalStorage } from 'node:async_hooks';

// Carries the current request's actor (who's making the change) through the
// async call stack so the global audit plugin (see auditPlugin.js) can attach
// it to every write without controllers having to pass req.user around.
export const auditContext = new AsyncLocalStorage();

export function currentActor() {
  return auditContext.getStore() ?? null;
}
