import React, { useEffect, useState } from 'react';
import { standingsAssetUrls } from '../../data/sources';
import { normalizeDataValues } from '../../utils/dataNormalization';
import { formatDate, formatNumber, formatPascalCase } from '../../utils/format';
import { TournamentStandingsBreakdown } from '../breakdowns';
import { ModalShell } from '../common';

export function TournamentStandingsModal({ tournament, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournament) {
      return undefined;
    }

    let ignored = false;
    const controller = new AbortController();

    setDetails(null);
    setError(null);

    const moduleKey = `./standings/${tournament.id}.json`;
    const standingsUrl = standingsAssetUrls[moduleKey];

    if (!standingsUrl) {
      setError(new Error(`Missing standings for ${tournament.id}`));
      return () => {
        ignored = true;
        controller.abort();
      };
    }

    fetch(standingsUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load standings for ${formatPascalCase(tournament.name)}`);
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setDetails(normalizeDataValues(json));
        }
      })
      .catch((fetchError) => {
        if (!ignored && fetchError.name !== 'AbortError') {
          setError(fetchError);
        }
      });

    return () => {
      ignored = true;
      controller.abort();
    };
  }, [tournament]);

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
      {error ? <p className="detail-state">Could not load standings for {formatPascalCase(tournament.name)}.</p> : null}
      {!error && !details ? <p className="detail-state">Loading standings for {formatPascalCase(tournament.name)}...</p> : null}
      {details ? <TournamentStandingsBreakdown standings={standings} /> : null}
    </ModalShell>
  );
}
