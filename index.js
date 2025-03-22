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
                const imagePath = `/recipes429/${recipeData.image}`; // ✅ Ensure correct image path
                
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

// // ✅ Homepage Route: Load 10 Random Recipes from JSON
// app.get('/', (req, res) => {
//     let recipes = getAllRecipes();
//     recipes = recipes.sort(() => Math.random() - 0.5).slice(0, 10); // ✅ Shuffle and pick 10 random recipes
//     res.render('homepage', { recipes });
// });


// ✅ Define Richard's Suggested Recipes
function getRichardsRecipes() {
    return [
        {
            title: "Chicken Fried Rice",
            image: "/recipes429/images/chicken-fried-rice.jpg",
            url: "/recipe/chicken-fried-rice"
        },
        {
            title: "Mom's Spaghetti Bolognese",
            image: "/recipes429/images/moms-spaghetti-bolognese.jpg",
            url: "/recipe/moms-spaghetti-bolognese"
        },
        {
            title: "Detroit Style Pizza",
            image: "/recipes429/images/detroit-style-pizza.jpg",
            url: "/recipe/detroit-style-pizza"
        },
        {
            title: "Full English Breakfast",
            image: "/recipes429/images/full-english-breakfast.jpg",
            url: "/recipe/full-english-breakfast"
        },
        {
            title: "Cheese Fondue",
            image: "/recipes429/images/cheese-fondue.jpg",
            url: "/recipe/cheese-fondue"
        },
        {
            title: "Crispy Fried Chicken",
            image: "/recipes429/images/crispy-fried-chicken.jpg",
            url: "/recipe/crispy-fried-chicken"
        },
        {
            title: "Chinese Chicken Salad",
            image: "/recipes429/images/chinese-chicken-salad.jpg",
            url: "/recipe/chinese-chicken-salad"
        },
        {
            title: "Delicious Grilled Hamburgers",
            image: "/recipes429/images/delicious-grilled-hamburgers.jpg",
            url: "/recipe/delicious-grilled-hamburgers"
        },
        {
            title: "Grilled Cheese Sandwich",
            image: "/recipes429/images/grilled-cheese-sandwich.jpg",
            url: "/recipe/grilled-cheese-sandwich"
        },
        {
            title: "Homemade Mac and Cheese",
            image: "/recipes429/images/homemade-mac-and-cheese.jpg",
            url: "/recipe/homemade-mac-and-cheese"
        }
    ];
}

// // ✅ Ensure `richardsRecipes` is Passed to `homepage.ejs`
// app.get('/', (req, res) => {
//     let recipes = getAllRecipes().sort(() => Math.random() - 0.5).slice(0, 10);
//     let easyRecipes = getEasyRecipes();
//     let richardsRecipes = getRichardsRecipes(); // Ensure Richard's recipes are included

//     console.log("Debug: Passing richardsRecipes to homepage.ejs:", richardsRecipes.length); // Debugging Log

//     res.render('homepage', { recipes, easyRecipes, richardsRecipes });
// });

