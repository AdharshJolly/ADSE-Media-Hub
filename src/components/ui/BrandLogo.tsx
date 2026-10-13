/* Static brand logo. Swaps light/dark artwork via html.dark (see .bl-* in globals.css). */
export default function BrandLogo({ variant = 'horizontal', height = 36, force }: { variant?: 'horizontal' | 'icon'; height?: number; force?: 'dark' }) {
  const base = variant === 'icon' ? '/brand/adse-icon' : '/brand/adse-logo-horizontal';
  const dark = force === 'dark' && variant === 'horizontal' ? `${base}-onblue.svg` : `${base}-dark.svg`;
  const style = { height, width: 'auto', display: 'block' } as const;
  return (
    <span className={force === 'dark' ? 'bl bl-force-dark' : 'bl'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bl-light" src={`${base}.svg`} alt="ADSE Media Hub" style={style} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bl-dark" src={dark} alt="" aria-hidden style={style} />
    </span>
  );
}
