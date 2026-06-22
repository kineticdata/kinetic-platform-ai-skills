import { configureStore, combineSlices, createSlice, type PayloadAction, type Slice } from '@reduxjs/toolkit';
import type { Space, Kapp, User, KineticError } from './types/kinetic';

// `combineSlices(...).inject` requires @reduxjs/toolkit ≥ 2.0.

const init = createSlice({
  name: 'init',
  initialState: false,
  reducers: { regRedux: () => true },
});

const rootReducer = combineSlices(init);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['view/handleResize', 'confirm/open'],
        ignoredPaths: ['confirm.options.accept', 'confirm.options.cancel'],
      },
    }),
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

/**
 * `regRedux` registers a named slice at runtime and returns an object whose
 * properties are wrapped action creators that dispatch on call.
 *
 * Typed generics:
 *   - TState     — the slice's state shape
 *   - TReducers  — a record of reducer-shaped handlers `(state, payload) => void | TState`
 *
 * The returned action map has one method per reducer, each accepting that reducer's
 * payload type and dispatching the action.
 */
export function regRedux<TState, TReducers extends Record<string, (state: TState, payload: any) => void | TState>>(
  name: string,
  initialState: TState,
  reducers: TReducers,
): { [K in keyof TReducers]: (payload: Parameters<TReducers[K]>[1]) => void } {
  const slice = createSlice({
    name,
    initialState,
    reducers: Object.fromEntries(
      Object.entries(reducers).map(([k, fn]) => [
        k,
        (state: TState, action: PayloadAction<unknown>) => fn(state, action.payload as never),
      ]),
    ) as Record<string, (state: TState, action: PayloadAction<unknown>) => void | TState>,
  }) as Slice<TState>;

  (rootReducer as ReturnType<typeof combineSlices>).inject(slice, { overrideExisting: true });
  store.dispatch(init.actions.regRedux());

  return Object.fromEntries(
    Object.entries(slice.actions).map(([k, actionCreator]) => [
      k,
      (payload: unknown) => store.dispatch((actionCreator as (p: unknown) => PayloadAction<unknown>)(payload)),
    ]),
  ) as { [K in keyof TReducers]: (payload: Parameters<TReducers[K]>[1]) => void };
}

// --- Minimum app slice -----------------------------------------------------

interface AppState {
  space: Space | null;
  profile: User | null;
  kapp: Kapp | null;
  kappSlug: string | null;
  error: KineticError | null;
}

export const appActions = regRedux<AppState, {
  setSpace: (state: AppState, payload: { space?: Space; error?: KineticError }) => void;
  setProfile: (state: AppState, payload: { profile?: User; error?: KineticError }) => void;
  setKapp: (state: AppState, payload: { kapp?: Kapp; error?: KineticError }) => void;
}>(
  'app',
  { space: null, profile: null, kapp: null, kappSlug: null, error: null },
  {
    setSpace(state, payload) {
      state.space = payload.space ?? null;
      state.error = payload.error ?? null;
      state.kappSlug = payload.space?.attributesMap?.['Service Portal Kapp Slug']?.[0] ?? 'services';
    },
    setProfile(state, payload) {
      state.profile = payload.profile ?? null;
      state.error = payload.error ?? null;
    },
    setKapp(state, payload) {
      state.kapp = payload.kapp ?? null;
      state.error = payload.error ?? null;
    },
  },
);
