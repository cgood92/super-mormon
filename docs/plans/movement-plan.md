# Shared movement and interaction capabilities

Approved scope: crouch/crawl, long jump, backflip, side somersault, double/triple jumps, wall kicks, ledge grab/pull-up, tree/pole climbing, collectible objectives, and picking up/carrying/throwing objects. All available from the start, with optional opportunities rather than extra required difficulty in the first story.

Implementation choices: extend the existing physics, inputs, and original character animation. Shift/Z, controller trigger or X, and a touch crouch button modify jump. Retain A/Space jump and B/E context action. Landing chains and quick reversals use timing, not more buttons. Direction moves on climbables, jump releases, crouch drops. The existing furniture collision must remain reliable with crouch height and new jumps.

Work split: Sol physics + movement tests; Sol input + animation; Sol carry-object simulation + tests; main integration + optional gallery practice props, six tokens, delivery target and concise moves guide. The modern gallery practice fixtures are imagined interactive exhibits. Story geometry remains inspired by Iron Age Judah.

Verification: behavior tests for movement selection and physics/collision, object trajectories and interaction obstruction, all existing tests, production build, formatting, and browser input playtests. Fresh-save story locks and existing story playthroughs must still work.

No committed base exists in this repository. Changes stay in the current workspace so the running game can be reviewed; agents own different modules.
