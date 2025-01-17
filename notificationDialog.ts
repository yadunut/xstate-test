import { fromPromise, sendParent, sendTo, setup } from "xstate";

export const notificationDialogMachine = setup({
  delays: {
    timeout: 5000,
  },
  actors: {
    checkPermissions: fromPromise(async () => {
      return true;
    }),
  },
  types: {
    events: {} as { type: "ACCEPT" | "DISMISS" },
  },
}).createMachine({
  id: "notificationDialog",
  initial: "checkingPermissions",
  states: {
    checkingPermissions: {
      invoke: {
        id: "checkPermissions",
        src: "checkPermissions",
        onDone: {
          target: "delayBeforeShow",
        },
        onError: {
          target: "skipped",
        },
      },
    },
    delayBeforeShow: {
      after: { timeout: "showDialog" },
    },
    showDialog: {
      on: {
        ACCEPT: "accepted",
        DISMISS: "dismissed",
      },
    },
    accepted: {
      type: "final",
      output: { type: "ACCEPTED" },
      entry: sendParent({ type: "DIALOG_DISMISSED" }),
    },
    dismissed: {
      type: "final",
      output: { type: "DISMISSED" },
      entry: sendParent({ type: "DIALOG_DISMISSED" }),
    },
    skipped: {
      type: "final",
      output: { type: "SKIPPED" },
      entry: sendParent({ type: "DIALOG_DISMISSED" }),
    },
  },
});
