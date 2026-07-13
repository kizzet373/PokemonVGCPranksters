import React, { useEffect, useState } from 'react';
import { loadStandings } from '../../data/reportDataClient';
import { formatDate, formatNumber, formatPascalCase, formatTournamentFormat } from '../../utils/format';
import { TournamentStandingsBreakdown } from '../breakdowns';
import { DetailState, ModalShell } from '../common';

export function TournamentStandingsModal({ tournament, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const standings = details?.standings ?? [];

  useEffect(() => {
    let ignored = false;

    setDetails(null);
    setError(null);

    if (!tournament?.id) {
      return () => {
        ignored = true;
      };
    }

    loadStandings(tournament.id)
      .then((nextDetails) => {
        if (!ignored) {
          setDetails(nextDetails);
        }
      })
      .catch((loadError) => {
        if (!ignored) {
          setError(loadError);
        }
      });

    return () => {
      ignored = true;
    };
  }, [tournament?.id]);

  if (!tournament) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(tournament.name)} standings`}
      className="tournament-modal"
      eyebrow={`${formatDate(tournament.date)} - ${formatNumber(tournament.players)} players`}
      onClose={onClose}
      title={formatPascalCase(tournament.name)}
      stats={[
        { label: 'Players', value: formatNumber(tournament.players) },
        { label: 'Standings', value: details ? formatNumber(details.standingsCount ?? standings.length) : '...' },
        { label: 'Format', value: formatTournamentFormat(tournament.format) },
        { label: 'Game', value: formatPascalCase(tournament.game) },
      ]}
    >
      {error ? <DetailState>Could not load standings for {formatPascalCase(tournament.name)}.</DetailState> : null}
      {!error && !details ? <DetailState>Loading standings for {formatPascalCase(tournament.name)}...</DetailState> : null}
      {details ? <TournamentStandingsBreakdown standings={standings} /> : null}
    </ModalShell>
  );
}
