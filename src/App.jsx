import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout';
import {
  AttacksView,
  ItemsView,
  PlayersView,
  PokemonView,
  SpeedCheckView,
  TournamentsView,
  TypeCheckView,
} from './components/views';

const DamageCalcView = lazy(() => import('./components/views/DamageCalcView').then((module) => ({
  default: module.DamageCalcView,
})));

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/pokemon" replace />} />
        <Route path="/pokemon" element={<PokemonView />} />
        <Route path="/items" element={<ItemsView />} />
        <Route path="/moves" element={<AttacksView />} />
        <Route path="/players" element={<PlayersView />} />
        <Route path="/tournaments" element={<TournamentsView />} />
        <Route
          path="/damage-calc"
          element={(
            <Suspense fallback={<div className="empty-state">Loading...</div>}>
              <DamageCalcView />
            </Suspense>
          )}
        />
        <Route path="/speed-check" element={<SpeedCheckView />} />
        <Route path="/type-check" element={<TypeCheckView />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Routes>
    </AppShell>
  );
}
