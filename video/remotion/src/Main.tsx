import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "./theme";
import { CALLS, Callout, Captions, Footage, Patches, SpeedTag, Strata, WalletCard, camera, useT } from "./components/film";
import { ClosePlate, Flywheel, HookCount, LimitsChip, SystemLabels, TitlePlate, WhoChips } from "./components/scenes";

export const Main: React.FC = () => {
  const t = useT();
  const cam = camera(t);
  const active = CALLS.filter((c) => c.label && t >= c.t && t <= c.t + c.d);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* 4% crop from the top centre keeps Chrome's link-hover status bubble (bottom-left, ~22 px) out of every frame */}
      <AbsoluteFill style={{ transform: "scale(1.04)", transformOrigin: "50% 0" }}>
      <AbsoluteFill style={{ transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`, transformOrigin: "0 0" }}>
        <Footage />
        <Patches t={t} />
        {active.map((c, i) => <Callout key={i} c={c} t={t} />)}
      </AbsoluteFill>
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
      <Captions t={t} top={false} />
    </AbsoluteFill>
  );
};
