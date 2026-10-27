# Stage armchair collision

The twelve upholstered stage chairs previously had rendered cushions but no physical surfaces. Seats, backs and both arms now use the shared scenery box helper, with the same dimensions driving rendering and collision at the stage elevation. The existing 48 visible parts remain; gaps between chairs stay open.

Regression tests first reproduced walking through a chair and falling through its cushion. They now check blocked front/back/side approaches, jump landings on all twelve cushions, gaps between adjacent chairs, matching world-space bounds and semantic collision ownership. Existing stage route tests now use the open front and center aisles rather than intersecting chairs; integrated turn inputs brake before the narrow front aisle.

Verification: 395 full-suite tests pass; production build, formatting and diff checks pass. Independent review found no production defect. A normal-input browser route traveled from the gallery around its painting wall, entered the auditorium, used the side stairs, and approached a chair. Walking stopped at its front (z=-80.08), and a jump landed on its back (feet y=4.165). Phone-sized close view confirmed visible/collision alignment. No gameplay objectives were added to the auditorium.
