import { type ActorRefLike, assign, createMachine, setup } from "xstate";
import { notificationDialogMachine } from "./notificationDialog";
type DialogItem = {
  type: "enableNotifications" | "intakeForm" | "rateApp";
};

type DialogContext = {
  orderCount: number;
  dialogsQueue: DialogItem[];
  ref: ActorRefLike | null;

  finishedOnboarding: boolean;
  dialogsShown: {
    notifications: {
      count: number;
      shown: boolean;
    };
    intakeForm: boolean;
    rateApp: boolean;
  };
};

type Events =
  | { type: "ORDER_COUNT_UPDATED"; orderCount: number }
  | { type: "LOADED_CONTEXT"; context: Partial<DialogContext> }
  | { type: "USER_FINISHED_ONBOARDING" }
  | { type: "USER_CHAT_MESSAGE" }
  | { type: "USER_PLACED_ORDER" }
  | { type: "DIALOG_DISMISSED" };

export const orchestratorMachine = setup({
  actions: {},
  guards: {
    hasDialogsInQueue: ({ context }) => context.dialogsQueue.length > 0,
  },
  types: {
    context: {} as DialogContext,
    events: {} as Events,
  },
  actors: {
    notificationDialogMachine: notificationDialogMachine,
  },
}).createMachine({
  id: "orchestrator",
  // initial context
  context: {
    ref: null,
    finishedOnboarding: false,
    orderCount: 0,
    dialogsQueue: [],
    dialogsShown: {
      notifications: {
        count: 0,
        shown: false,
      },
      intakeForm: false,
      rateApp: false,
    },
  },
  on: {
    ORDER_COUNT_UPDATED: {
      actions: assign(({ event }) => ({ orderCount: event.orderCount })),
    },
  },
  // the inital state that this machine starts in
  initial: "loadingContext",
  states: {
    // await the context to be loaded from AsyncStorage
    loadingContext: {
      on: {
        LOADED_CONTEXT: {
          actions: assign(({ context, event }) => ({
            ...context,
            ...event.context,
          })),
          target: "idle",
        },
      },
    },

    idle: {
      always: {
        guard: "hasDialogsInQueue",
        target: "launchDialog",
      },
      on: {
        USER_FINISHED_ONBOARDING: {
          actions: [
            assign({
              finishedOnboarding: true,
            }),
            assign(({ context }) => {
              if (shouldEnqueueNotificationDialog(context)) {
                return {
                  dialogsQueue: [
                    ...context.dialogsQueue,
                    { type: "enableNotifications" },
                  ],
                };
              }
              return {};
            }),
          ],
        },
        USER_CHAT_MESSAGE: {
          actions: assign(({ context }) => {
            if (shouldEnqueueNotificationDialog(context)) {
              return {
                dialogsQueue: [
                  ...context.dialogsQueue,
                  { type: "enableNotifications" },
                ],
              };
            }
            return {};
          }),
        },
        USER_PLACED_ORDER: {
          actions: assign(({ context }) => {
            if (context.orderCount === 3) {
              return {
                dialogsQueue: [...context.dialogsQueue, { type: "rateApp" }],
              };
            }
            return {};
          }),
        },
      },
    },
    launchDialog: {
      entry: assign(({ context, spawn }) => {
        const nextDialog = context.dialogsQueue[0];
        if (nextDialog.type === "enableNotifications") {
          return {
            ref: spawn("notificationDialogMachine", {
              id: "notificationDialog",
            }),
          };
        }
        return {};
      }),
      always: {
        target: "waitingForDialog",
      },
    },
    waitingForDialog: {
      on: {
        "xstate.done.actor.*": {
          actions: ({ context, event }) => {
            console.log("Event:", event);
          },
        },
      },
    },
    showDialog: {},
  },
});

function shouldEnqueueNotificationDialog(context: DialogContext) {
  return (
    context.finishedOnboarding &&
    context.dialogsShown.notifications.count <= 3 &&
    !context.dialogsShown.notifications.shown
  );
}
