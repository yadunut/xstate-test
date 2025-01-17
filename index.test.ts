import { createActor } from "xstate";
import { orchestratorMachine } from "./index";
import { notificationDialogMachine } from "./notificationDialog";
import { expect, test } from "bun:test";

test("machine", async () => {
  const actor = createActor(
    orchestratorMachine.provide({
      delays: { timeout: 100 },
      actors: {
        notificationDialogMachine: notificationDialogMachine.provide({
          delays: { timeout: 100 },
        }),
      },
    }),
  );
  //actor.subscribe((state) => {
  //  console.log(JSON.stringify(state, null, 2));
  //});
  actor.start();

  expect(actor.getSnapshot().value).toBe("loadingContext");
  actor.send({ type: "LOADED_CONTEXT", context: {} });
  expect(actor.getSnapshot().value).toBe("idle");
  expect(actor.getSnapshot().context.finishedOnboarding).toBe(false);
  actor.send({ type: "USER_FINISHED_ONBOARDING" });
  expect(actor.getSnapshot().value).toBe("waitingForDialog");
  expect(actor.getSnapshot().context.finishedOnboarding).toBe(true);
  actor.send({ type: "ORDER_COUNT_UPDATED", orderCount: 3 });
  //expect(actor.getSnapshot().context.orderCount).toBe(3);
  expect(actor.getSnapshot().value).toBe("waitingForDialog");
  const childRef = actor.getSnapshot().context.ref;
  expect(childRef).toBeDefined();
  expect(childRef?.getSnapshot().value).toBe("checkingPermissions");

  await new Promise((resolve) => setTimeout(resolve, 1));

  console.log(JSON.stringify(childRef?.getSnapshot(), null, 2));
  expect(childRef?.getSnapshot().value).toBe("delayBeforeShow");
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(childRef?.getSnapshot().value).toBe("showDialog");
  childRef?.send({ type: "ACCEPT" });
});
