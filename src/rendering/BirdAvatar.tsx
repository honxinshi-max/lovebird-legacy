import type { CSSProperties } from 'react';

import { derivePhenotype } from '../domain/phenotype';
import { RULESET } from '../domain/rules';
import type { Bird } from '../domain/types';

interface BirdAvatarProps {
  bird: Bird;
  size?: 'mini' | 'card' | 'detail' | 'reveal';
}

type BirdStyle = CSSProperties & {
  '--bird-body': string;
  '--bird-face': string;
  '--bird-eye': string;
  '--bird-scale': number;
  '--tail-scale': number;
};

export function BirdAvatar({ bird, size = 'card' }: BirdAvatarProps) {
  const phenotype = derivePhenotype(bird);
  const species = RULESET.species[bird.speciesAtBirth];
  const sexLabel = bird.sex === 'male' ? '公鸟' : '母鸟';
  const style: BirdStyle = {
    '--bird-body': `var(--bird-${phenotype.bodyColorToken})`,
    '--bird-face': `var(--face-${phenotype.faceColorToken})`,
    '--bird-eye': `var(--eye-${phenotype.eyeColorToken})`,
    '--bird-scale': phenotype.bodyScale,
    '--tail-scale': phenotype.tailScale,
  };

  return (
    <svg
      className={`bird-avatar bird-avatar--${size}`}
      viewBox="0 0 320 250"
      role="img"
      aria-label={`${species.label} ${bird.status.name}，${sexLabel}`}
      style={style}
    >
      <defs>
        <linearGradient id={`body-light-${bird.birdId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(255 255 255 / 28%)" />
          <stop offset="0.62" stopColor="rgb(255 255 255 / 0%)" />
          <stop offset="1" stopColor="rgb(15 39 33 / 16%)" />
        </linearGradient>
        <pattern
          id={`pied-${bird.birdId}`}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="7" cy="8" r="5" fill="rgb(255 247 218 / 38%)" />
          <circle cx="22" cy="20" r="4" fill="rgb(21 61 52 / 18%)" />
        </pattern>
      </defs>

      <ellipse cx="157" cy="222" rx="91" ry="9" fill="rgb(30 53 46 / 12%)" />
      <g className="bird-breathe" transform={`translate(0 0) scale(${phenotype.bodyScale})`}>
        <g
          data-testid="bird-tail"
          transform={`translate(0 ${220 - 220 * phenotype.tailScale}) scale(1 ${phenotype.tailScale})`}
        >
          <path d="M146 176 C132 211 135 231 148 239 C155 214 162 196 168 176 Z" fill="var(--bird-body)" />
          <path d="M168 176 C168 210 177 231 190 237 C190 207 185 190 181 173 Z" fill="color-mix(in srgb, var(--bird-body), #163f37 18%)" />
        </g>

        <path
          data-testid="bird-body"
          d="M97 143 C95 101 123 70 167 72 C213 75 238 108 229 153 C223 194 194 215 153 211 C114 207 91 182 97 143 Z"
          fill={`var(--bird-${phenotype.bodyColorToken})`}
        />
        <path
          d="M97 143 C95 101 123 70 167 72 C213 75 238 108 229 153 C223 194 194 215 153 211 C114 207 91 182 97 143 Z"
          fill={`url(#body-light-${bird.birdId})`}
        />
        {phenotype.pattern === 'pied' ? (
          <path
            d="M97 143 C95 101 123 70 167 72 C213 75 238 108 229 153 C223 194 194 215 153 211 C114 207 91 182 97 143 Z"
            fill={`url(#pied-${bird.birdId})`}
          />
        ) : null}

        <path
          data-testid="bird-wing"
          d="M145 112 C184 105 219 128 216 165 C207 187 181 197 150 188 C171 170 174 141 145 112 Z"
          fill="color-mix(in srgb, var(--bird-body), #123d34 21%)"
          stroke={phenotype.pattern === 'edged' ? '#f3d894' : 'rgb(255 255 255 / 15%)'}
          strokeWidth={phenotype.pattern === 'edged' ? 5 : 2}
        />
        <path
          d="M157 125 C184 127 198 144 197 165 C184 156 170 149 151 146"
          fill="none"
          stroke="rgb(255 255 255 / 22%)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <g className="bird-head-tilt">
          <ellipse
            data-testid="bird-face"
            cx="126"
            cy="83"
            rx={phenotype.faceShape === 'round' ? 49 : 45}
            ry={phenotype.faceShape === 'wedge' ? 43 : 48}
            fill="var(--bird-face)"
          />
          <path
            d="M87 72 C98 48 119 36 147 40 C165 45 177 59 178 77 C151 64 119 62 87 72 Z"
            fill="color-mix(in srgb, var(--bird-face), #fff 12%)"
          />
          <g className="bird-blink">
            <circle cx="108" cy="76" r="9" fill="#f6f0d7" />
            <circle cx="108" cy="76" r="5.5" fill="var(--bird-eye)" />
            <circle cx="106" cy="73" r="1.8" fill="#fff" />
          </g>
          <path d="M76 91 L101 82 L101 101 Z" fill="#d88a60" />
          <path d="M76 91 L101 91 L90 102 Z" fill="#b8664c" />
          <path d="M121 118 C115 129 115 139 121 147" fill="none" stroke="rgb(66 45 35 / 30%)" strokeWidth="2" />
        </g>

        <path d="M131 205 L127 220" stroke="#66533d" strokeWidth="5" strokeLinecap="round" />
        <path d="M169 207 L174 220" stroke="#66533d" strokeWidth="5" strokeLinecap="round" />
        <path d="M117 220 H139 M164 220 H186" stroke="#66533d" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M47 222 C113 216 208 217 277 225" fill="none" stroke="#795d3f" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
