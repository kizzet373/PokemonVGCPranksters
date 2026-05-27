import React from 'react';
import { getNameAsset } from '../../utils/assets';
import { formatPascalCase } from '../../utils/format';

export function NameWithSprite({ children, className = '', fallback = '', id, kind, name }) {
  const asset = getNameAsset({ kind, id, name });
  const label = formatPascalCase(name ?? id, fallback);
  const classes = ['name-with-sprite', className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {asset ? <img alt="" className="name-with-sprite__image" loading="lazy" src={asset} /> : null}
      <span className="name-with-sprite__label">{children ?? label}</span>
    </span>
  );
}