function getEasyRecipes(callback) {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('recipe-ingredient.db');

    const sql = `
        SELECT recipe_name, file_name, image_path
        FROM recipe_metadata
        WHERE LOWER(difficulty) IN ('easy', 'medium', 'hard')
        ORDER BY RANDOM()
        LIMIT 10
    `;

    const recipesDir = path.join(__dirname, 'recipes429/recipes');

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("❌ Error querying easy recipes:", err);
            return callback([]);
        }

        const easyRecipes = [];

        rows.forEach(row => {
            const filePath = path.join(recipesDir, `${row.file_name}.json`);


            if (fs.existsSync(filePath)) {
                try {
                    const recipeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const recipeName = row.file_name.replace('.json', '');

                    easyRecipes.push({
                        title: recipeData.title,
                        image: `/recipes429/${recipeData.image}`,
                        url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`
                    });
                } catch (error) {
                    console.error(`❌ Failed to parse recipe JSON: ${row.file_name}`, error);
                }
            } else {
                console.warn(`⚠️ Missing recipe file: ${filePath}`);
            }
        });

        callback(easyRecipes);
    });
}


app.get('/', (req, res) => {
    let recipes = getAllRecipes().sort(() => Math.random() - 0.5).slice(0, 10);
    let teamFavorites = getTeamFavorites();

    getEasyRecipes((easyRecipes) => {
        console.log("✅ Homepage loaded with:");
        console.log("Random:", recipes.length, "Easy:", easyRecipes.length, "Team Favorites:", teamFavorites.length);

        res.render('homepage', {
            recipes,
            easyRecipes,
            teamFavorites
        });
    });
});



function getTeamFavorites() {
    const favoriteFiles = [
        'chicken-fried-rice.json',
        'moms-spaghetti-bolognese.json',
        'detroit-style-pizza.json',
        'full-english-breakfast.json',
        'cheese-fondue.json',
        'crispy-fried-chicken.json',
        'chinese-chicken-salad.json',
        'delicious-grilled-hamburgers.json',
        'grilled-cheese-sandwich.json',
        'homemade-mac-and-cheese.json'
    ];

    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const favorites = [];

    favoriteFiles.forEach(file => {
        const recipePath = path.join(recipesDir, file);

        try {
            if (fs.existsSync(recipePath)) {
                const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
                const recipeName = file.replace('.json', '');
                const imagePath = `/recipes429/${recipeData.image}`;

                favorites.push({
                    title: recipeData.title,
                    image: imagePath,
                    url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`
                });
            } else {
                console.warn(`⚠️ File not found for favorite: ${file}`);
            }
        } catch (err) {
            console.error(`❌ Failed to load favorite recipe from ${file}:`, err);
        }
    });

    return favorites;
}



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
                const imagePath = `/recipes429/${recipeData.image}`;

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

    // console.log(`✅ Recipes Found for Ingredients: ${ingredients}`, matchingRecipes);
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

                // ✅ Log extracted image path for debugging
                // console.log(`🖼️ Extracted image path for "${recipeData.title}": ${recipeData.image}`);

                if (titleMatch || ingredientMatch) {
                    matchingRecipes.push({
                        title: recipeData.title,
                        image: `${recipeData.image}`,
                        url: `/recipe/${encodeURIComponent(recipeName)}`
                    });
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    // console.log(`✅ Search Results for "${query}":`, matchingRecipes); // Debugging log
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
        recipe.image = `/recipes429/${recipe.image}`; // ✅ Ensure correct image path
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

// ✅ Serve the "Select Ingredients" Page with Available Ingredients
app.get('/select-ingredients', (req, res) => {
    const ingredientsList = [
        "Chicken", "Beef", "Fish", "Eggs", "Milk", "Cheese", "Carrots", "Potatoes",
        "Onions", "Garlic", "Tomatoes", "Peppers", "Rice", "Beans", "Pasta", "Flour",
        "Butter", "Salt", "Pepper", "Olive Oil"
    ]; // You can replace this with dynamic data from the recipe database if available.

    res.render('select-ingredients', { ingredientsList });
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
                    // ✅ Extract Image Path and Log for Debugging
                    imagePath =  `/recipes429/${recipeData.image}`;
                    // imagePath = recipeData.image
                    // console.log(`🖼️ Image path for "${recipeData.title}": ${imagePath}`);

                    filteredRecipes.push({
                        title: recipeData.title,
                        image: `/recipes429/${recipeData.image}`,
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

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('recipe-ingredient.db');

app.post('/find-meal-plan', (req, res) => {
    const { proteins, vegetables, others, sidebarIngredients } = req.body;

    console.log("🔍 Received Meal Plan Request");
    console.log("📌 Proteins:", proteins);
    console.log("📌 Vegetables:", vegetables);
    console.log("📌 Other Ingredients:", others);
    console.log("📌 Sidebar Ingredients:", sidebarIngredients);

    if (!proteins || proteins.length === 0) {
        console.log("⚠ No proteins provided, returning empty list.");
        return res.json({});
    }

    let groupedRecipes = {};
    let queriesCompleted = 0;

    proteins.forEach(protein => {
        const allIngredients = [...vegetables, ...others, ...sidebarIngredients];

        // ✅ Convert ingredients & protein to lowercase for case-insensitive search
        const lowerCaseIngredients = allIngredients.map(ing => ing.toLowerCase());
        const lowerCaseProtein = `%${protein.toLowerCase()}%`; // ✅ Use `%` wildcard for partial matches
        const placeholders = new Array(lowerCaseIngredients.length).fill("?").join(",");

        const sqlQuery = `
            SELECT r.recipe_name, GROUP_CONCAT(r.ingredient_name) AS ingredients, m.image_path, m.url
            FROM recipe_ingredients r
            JOIN recipe_metadata m ON r.recipe_name = m.recipe_name
            WHERE (LOWER(m.recipe_name) LIKE ? OR LOWER(r.ingredient_name) LIKE ?)
            AND (LOWER(r.ingredient_name) LIKE ? OR LOWER(r.ingredient_name) IN (${placeholders}))
            GROUP BY r.recipe_name
        `;

        console.log("📝 Running SQL Query:");
        console.log(sqlQuery);
        console.log("🔎 Query Parameters:", [lowerCaseProtein, lowerCaseProtein, lowerCaseProtein, ...lowerCaseIngredients]);

        db.all(sqlQuery, [lowerCaseProtein, lowerCaseProtein, lowerCaseProtein, ...lowerCaseIngredients], (err, rows) => {
            if (err) {
                console.error("❌ Error querying SQLite:", err);
                queriesCompleted++;
                return;
            }

            console.log(`✅ Found ${rows.length} recipes for protein: ${protein}`);

            let proteinResults = [];

            rows.forEach(row => {
                // ✅ Extract key ingredient that matches the protein
                const ingredientsList = row.ingredients.split(", ");
                const keyIngredient = ingredientsList.find(ing => ing.toLowerCase().includes(protein.toLowerCase())) || "Unknown";

                proteinResults.push({
                    title: row.recipe_name,
                    image: row.image_path ? `/recipes429/${row.image_path}` : '/recipes429/images/default.jpg',
                    url: row.url,
                    keyIngredients: keyIngredient
                });
            });

            // ✅ Sort results and take top 5 for each protein
            proteinResults = proteinResults.slice(0, 5);
            groupedRecipes[protein] = proteinResults;

            queriesCompleted++;
            if (queriesCompleted === proteins.length) {
                console.log("✅ Final Grouped Recipes by Protein:", groupedRecipes);
                res.json(groupedRecipes);
            }
        });
    });
});


// ✅ Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
