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
                    url: `/recipe/${encodeURIComponent(recipeName)}`
                });
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    return recipes;
}

// ✅ Homepage Route: Load Recipes from JSON
app.get('/', (req, res) => {
    const recipes = getAllRecipes();
    res.render('homepage', { recipes });
});

// ✅ Fetch Single Recipe Details
app.get('/recipe/:recipeName', (req, res) => {
    const { recipeName } = req.params;
    const recipePath = path.join(__dirname, `recipes429/recipes/${recipeName}.json`);

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

// ✅ Serve the ingredient selection page
app.get('/select-ingredients', (req, res) => {
    res.render('select-ingredients');
});

// ✅ Find Recipes Based on Selected Ingredients
app.post('/find-recipes', (req, res) => {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.length === 0) {
        return res.json([]);
    }

    // ✅ Fetch recipes that contain at least one selected ingredient
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

                // ✅ Check if at least one selected ingredient matches the recipe
                if (recipeData.ingredients.some(ingredient => 
                    ingredients.includes(ingredient)
                )) {
                    matchingRecipes.push({
                        title: recipeData.title,
                        image: imagePath,
                        url: `/recipe/${encodeURIComponent(recipeName)}`
                    });
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    res.json(matchingRecipes);
});

// ✅ Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
