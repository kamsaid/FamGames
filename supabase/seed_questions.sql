-- Seed Questions for Family Together Trivia
-- 10 test questions across different categories and difficulty levels

-- Easy questions (suitable for kids)
INSERT INTO questions (category, question, choices, answer, difficulty) VALUES 
(
    'Animals', 
    'What sound does a cow make?',
    '["Moo", "Woof", "Meow", "Oink"]',
    'Moo',
    'easy'
),
(
    'Colors', 
    'What color do you get when you mix red and yellow?',
    '["Orange", "Purple", "Green", "Blue"]',
    'Orange',
    'easy'
);

-- Medium questions (general knowledge)
INSERT INTO questions (category, question, choices, answer, difficulty) VALUES 
(
    'Geography', 
    'What is the capital of France?',
    '["London", "Berlin", "Paris", "Madrid"]',
    'Paris',
    'medium'
),
(
    'Science', 
    'How many legs does a spider have?',
    '["6", "8", "10", "12"]',
    '8',
    'medium'
),
(
    'History', 
    'In what year did World War II end?',
    '["1944", "1945", "1946", "1947"]',
    '1945',
    'medium'
),
(
    'Pop Culture', 
    'Which movie features the song "Let It Go"?',
    '["Moana", "Frozen", "Tangled", "Encanto"]',
    'Frozen',
    'medium'
);

-- Hard questions (challenging)
INSERT INTO questions (category, question, choices, answer, difficulty) VALUES 
(
    'Science', 
    'What is the chemical symbol for gold?',
    '["Go", "Gd", "Au", "Ag"]',
    'Au',
    'hard'
),
(
    'Geography', 
    'Which country has the most time zones?',
    '["Russia", "China", "USA", "Canada"]',
    'Russia',
    'hard'
),
(
    'Fun Facts', 
    'What is the only mammal capable of true flight?',
    '["Flying squirrel", "Bat", "Sugar glider", "Pterodactyl"]',
    'Bat',
    'hard'
),
(
    'Riddles', 
    'I have keys but no locks. I have space but no room. You can enter but not go inside. What am I?',
    '["A piano", "A keyboard", "A house", "A car"]',
    'A keyboard',
    'hard'
); 