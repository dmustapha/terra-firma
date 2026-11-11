/** The halftone ground the page stands on: five moss dot screens, each clipped by a wave, denser with depth. */
export function GroundBand({ short = false }: { short?: boolean }) {
  return (
    <div aria-hidden className={short ? "ground-band ground-band--short" : "ground-band"}>
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
