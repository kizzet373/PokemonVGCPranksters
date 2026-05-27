import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AttacksView, ItemsView, PlayersView, PokemonView, TournamentsView } from './views';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pokemon" replace />} />
      <Route path="/pokemon" element={<PokemonView />} />
      <Route path="/items" element={<ItemsView />} />
      <Route path="/moves" element={<AttacksView />} />
      <Route path="/players" element={<PlayersView />} />
      <Route path="/tournaments" element={<TournamentsView />} />
      <Route path="*" element={<Navigate to="/pokemon" replace />} />
    </Routes>
  );
}
