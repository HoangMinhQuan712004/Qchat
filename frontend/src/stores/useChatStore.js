import create from 'zustand'

export const useChatStore = create((set) => ({
  connected: false,
  messages: [],
  usersOnline: {},
  addMessage: (m) => set(state => {
    // Deduplication check
    if (state.messages.some(ex => ex._id === m._id)) return state;

    // If receiving a real message, check if we have a matching optimistic one to replace
    if (!m.isOptimistic) {
      // 1. Check by nonce (strongest match)
      if (m.nonce) {
        const matchIndex = state.messages.findIndex(ex => ex.isOptimistic && ex.nonce === m.nonce);
        if (matchIndex !== -1) {
          const newMsgs = [...state.messages];
          newMsgs[matchIndex] = m;
          return { messages: newMsgs };
        }
      }

      // 2. Fallback check (text + sender + recent) - mostly legacy
      const matchIndex = state.messages.findIndex(ex => ex.isOptimistic && ex.text === m.text && (ex.sender._id === m.sender._id || ex.sender === m.sender._id));

      if (matchIndex !== -1) {
        const newMsgs = [...state.messages];
        newMsgs[matchIndex] = m; // Replace optimistic with real
        return { messages: newMsgs };
      }
    }

    return { messages: [...state.messages, m] };
  }),
  setConnected: (v) => set({ connected: v }),
  setUsersOnline: (map) => set({ usersOnline: map })
}));
