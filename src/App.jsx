import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout';
import { AttacksView, ItemsView, PlayersView, PokemonView, SpeedCheckView, TournamentsView } from './components/views';

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
        <Route path="/speed-check" element={<SpeedCheckView />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Routes>
    </AppShell>
  );
}
