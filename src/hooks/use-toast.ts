import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

/**
 * The maximum number of toasts that can be displayed at once.
 */
const TOAST_LIMIT = 3;

/**
 * The delay in milliseconds before a toast is automatically removed.
 */
const TOAST_REMOVE_DELAY = 3000;

/**
 * Represents a toast with an additional `id` property.
 *
 * @property {string} id - A unique identifier for the toast.
 * @property {React.ReactNode} [title] - The title of the toast.
 * @property {React.ReactNode} [description] - The description of the toast.
 * @property {ToastActionElement} [action] - The action element of the toast.
 */
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

/**
 * Enum for toast action types.
 *
 * @enum {string}
 * @property {string} ADD_TOAST - Action type for adding a toast.
 * @property {string} UPDATE_TOAST - Action type for updating a toast.
 * @property {string} DISMISS_TOAST - Action type for dismissing a toast.
 * @property {string} REMOVE_TOAST - Action type for removing a toast.
 */
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

/**
 * A counter for generating unique toast IDs.
 */
let count = 0;

/**
 * Generates a unique ID for a toast.
 *
 * @returns {string} A unique string identifier.
 */
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

/**
 * Union type for toast actions.
 *
 * @property {ActionType["ADD_TOAST"]} ADD_TOAST - Action for adding a toast.
 * @property {ActionType["UPDATE_TOAST"]} UPDATE_TOAST - Action for updating a toast.
 * @property {ActionType["DISMISS_TOAST"]} DISMISS_TOAST - Action for dismissing a toast.
 * @property {ActionType["REMOVE_TOAST"]} REMOVE_TOAST - Action for removing a toast.
 */
type ActionType = typeof actionTypes;

/**
 * Represents an action that can be dispatched to the toast reducer.
 *
 * @property {ActionType} type - The type of the action.
 * @property {ToasterToast} [toast] - The toast to be added or updated.
 * @property {string} [toastId] - The ID of the toast to be dismissed or removed.
 */
type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

/**
 * Represents the state of the toast reducer.
 *
 * @property {ToasterToast[]} toasts - An array of toasts.
 */
interface State {
  toasts: ToasterToast[];
}

/**
 * A map to keep track of timeouts for toast removal.
 */
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Adds a toast to the removal queue.
 *
 * @param {string} toastId - The ID of the toast to be added to the removal queue.
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId));
    toastTimeouts.delete(toastId);
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

/**
 * The reducer function for managing toast state.
 *
 * @param {State} state - The current state of the toasts.
 * @param {Action} action - The action to be applied to the state.
 * @returns {State} The new state after applying the action.
 */
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": {
      const newToast = action.toast;
      addToRemoveQueue(newToast.id);

      return {
        ...state,
        toasts: [newToast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        for (const toast of state.toasts) {
          addToRemoveQueue(toast.id);
        }
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        toastTimeouts.forEach((timeout, id) => {
          clearTimeout(timeout);
          toastTimeouts.delete(id);
        });
        return {
          ...state,
          toasts: [],
        };
      }

      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

/**
 * An array to keep track of listeners for state changes.
 */
const listeners: Array<(state: State) => void> = [];

/**
 * The initial state of the toasts.
 */
let memoryState: State = { toasts: [] };

/**
 * Dispatches an action to the reducer and notifies listeners.
 *
 * @param {Action} action - The action to be dispatched.
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  for (const listener of listeners) {
    listener(memoryState);
  }
}

/**
 * Represents a toast without an `id` property.
 *
 * @property {React.ReactNode} [title] - The title of the toast.
 * @property {React.ReactNode} [description] - The description of the toast.
 * @property {ToastActionElement} [action] - The action element of the toast.
 */
type Toast = Omit<ToasterToast, "id">;

/**
 * Creates a new toast or updates an existing one.
 *
 * @param {Toast} props - The properties of the toast.
 * @returns {{id: string, dismiss: () => void, update: (props: ToasterToast) => void}} - An object with the toast's ID, a function to dismiss the toast, and a function to update the toast.
 */
function toast({ ...props }: Toast) {
  const id = genId();
  const currentToasts = memoryState.toasts;

  if (currentToasts.length > 0) {
    const lastToast = document.querySelector('[data-state="open"]');
    if (lastToast) {
      const peekToast = document.createElement("div");
      peekToast.className =
        "toast-peek border border-pink-500 bg-[var(--c-bg-lighter)] p-6 rounded-md shadow-lg";

      const content = document.createElement("div");
      content.className = "grid gap-2";

      if (props.title) {
        const title = document.createElement("div");
        title.className = "text-base font-semibold";
        title.textContent = props.title as string;
        content.appendChild(title);
      }

      if (props.description) {
        const desc = document.createElement("div");
        desc.className = "text-base opacity-90";
        desc.textContent = props.description as string;
        content.appendChild(desc);
      }

      peekToast.appendChild(content);
      document.body.appendChild(peekToast);

      requestAnimationFrame(() => {
        peekToast.classList.add("show");
      });

      setTimeout(() => {
        peekToast.remove();
      }, TOAST_REMOVE_DELAY);
    }
  }

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

/**
 * Interface for the return value of the useToast hook
 */
interface UseToastReturn extends State {
  toast: (props: Toast) => {
    id: string;
    dismiss: () => void;
    update: (props: ToasterToast) => void;
  };
  dismiss: (toastId?: string) => void;
}

/**
 * Hook to use the toast functionality.
 *
 * @returns {UseToastReturn} Object containing toast state and control functions
 */
function useToast(): UseToastReturn {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
