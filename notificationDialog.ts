import { fromPromise, sendTo, setup } from "xstate";

export const notificationDialogMachine = setup({
  delays: {
    timeout: 5000,
  },
  actions: {
    log: ({ event }) => {
      console.log(`logging event: ${JSON.stringify(event)}`);
    },
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
          actions: ({ event }) => {
            console.log("Permission Check Success");
          },
          target: "delayBeforeShow",
        },
        onError: {
          actions: ({ event }) => {
            console.log("Permission Check Failure");
          },
          target: "skipped",
        },
      },
    },
    delayBeforeShow: {
      actions: "log",
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
      //entry: sendTo("orchestrator", { type: "FINISHED" }),
    },
    dismissed: {
      type: "final",
      output: { type: "DISMISSED" },
    },
    skipped: {
      type: "final",
      output: { type: "SKIPPED" },
    },
  },
});
