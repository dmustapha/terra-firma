import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "./theme";
import { CALLS, Callout, Captions, Footage, SpeedTag, Strata, WalletCard, camera, useT } from "./components/film";
import { ClosePlate, Flywheel, HookCount, LimitsChip, SystemLabels, TitlePlate, WhoChips } from "./components/scenes";

export const Main: React.FC = () => {
  const t = useT();
  const cam = camera(t);
  const active = CALLS.filter((c) => c.label && t >= c.t && t <= c.t + c.d);
  // captions move to the top while a named element sits low on screen, so they never cover it
  const low = active.some((c) => cam.s * (c.rect[1] + c.rect[3]) + cam.ty > 860 || (c.place === "below" && cam.s * (c.rect[1] + c.rect[3]) + cam.ty > 760));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`, transformOrigin: "0 0" }}>
        <Footage />
        {active.map((c, i) => <Callout key={i} c={c} t={t} />)}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 64%, rgba(0,0,0,0.32) 100%)" }} />
      <HookCount t={t} />
      <TitlePlate t={t} />
      <SystemLabels t={t} />
      <Flywheel t={t} />
      <WhoChips t={t} />
      <LimitsChip t={t} />
      <WalletCard t={t} />
      <ClosePlate t={t} />
      <SpeedTag t={t} />
      <Strata t={t} />
      <Captions t={t} top={low} />
    </AbsoluteFill>
  );
};
