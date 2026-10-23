# Upgrade the full cast to the approved Lehi style

The user approved the current playable Lehi and explicitly requested extending it to every character. Preserve his current model and use the same continuous tunic, fitted coat, arm skinning, and movement solver throughout. Nephi is youthful and clean-shaven; Laman and Lemuel have distinct scruffy civilian faces; Laban has regal clothing. Guards retain enemy cues. Sariah, Sam, Zoram, the voyage child, disguises, and background people receive matching treatment.

1. Model builder: add explicit traits and clothing variants for all named roles. Keep the original style study. Provide lower-detail NPC/crowd options with continuous silhouettes.
2. Rig/factory: promote the accepted playable rig to the game's shared factory. Extract the existing movement solver into a transform-only driver. Keep independently owned animation buffers and a bounded source cache.
3. Scene integration: replace role stand-ins with Lemuel, Zoram, Laban, and child roles. Preserve story behavior and instanced background crowds.
4. Validation: retain motion/collision/camera checks and update primitive-specific tests to sculpted geometry semantics. Compare cast poses and representative scenes visually, close QA tabs, and leave a local preview for feedback.

Work continues in the existing local checkout so the user's approved, uncommitted Lehi iterations are included. Sol agents own model, scene, and test files separately; the primary agent owns the factory and rig. No new art dependency or external asset licensing is introduced.
