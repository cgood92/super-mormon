# A People of Peace

Primary source: [Fourth Nephi 1](https://www.churchofjesuschrist.org/study/scriptures/bofm/4-ne/1?lang=eng), especially verses 1–18 (peace, shared goods, rebuilt cities) and 23–49 (later pride, division and loss over generations). The chapter was consulted directly during implementation.

The scene takes place decades after Christ's visit, during the peaceful generations. It adapts everyday cooperation: carry two differently colored shaped timbers from separate workshops to the western bridge abutment, where each becomes a real walkable deck segment. Then carry the shared seed basket across the restored bridge to the eastern storehouse. Walking the longer ford reaches the eastern bank but does not substitute for carrying supplies across the completed span. The ford is freely accessible throughout.

The named scripture supports rebuilt cities, justice, peace, and goods held in common. The unnamed city, its position, channel, bridge construction, costumes, architecture, artisans, seed errand, gardens, conversations and player role are imagined. They are not a reconstruction of a known ancient site. No named ancient individual appears here. The workers use varied approved character rigs as unnamed residents. The player is an imagined peace-builder. No miracles, ordinances or conversion are awarded for this errand.

Optional places are a supported workshop roof route, a pottery court and a spring garden. Discovery text reflects on rebuilding and generosity; the spring reflection acknowledges the chapter's later divisions over generations. These finds do not gate the main task or sacred events. Completion leaves the city available for exploration.

## Navigation and verification

Start (-8,7). Northern workshop: follow the central lane to (-8,-9), west to (-20,-9), then enter at (-20,-14). Return through the doorway to the central lane, then the west bridge abutment (-3,0). Southern workshop: follow (-8,19), (-22,19), (-22,14), then retrace its doorway and central lane. Fit the second timber at (-3,0). Seeds wait at (-12,12). Carry via (-8,0), (-3,0), (0,0), (3,0), (8,0), (14,0); interact at the storehouse.

Ford: use (-8,22) → (8,22). Roof: west outer lane (-32,3), stairs (-29.6,1) → (-29.6,-4.85), landing (-27.5,-4.85), connector (-25.7,-4.85) → (-25.7,-6) → northern workshop roof. Potter discovery (-24,22); spring discovery (27,-17), accessed by the outer eastern lane.

Tests were written first and failed with the absent module. Colocated tests then exercise actual `stepPlayer` workshop/return routes, bridge assembly, supplied ford bypass rejection, completed bridge crossing, completion once, roof stairs and landing, all three optional discoveries, blocked trunks/walls and routes around them, safe retry with carried timber, large dt, semantic scenery collision and idempotent resource disposal. No authored cinematic camera is used. Garden foliage uses one instanced mesh, disposed by the scene kit. Thin paving is decorative finish above each single physical ground owner; skyline blocks are explicitly distant backdrops outside bounds.
