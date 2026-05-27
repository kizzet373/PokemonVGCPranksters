import React from 'react';
import { standingsAssetUrls } from '../../data/standingsSources';
import { useJsonResource } from '../../hooks/useJsonResource';
import { formatDate, formatNumber, formatPascalCase } from '../../utils/format';
import { TournamentStandingsBreakdown } from '../breakdowns';
import { DetailState, ModalShell } from '../common';

export function TournamentStandingsModal({ tournament, onClose }) {
  const moduleKey = tournament ? `./standings/${tournament.id}.json` : null;
  const standingsUrl = standingsAssetUrls[moduleKey];
  const { data: details, error: fetchError } = useJsonResource(standingsUrl);
  const error = fetchError || (tournament && !standingsUrl ? new Error(`Missing standings for ${tournament.id}`) : null);
  const standings = details?.standings ?? [];

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
        { label: 'Format', value: formatPascalCase(tournament.format) },
        { label: 'Game', value: formatPascalCase(tournament.game) },
      ]}
    >
      {error ? <DetailState>Could not load standings for {formatPascalCase(tournament.name)}.</DetailState> : null}
      {!error && !details ? <DetailState>Loading standings for {formatPascalCase(tournament.name)}...</DetailState> : null}
      {details ? <TournamentStandingsBreakdown standings={standings} /> : null}
    </ModalShell>
  );
}
