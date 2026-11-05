# Super Mario 64 Parity Backlog

High-level roadmap and tasks to achieve 1:1 gameplay feel, physics, kinematic curves, camera behavior, and animation parity with _Super Mario 64_ (referencing the matching C decompilation in `n64decomp/sm64`).

---

## 1. Ground Locomotion & Turning

- [x] **Jump Height Progression & Velocity Scaling** (`mario_actions_airborne.c`)
  - Jump 1 ($v_y = 42\text{f} + 0.25\text{f} \cdot v_{\text{fwd}}$), Jump 2 ($v_y = 52\text{f} + 0.25\text{f} \cdot v_{\text{fwd}}$), Jump 3 ($v_y = 69\text{f}$ flat).
  - Short-hop cutoff on single/double jumps; full commitment on acrobatic triple jumps.
  - Apex hangtime gravity softening factor.
- [ ] **Turn Skid / Drift** (`mario_actions_moving.c: act_turning_around`)
  - When reversing direction ($\Delta \theta > 135^\circ$) at high speed, enter the skidding state.
  - Decelerate with friction sliding while facing the new direction before kicking off with full acceleration.
  - Skid smoke/dust particles at player feet.
- [ ] **Long Jump Dynamics & Landing Rollout** (`mario_actions_airborne.c: act_long_jump`)
  - Crouching while running launches forward with $1.5\times$ momentum boost and low parabolic arc ($v_y = 30\text{f}$).
  - Low aerodynamic leap pose with legs kicked back.
  - Landing into forward slide rollout before popping back into running.
- [ ] **Belly Slide, Dive & Slide-Kick** (`mario_actions_airborne.c: act_dive`, `act_slide_kick`)
  - Mid-air dive forward into a belly slide.
  - Sliding on steep grass/sand slopes accelerated by normal incline angle ($\sin(\theta) \cdot g$).
  - Slide recovery get-up transition.

---

## 2. Aerial & Wall Mechanics

- [x] **Airborne Foot Articulation & Landing Cushioning** (`character-motion.ts`)
  - Plantar flexion (toes pointed down) while airborne.
  - Toes touch down first, flattening as knees bend and hips compress to cushion the landing.
- [x] **Triple Jump Multi-Phase Somersault** (`character-motion.ts`)
  - Phase 1: Launch with arm reach.
  - Phase 2: Rapid angular acceleration into tight tuck & roll.
  - Phase 3: Deceleration and unfolding with arms out for landing.
- [ ] **Wall Slide & Wall Kick Parity** (`mario_actions_airborne.c: act_air_hit_wall`, `act_wall_kick_air`)
  - Wall collision detection with incident angle tolerance.
  - Slower wall contact sliding descent with friction.
  - Wall kick impulse: $45^\circ$ deflection vector with $v_{\text{fwd}} = 24\text{f}$ and $v_y = 52\text{f}$.
- [ ] **Ground Pound Plunge & Shockwave** (`mario_actions_airborne.c: act_ground_pound`)
  - Mid-air stall with 360° flip tuck.
  - High-velocity vertical drop ($v_y = -75\text{f}$ terminal velocity).
  - Heavy landing impact with ground compression and dust shockwave.
- [ ] **Ledge Hang, Shimmy & Pop-Up** (`mario_actions_airborne.c: act_ledge_grab`)
  - Smooth ledge snap and hanging swing idle.
  - Shimmying along walkable ledge edges.
  - Pull-up climbing animation with root translation matching geometry.

---

## 3. Tree & Pole Climbing Mechanics (`mario_actions_object.c`)

- [ ] **Tree / Pole Rig Poses & Grasping** (`act_holding_pole`)
  - Torso-to-trunk hugging alignment facing the center axis of the tree.
  - Arms wrapped around the trunk with bent elbows; knees and inner feet clasping the bark.
  - Circumference orbiting: analog horizontal stick inputs orbit the player smoothly around the tree's perimeter.
- [ ] **Climbing & Sliding Kinematics** (`act_climbing_pole`)
  - Alternating hand-over-hand and knee-hitch climbing gait going upward.
  - Smooth vertical slide down the trunk with bark friction.
- [ ] **Reaching the Top: Handstand Transition & Pose** (`act_top_of_pole_transition`, `act_top_of_pole`)
  - Upon reaching the top of the trunk/pole, hoist up over the rim into a full two-handed handstand.
  - Balance upside down on top of the tree with legs extended in the air.
  - Horizontal input pirouettes/spins the character in place while balancing on hands.
- [ ] **Dismounts & Let-Go Mechanics** (`act_top_of_pole_jump`)
  - **Handstand Launch Leap**: Pressing jump while in the top handstand launches the player straight up into a super high vertical leap ($v_y = 62\text{f}$) followed by a somersault descent.
  - **Mid-Trunk Kick-Off**: Pressing jump while attached to the trunk kicks outward and away with back-deflection impulse ($v_{\text{away}} = 18\text{f}, v_y = 36\text{f}$).
  - **Drop / Let Go**: Pressing crouch releases grip and drops the character straight down off the trunk without outward push.

---

## 4. Aquatic & Swimming Mechanics (`mario_actions_submerged.c`)

- [ ] **Breaststroke & Flutter Kick States**
  - Rhythm-based swimming: pressing the swim button initiates a powerful breaststroke propulsion.
  - Holding or releasing transitions to gentle flutter kicking with natural water drag.
- [ ] **Pitch & Depth Swimming Controls**
  - Smooth 3D swimming pitch control: tilting up/down dives and surfaces.
  - Surface swimming vs. underwater free exploration.
- [ ] **Water Surface Entry & Water Jump**
  - Splash impact and sound upon entering water from a high jump.
  - Breaching the surface with upward momentum into a water leap.

---

## 5. Camera Dynamics (Lakitu / Mario Cam) (`camera.c`)

- [ ] **8-Way C-Button Camera Stepping**
  - Snappy $45^\circ$ directional orbit increments when tapping C-Left / C-Right.
  - Preset zoom toggle (Lakitu normal $\to$ Mario close-up $\to$ overhead wide view).
- [ ] **Intelligent Corner Peeking & Obstacle Easing**
  - Camera rotates around pillars and building corners without getting caught on edges.
  - Avoid pushing through transparent interior ceilings.
- [ ] **First-Person Look-Around Mode**
  - Static stationary 360° camera pan when holding look mode.

---

## 6. Animation, Rig & Visual Polish

- [ ] **Head Gaze Tracking**
  - Character head turns to look at nearby NPCs, points of interest, collectible items, and dangerous drops.
- [ ] **Step & Impact Particle FX**
  - Small dust puffs on every footfall during full sprint.
  - Friction skid smoke on direction reversals.
  - Landing impact dust ring proportional to fall distance.
