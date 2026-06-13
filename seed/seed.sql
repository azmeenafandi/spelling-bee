-- Spelling Bee — Seed Word List
-- Target: 30+ curated words covering British/American/Both variants,
-- lengths 6–10+, and obscurity levels 1–5.

INSERT INTO words (spelling, definition, variant, length, obscurity) VALUES

-- === OBSURITY 1 (Common, primary-school vocabulary) ===

-- Length 6
('garden', 'A piece of ground used for growing flowers, fruit, or vegetables', 'both', 6, 1),
('branch', 'A part of a tree that grows out from the trunk', 'both', 6, 1),
('planet', 'A celestial body orbiting a star', 'both', 6, 1),
('bridge', 'A structure carrying a road, path, or railway over a river or obstacle', 'both', 6, 1),
('hammer', 'A tool with a heavy metal head used for striking', 'both', 6, 1),

-- Length 7
('kitchen', 'A room where food is prepared and cooked', 'both', 7, 1),
('island', 'A piece of land surrounded by water', 'both', 6, 1),
('forest', 'A large area covered chiefly with trees', 'both', 6, 1),
('butter', 'A dairy product made by churning cream', 'both', 6, 1),
('museum', 'A building housing historical or artistic collections', 'both', 6, 1),

-- === OBSURITY 2 (Slightly less common) ===

-- Length 6
('bizarre', 'Very strange or unusual', 'both', 7, 2),
('solemn', 'Formal and dignified; not cheerful', 'both', 6, 2),
('vanish', 'Disappear suddenly and completely', 'both', 6, 2),

-- Length 7
('ancient', 'Belonging to the very distant past', 'both', 7, 2),
('harbour', 'A sheltered place for ships (British spelling)', 'british', 7, 2),
('harbor', 'A sheltered place for ships (American spelling)', 'american', 6, 2),

-- Length 8
('dolphin', 'A marine mammal with a streamlined body', 'both', 7, 2),

-- === OBScurity 3 (Moderate difficulty) ===

-- Length 6
('gnawed', 'Bite at or chew something persistently', 'both', 6, 3),

-- Length 7
('lacquer', 'A liquid coating that dries to a hard shiny finish', 'both', 7, 3),
('thwart', 'To prevent someone from accomplishing something', 'both', 6, 3),

-- Length 8
('camouflage', 'Disguise that blends with the surrounding environment', 'both', 10, 3),
('conscience', 'An inner feeling of right and wrong', 'both', 10, 3),

-- Length 9
('brochure', 'A small booklet containing information about a product or service', 'both', 8, 3),

-- British/American divergents at obscurity 3
('colour', 'The property of objects that produces different sensations on the eye', 'british', 6, 3),
('color', 'The property of objects that produces different sensations on the eye', 'american', 5, 3),
('theatre', 'A building for dramatic performances (British spelling)', 'british', 7, 3),
('theater', 'A building for dramatic performances (American spelling)', 'american', 7, 3),

-- === OBSURITY 4 (Challenging) ===

-- Length 8
('silhouette', 'A dark image or outline against a light background', 'both', 10, 4),
('embarrass', 'To cause someone to feel awkward or ashamed', 'both', 9, 4),

-- Length 9
('privilege', 'A special right or advantage', 'both', 9, 4),
('sacrilege', 'Violation of something sacred', 'both', 9, 4),

-- British/American divergents at obscurity 4
('realise', 'To become fully aware of something (British spelling)', 'british', 7, 4),
('realize', 'To become fully aware of something (American spelling)', 'american', 7, 4),
('favour', 'An act of kindness beyond what is due (British spelling)', 'british', 6, 4),
('favor', 'An act of kindness beyond what is due (American spelling)', 'american', 5, 4),

-- === OBScurity 5 (Very obscure, spelling-bee caliber) ===

-- Length 6
('pharaoh', 'An ancient Egyptian ruler', 'both', 7, 5),
('rhythm', 'A repeated pattern of movement or sound', 'both', 6, 5),

-- Length 9
('bureaucracy', 'A system of government with many levels of officials', 'both', 11, 5),
('idiosyncrasy', 'A mode of behaviour or way of thought peculiar to an individual', 'both', 12, 5),

-- Length 8
('onomatopoeia', 'A word that imitates the sound it describes', 'both', 12, 5),

-- British/American divergents at obscurity 5
('centre', 'The middle point of something (British spelling)', 'british', 6, 5),
('center', 'The middle point of something (American spelling)', 'american', 6, 5),
('defence', 'The action of defending against attack (British spelling)', 'british', 7, 5),
('defense', 'The action of defending against attack (American spelling)', 'american', 7, 5);

-- Verify count: SELECT COUNT(*) FROM words;
-- Should return 40+ rows
