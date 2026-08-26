// Renders a solution's "Correct Answer" value. A stored answer isn't
// always pure math — it can be a letter prefix ("A."), a number followed
// by units ("4,995 kg per second"), a pure math expression ("x = y/77b"),
// or plain prose with no math at all ("The estimated number of
// catalogs..."). Sending the whole thing through MathJax collapses spaces
// in anything that isn't actually math, which is why answers like these
// used to render as one run-together word. planAnswerRender() (in
// mathSafe.ts) classifies the value the same way the original app's
// setSafeAnswer() did, so only the part that's actually math goes through
// MathJax here.

import { planAnswerRender } from "@/lib/exam/mathSafe";
import { SafeMathText } from "./SafeMathText";

export function SafeAnswerText({ value }: { value: string }) {
  const plan = planAnswerRender(value);
  const prefix = plan.letter && `${plan.letter}. `;

  if (plan.kind === "empty") return plan.letter ? <span>{plan.letter}.</span> : null;

  return (
    <span>
      {prefix}
      {plan.kind === "number-then-words" && (
        <>
          <SafeMathText tex={plan.number} /> {plan.words}
        </>
      )}
      {plan.kind === "math" && <SafeMathText tex={plan.body} />}
      {plan.kind === "prose" && plan.body}
    </span>
  );
}
