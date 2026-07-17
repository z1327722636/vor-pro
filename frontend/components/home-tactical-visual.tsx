export function HomeTacticalVisual() {
  return (
    <div className="tactical-visual" aria-hidden="true">
      <div className="tactical-visual__glow" />
      <div className="tactical-visual__status tactical-visual__status--top">
        <span className="tactical-visual__status-dot" />
        LIVE TRAJECTORY
      </div>
      <div className="tactical-visual__status tactical-visual__status--bottom">
        <span>LOCK</span>
        <strong>98.4%</strong>
      </div>

      <svg className="tactical-visual__svg" viewBox="0 0 760 760" role="presentation">
        <defs>
          <linearGradient id="map-surface" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c2631" />
            <stop offset="0.55" stopColor="#111820" />
            <stop offset="1" stopColor="#090d12" />
          </linearGradient>
          <linearGradient id="trajectory-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#94d2ff" stopOpacity="0" />
            <stop offset="0.35" stopColor="#94d2ff" />
            <stop offset="1" stopColor="#ff4655" />
          </linearGradient>
          <radialGradient id="target-glow">
            <stop offset="0" stopColor="#ff4655" stopOpacity="0.5" />
            <stop offset="0.55" stopColor="#ff4655" stopOpacity="0.12" />
            <stop offset="1" stopColor="#ff4655" stopOpacity="0" />
          </radialGradient>
          <pattern id="micro-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#94d2ff" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
          <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="map-clip">
            <path d="M380 45 664 209 664 537 380 701 96 537 96 209Z" />
          </clipPath>
        </defs>

        <g className="tactical-visual__orbit tactical-visual__orbit--outer">
          <circle cx="380" cy="373" r="315" fill="none" stroke="#94d2ff" strokeOpacity="0.13" strokeWidth="1" strokeDasharray="3 18" />
          <circle cx="380" cy="58" r="4" fill="#94d2ff" />
        </g>
        <g className="tactical-visual__orbit tactical-visual__orbit--inner">
          <circle cx="380" cy="373" r="276" fill="none" stroke="#ece8e1" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="70 12 8 12" />
        </g>

        <path d="M380 45 664 209 664 537 380 701 96 537 96 209Z" fill="url(#map-surface)" stroke="#ece8e1" strokeOpacity="0.22" strokeWidth="2" />
        <g clipPath="url(#map-clip)">
          <rect x="80" y="30" width="600" height="690" fill="url(#micro-grid)" />
          <path d="M104 273 206 219 270 255 321 191 415 197 459 250 590 208 680 260V421L602 449 551 526 445 490 385 607 307 554 241 583 189 491 84 461Z" fill="#1b2631" stroke="#94d2ff" strokeOpacity="0.22" strokeWidth="2" />
          <path d="M207 219V350L294 395 385 342 459 380 551 325 590 208M241 583 294 395M385 607V342M551 526V325" fill="none" stroke="#ece8e1" strokeOpacity="0.12" strokeWidth="2" />
          <path d="M104 273 207 350 189 491M270 255 294 395 321 191M415 197 385 342 459 250M602 449 551 325 680 421" fill="none" stroke="#94d2ff" strokeOpacity="0.14" strokeDasharray="5 8" />
          <path d="M72 598 701 178" stroke="#ff4655" strokeOpacity="0.05" strokeWidth="110" />
          <path d="M-20 530 635 94" stroke="#ff4655" strokeOpacity="0.06" strokeWidth="18" />
          <path className="tactical-visual__scan" d="M80 185H680" stroke="#94d2ff" strokeOpacity="0.45" strokeWidth="2" />
        </g>

        <g className="tactical-visual__site-label">
          <path d="M178 354h76v44h-76z" fill="#0a0e13" stroke="#94d2ff" strokeOpacity="0.45" />
          <text x="196" y="382" fill="#94d2ff" fontSize="16" fontWeight="700">A / 01</text>
        </g>
        <g className="tactical-visual__site-label tactical-visual__site-label--delay">
          <path d="M493 438h76v44h-76z" fill="#0a0e13" stroke="#ece8e1" strokeOpacity="0.35" />
          <text x="510" y="466" fill="#ece8e1" fontSize="16" fontWeight="700">B / 02</text>
        </g>

        <circle cx="535" cy="286" r="94" fill="url(#target-glow)" />
        <g transform="translate(535 286)" filter="url(#soft-glow)">
          <g className="tactical-visual__target">
            <circle r="46" fill="none" stroke="#ff4655" strokeOpacity="0.75" strokeWidth="2" strokeDasharray="16 8" />
            <circle r="25" fill="none" stroke="#ff4655" strokeOpacity="0.45" />
            <path d="M-67 0h40M27 0h40M0-67v40M0 27v40" stroke="#ff4655" strokeWidth="2" />
            <circle r="5" fill="#ff4655" />
          </g>
        </g>

        <path id="lineup-trajectory" className="tactical-visual__trajectory" d="M192 489C278 360 357 244 535 286" fill="none" stroke="url(#trajectory-gradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 11" />
        <path d="M192 489C278 360 357 244 535 286" fill="none" stroke="#94d2ff" strokeOpacity="0.12" strokeWidth="18" strokeLinecap="round" />
        <circle className="tactical-visual__moving-point" r="8" fill="#ece8e1" filter="url(#soft-glow)">
          <animateMotion dur="3.6s" repeatCount="indefinite" rotate="auto">
            <mpath href="#lineup-trajectory" />
          </animateMotion>
        </circle>

        <g className="tactical-visual__origin" transform="translate(192 489)">
          <circle r="20" fill="#94d2ff" fillOpacity="0.12" stroke="#94d2ff" strokeWidth="2" />
          <circle r="6" fill="#94d2ff" />
          <path d="M-32 0h18M14 0h18M0-32v18M0 14v18" stroke="#94d2ff" strokeOpacity="0.7" />
        </g>

        <g fill="#94d2ff">
          <circle className="tactical-visual__node tactical-visual__node--one" cx="294" cy="395" r="5" />
          <circle className="tactical-visual__node tactical-visual__node--two" cx="385" cy="342" r="5" />
          <circle className="tactical-visual__node tactical-visual__node--three" cx="459" cy="380" r="5" />
        </g>

        <g className="tactical-visual__ticks" fill="#9ba0a6" fontSize="11" fontWeight="600">
          <text x="368" y="24">N 00°</text>
          <text x="685" y="377">E 90°</text>
          <text x="363" y="744">S 180°</text>
          <text x="29" y="377">W 270°</text>
        </g>
      </svg>

      <div className="tactical-visual__coordinates">
        <span>LAT 34.0872</span>
        <span>LNG 118.3441</span>
      </div>
    </div>
  );
}
