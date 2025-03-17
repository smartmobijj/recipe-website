const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: true
}));

// ✅ Serve static files (Fixes missing styles & images)
app.use(express.static('public'));
app.use('/recipes429/images', express.static(path.join(__dirname, 'recipes429/images')));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ Function to fetch all recipes from JSON files
function getAllRecipes() {
    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipeFiles = fs.readdirSync(recipesDir);
    let recipes = [];

    recipeFiles.forEach(file => {
        if (file.endsWith('.json')) {
            const recipePath = path.join(recipesDir, file);
            try {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                const recipeName = file.replace('.json', '');
                const imagePath = `/recipes429/images/${recipeName}.jpg`; // ✅ Ensure correct image path
                
                recipes.push({
                    title: recipeData.title,
                    image: imagePath,
                    url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`
                });
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    return recipes;
}

// ✅ Homepage Route: Load 10 Random Recipes from JSON
app.get('/', (req, res) => {
    let recipes = getAllRecipes();
    recipes = recipes.sort(() => Math.random() - 0.5).slice(0, 10); // ✅ Shuffle and pick 10 random recipes
    res.render('homepage', { recipes });
});

// ✅ Serve the About Us page
app.get('/about', (req, res) => {
    res.render('about');
});

// ✅ Find Recipes Based on Selected Ingredients (Flexible Matching)
app.post('/find-recipes', (req, res) => {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.length === 0) {
        return res.json([]);
    }

    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipeFiles = fs.readdirSync(recipesDir);
    let matchingRecipes = [];

    recipeFiles.forEach(file => {
        if (file.endsWith('.json')) {
            const recipePath = path.join(recipesDir, file);
            try {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                const recipeName = file.replace('.json', '');
                const imagePath = `/recipes429/images/${recipeName}.jpg`;

                // ✅ Count the number of matching ingredients
                let matchCount = recipeData.ingredients.reduce((count, ingredient) => {
                    return count + (ingredients.some(selected => ingredient.toLowerCase().includes(selected.toLowerCase())) ? 1 : 0);
                }, 0);

                if (matchCount > 0) {
                    matchingRecipes.push({
                        title: recipeData.title,
                        image: imagePath,
                        url: `/recipe/${encodeURIComponent(recipeName)}`,
                        matchScore: matchCount // ✅ Rank based on the number of matching ingredients
                    });
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    // ✅ Sort recipes by the number of matches (most relevant first)
    matchingRecipes.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`✅ Recipes Found for Ingredients: ${ingredients}`, matchingRecipes);
    res.json(matchingRecipes);
});

// ✅ Search Recipes Based on Query (Fix Matching Issues)
app.get('/search', (req, res) => {
    const query = req.query.query.toLowerCase().trim();
    if (!query) return res.json([]);

    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipeFiles = fs.readdirSync(recipesDir);
    let matchingRecipes = [];

    recipeFiles.forEach(file => {
        if (file.endsWith('.json')) {
            const recipePath = path.join(recipesDir, file);
            try {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                const recipeName = file.replace('.json', '');

                // ✅ Check if query matches recipe title or any ingredient
                const titleMatch = recipeData.title.toLowerCase().includes(query);
                const ingredientMatch = recipeData.ingredients.some(ingredient => 
                    ingredient.toLowerCase().includes(query)
                );

                if (titleMatch || ingredientMatch) {
                    matchingRecipes.push({
                        title: recipeData.title,
                        image: `/recipes429/images/${recipeName}.jpg`,
                        url: `/recipe/${encodeURIComponent(recipeName)}`
                    });
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    console.log(`✅ Search Results for "${query}":`, matchingRecipes); // Debugging log
    res.json(matchingRecipes);
});

// ✅ Fetch Single Recipe Details
app.get('/recipe/:recipeName', (req, res) => {
    const { recipeName } = req.params;
    function formatRecipeFilename(recipeName) {
        return recipeName.toLowerCase().replace(/\s+/g, '-') + '.json';
    }
    
    const formattedFilename = formatRecipeFilename(recipeName);
    const recipePath = path.join(__dirname, 'recipes429', 'recipes', formattedFilename);
    

    if (!fs.existsSync(recipePath)) {
        console.error(`❌ Recipe file not found: ${recipePath}`);
        return res.status(404).send("Recipe not found.");
    }

    try {
        const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
        recipe.image = `/recipes429/images/${recipeName}.jpg`; // ✅ Ensure correct image path
        res.render('recipe', { recipe });
    } catch (error) {
        console.error(`❌ Error parsing JSON for ${recipeName}:`, error);
        res.status(500).send("Error processing recipe data.");
    }
});

// ✅ Fetch all distinct continents (Fixed)
app.get('/getContinents', (req, res) => {
    const continents = new Set();
    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipeFiles = fs.readdirSync(recipesDir);

    recipeFiles.forEach(file => {
        if (file.endsWith('.json')) {
            const recipePath = path.join(recipesDir, file);
            try {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                if (recipeData.continent) {
                    continents.add(recipeData.continent);
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    res.json([...continents]); // ✅ Fix: Send response to frontend
});

// ✅ Fetch all distinct countries for a selected continent (Fixed)
app.get('/getCountries', (req, res) => {
    const { continent } = req.query;
    if (!continent) return res.status(400).json({ error: "Missing continent parameter" });

    const countries = new Set();
    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipeFiles = fs.readdirSync(recipesDir);

    recipeFiles.forEach(file => {
        if (file.endsWith('.json')) {
            const recipePath = path.join(recipesDir, file);
            try {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                if (recipeData.continent === continent && recipeData.country) {
                    countries.add(recipeData.country);
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    res.json([...countries]); // ✅ Fix: Send response to frontend
});

// ✅ Serve the "Create Your Own Meal" ingredient selection page
app.get('/select-ingredients', (req, res) => {
    res.render('select-ingredients');
});

// ✅ Fetch Recipes by Continent & Country (Fixed)
app.get('/recipes/:continent/:country', (req, res) => {
    let { continent, country } = req.params;

    // ✅ Decode URL-encoded continent & country names (fixes spaces issue)
    continent = decodeURIComponent(continent);
    country = decodeURIComponent(country);

    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipeFiles = fs.readdirSync(recipesDir);
    let filteredRecipes = [];

    recipeFiles.forEach(file => {
        if (file.endsWith('.json')) {
            const recipePath = path.join(recipesDir, file);
            try {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));

                if (recipeData.continent === continent && recipeData.country === country) {
                    const recipeName = file.replace('.json', '').replace(/-/g, ' ');
                    filteredRecipes.push({
                        title: recipeData.title,
                        image: `/recipes429/images/${recipeName}.jpg`,
                        url: `/recipe/${encodeURIComponent(recipeName)}`
                    });
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    res.render('recipes', { recipes: filteredRecipes, continent, country });
});

// ✅ Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
