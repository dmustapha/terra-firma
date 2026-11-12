import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { FPS, f } from "./theme";
import plan from "./plan.json";
export const Root: React.FC = () => <Composition id="Main" component={Main} durationInFrames={f(plan.total)} fps={FPS} width={1920} height={1080} />;
