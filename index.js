const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const serverSessionID = Date.now().toString(); // unique ID on each server restart


// sessionStorage.clear(); // Uncomment only if needed

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
                    url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`,
                    filename: file
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


function getEasyRecipes(callback) {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('recipe-ingredient.db');

    const sql = `
        SELECT recipe_name, json_path, image_path
        FROM recipe_metadata
        WHERE LOWER(difficulty) IN ('easy', 'medium', 'hard')
        ORDER BY RANDOM()
        LIMIT 10
    `;

    const recipesDir = path.join(__dirname, 'recipes429/');

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("❌ Error querying easy recipes:", err);
            return callback([]);
        }

        const easyRecipes = [];

        rows.forEach(row => {
            // ✅ Use file_name if valid, else fallback to recipe_name
            let baseName = row.json_path.trim();

            // ✅ Ensure only one `.json` extension
            if (!baseName.endsWith('.json')) {
                baseName += '.json';
            }

            const filePath = path.join(recipesDir, baseName);

            if (fs.existsSync(filePath)) {
                try {
                    const recipeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const recipeName = baseName.replace('.json', '');

                    easyRecipes.push({
                        title: recipeData.title,
                        image: `/recipes429/${recipeData.image}`,
                        url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`,
                        filename: baseName
                    });
                } catch (error) {
                    console.error(`❌ Failed to parse recipe JSON: ${baseName}`, error);
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
            teamFavorites,
            serverSessionID
        });
    });
});



function getTeamFavorites() {
    const favoriteFiles = [
        'chicken-fried-rice.json',
        'mom\'s-spaghetti-bolognese.json',
        'detroit-style-pizza.json',
        'full-english-breakfast.json',
        'cheese-fondue.json',
        'crispy-fried-chicken.json',
        'chinese-chicken-salad.json',
        'delicious-grilled-hamburgers.json',
        'grilled-cheese-sandwich.json',
        'homemade-mac-and-cheese.json',
        'baek-kimchi-white-kimchi.json',
        'beef-bulgogi.json',
        'budae-jjigae-korean-army-stew.json',
        'korean-doenjang-jjigae-soybean-paste-soup.json',
        'jajangmyeon-vegetarian-korean-black-bean-noodles.json',
        'korean-soft-tofu-stew-soon-du-bu-jigae.json',
        'sweet-korean-crispy-chicken.json',
        'yaki-mandu-korean-dumplings.json',
        'smoked-salmon-sushi-roll.json',
        'tteokbokki-korean-spicy-rice-cakes.json'
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
                    url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`,
                    filename: file
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

app.get('/selected-recipes', (req, res) => {
    res.render('selected-recipes');
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
                        url: `/recipe/${encodeURIComponent(recipeName.replace(/\s+/g, '-').toLowerCase())}`,
                        filename: file,
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
                        image: `/recipes429/${recipeData.image}`,
                        url: `/recipe/${encodeURIComponent(recipeName)}`,
                        filename: file
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
app.get('/recipe/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename); // e.g., "chicken-fried-rice"
    // const recipePath = path.join(__dirname, 'recipes429/recipes', `${filename}.json`);
    const basePath = filename.startsWith('recipes/')
        ? path.join(__dirname, 'recipes429', filename) // already includes /recipes/
        : path.join(__dirname, 'recipes429/recipes', filename);

    const recipePath = basePath.endsWith('.json') ? basePath : `${basePath}.json`;


    if (!fs.existsSync(recipePath)) {
        console.error(`❌ Recipe file not found in app.get.recipe.filename: ${recipePath}`);
        return res.status(404).send("Recipe not found.");
    }

    try {
        const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
        recipe.image = `/recipes429/${recipe.image}`;
        res.render('recipe', { recipe });
    } catch (err) {
        console.error(`❌ Error parsing JSON for ${filename}:`, err);
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

                if (
                    recipeData.continent &&
                    recipeData.country &&
                    recipeData.continent.toLowerCase() === continent.toLowerCase()
                ) {
                    countries.add(recipeData.country);
                }
            } catch (error) {
                console.error(`❌ Error reading JSON file ${file}:`, error);
            }
        }
    });

    res.json([...countries]);
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
                    const recipeName = file.replace('.json', '');
                    // ✅ Extract Image Path and Log for Debugging
                    imagePath =  `/recipes429/${recipeData.image}`;
                    // imagePath = recipeData.image
                    console.log(`🖼️ Image path for "${recipeData.title}": ${imagePath}, {}`);

                    filteredRecipes.push({
                        title: recipeData.title,
                        image: `/recipes429/${recipeData.image}`,
                        url: `/recipe/${encodeURIComponent(recipeName)}`,
                        filename: file
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

// app.post('/find-meal-plan', (req, res) => {
//     const { proteins, vegetables, others, sidebarIngredients } = req.body;

//     console.log("🔍 Received Meal Plan Request");
//     console.log("📌 Proteins:", proteins);
//     console.log("📌 Vegetables:", vegetables);
//     console.log("📌 Other Ingredients:", others);
//     console.log("📌 Sidebar Ingredients:", sidebarIngredients);

//     if (!proteins || proteins.length === 0) {
//         console.log("⚠ No proteins provided, returning empty list.");
//         return res.json({});
//     }

//     let groupedRecipes = {};
//     let queriesCompleted = 0;

//     proteins.forEach(protein => {
//         const allIngredients = [...vegetables, ...others, ...sidebarIngredients];

//         // ✅ Convert ingredients & protein to lowercase for case-insensitive search
//         const lowerCaseIngredients = allIngredients.map(ing => ing.toLowerCase());
//         const lowerCaseProtein = `%${protein.toLowerCase()}%`; // ✅ Use `%` wildcard for partial matches
//         const placeholders = new Array(lowerCaseIngredients.length).fill("?").join(",");

//         const sqlQuery = `
//             SELECT r.recipe_name, GROUP_CONCAT(r.ingredient_name) AS ingredients, m.image_path, m.url
//             FROM recipe_ingredients r
//             JOIN recipe_metadata m ON r.recipe_name = m.recipe_name
//             WHERE (LOWER(m.recipe_name) LIKE ? OR LOWER(r.ingredient_name) LIKE ?)
//             AND (LOWER(r.ingredient_name) LIKE ? OR LOWER(r.ingredient_name) IN (${placeholders}))
//             GROUP BY r.recipe_name
//         `;

//         console.log("📝 Running SQL Query:");
//         console.log(sqlQuery);
//         console.log("🔎 Query Parameters:", [lowerCaseProtein, lowerCaseProtein, lowerCaseProtein, ...lowerCaseIngredients]);

//         db.all(sqlQuery, [lowerCaseProtein, lowerCaseProtein, lowerCaseProtein, ...lowerCaseIngredients], (err, rows) => {
//             if (err) {
//                 console.error("❌ Error querying SQLite:", err);
//                 queriesCompleted++;
//                 return;
//             }

//             console.log(`✅ Found ${rows.length} recipes for protein: ${protein}`);

//             let proteinResults = [];

//             rows.forEach(row => {
//                 // ✅ Extract key ingredient that matches the protein
//                 const ingredientsList = row.ingredients.split(", ");
//                 const keyIngredient = ingredientsList.find(ing => ing.toLowerCase().includes(protein.toLowerCase())) || "Unknown";

//                 const filename = row.json_path?.replace(/\.json$/, '') || row.recipe_name.replace(/\s+/g, '-').toLowerCase();
//                 const fullFilename = `${filename}.json`;
                
//                 proteinResults.push({
//                     title: row.recipe_name,
//                     image: row.image_path ? `/recipes429/${row.image_path}` : '/recipes429/images/default.jpg',
//                     url: `/recipe/${encodeURIComponent(filename)}`,
//                     filename: fullFilename,
//                     keyIngredients: keyIngredient
//                 });
//             });

//             // ✅ Sort results and take top 5 for each protein
//             proteinResults = proteinResults.slice(0, 5);
//             groupedRecipes[protein] = proteinResults;

//             queriesCompleted++;
//             if (queriesCompleted === proteins.length) {
//                 console.log("✅ Final Grouped Recipes by Protein:", groupedRecipes);
//                 res.json(groupedRecipes);
//             }
//         });
//     });
// });

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

    const allEnteredIngredients = [...vegetables, ...others, ...sidebarIngredients].map(ing => ing.toLowerCase());

    proteins.forEach(protein => {
        const lowerCaseProtein = `%${protein.toLowerCase()}%`;
        const sqlQuery = `
            SELECT r.recipe_name, GROUP_CONCAT(r.ingredient_name) AS ingredients, m.image_path, m.url, m.json_path
            FROM recipe_ingredients r
            JOIN recipe_metadata m ON r.recipe_name = m.recipe_name
            WHERE (LOWER(m.recipe_name) LIKE ? OR LOWER(r.ingredient_name) LIKE ?)
            GROUP BY r.recipe_name
        `;

        db.all(sqlQuery, [lowerCaseProtein, lowerCaseProtein], (err, rows) => {
            if (err) {
                console.error("❌ Error querying SQLite:", err);
                queriesCompleted++;
                return;
            }

            let proteinResults = [];

            rows.forEach(row => {
                const ingredientsList = row.ingredients.toLowerCase().split(',').map(ing => ing.trim());
                let matchScore = 0;
                let matchedIngredients = [];
            
                vegetables.forEach(v => {
                    const vLower = v.toLowerCase();
                    const match = ingredientsList.find(recipeIng => recipeIng.includes(vLower));
                    if (match) {
                        matchScore += 5;
                        matchedIngredients.push({ name: match, source: "vegetables", score: 5 });
                    }
                });
            
                others.forEach(o => {
                    const oLower = o.toLowerCase();
                    const match = ingredientsList.find(recipeIng => recipeIng.includes(oLower));
                    if (match) {
                        matchScore += 5;
                        matchedIngredients.push({ name: match, source: "others", score: 5 });
                    }
                });
            
                sidebarIngredients.forEach(s => {
                    const sLower = s.toLowerCase();
                    const match = ingredientsList.find(recipeIng => recipeIng.includes(sLower));
                    if (match) {
                        matchScore += 1;
                        matchedIngredients.push({ name: match, source: "sidebar", score: 1 });
                    }
                });
                

                // const filename = row.json_path?.replace(/\.json$/, '') || row.recipe_name.replace(/\s+/g, '-').toLowerCase();
                // const fullFilename = `${filename}.json`;

                let filename = row.json_path?.replace(/\.json$/, '') || row.recipe_name.replace(/\s+/g, '-').toLowerCase();
                if (filename.startsWith('recipes/')) {
                    filename = filename.replace(/^recipes\//, '');
                }
                const fullFilename = `${filename}.json`;


                proteinResults.push({
                    title: row.recipe_name,
                    image: row.image_path ? `/recipes429/${row.image_path}` : '/recipes429/images/default.jpg',
                    url: `/recipe/${encodeURIComponent(filename)}`,
                    filename: fullFilename,
                    matchScore,
                    matchedIngredients
                });
            });

            // ✅ Sort by matchScore
            proteinResults.sort((a, b) => b.matchScore - a.matchScore);
            groupedRecipes[protein] = proteinResults.slice(0, 6); // top 5

            queriesCompleted++;
            if (queriesCompleted === proteins.length) {
                console.log("✅ Final Grouped Recipes by Protein:", groupedRecipes);
                res.json(groupedRecipes);
            }
        });
    });
});


app.post('/selected-recipes/print', (req, res) => {
    const selectedFiles = req.body.filenames; // expects an array of filenames
    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const recipes = [];

    if (!Array.isArray(selectedFiles)) return res.status(400).send("Invalid request.");

    selectedFiles.forEach(file => {
        const filePath = path.join(recipesDir, file);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            data.image = `/recipes429/${data.image}`;
            recipes.push(data);
        }
    });

    res.render('print-recipes', { recipes });
});

app.post('/selected-recipes/shopping-list', (req, res) => {
    const selectedFiles = req.body.filenames;
    const recipesDir = path.join(__dirname, 'recipes429/recipes');
    const ingredientsMap = {};

    if (!Array.isArray(selectedFiles)) return res.status(400).send("Invalid request.");

    selectedFiles.forEach(file => {
        const filePath = path.join(recipesDir, file);
        if (fs.existsSync(filePath)) {
            const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            recipe.ingredients.forEach(raw => {
                // Basic merge logic: try to split quantity and ingredient name
                const parts = raw.match(/^([\d\/\.\-\s]+)?\s*(.+)$/);
                const quantity = parts && parts[1] ? parts[1].trim() : '';
                const name = parts && parts[2] ? parts[2].trim().toLowerCase() : raw;

                if (!ingredientsMap[name]) {
                    ingredientsMap[name] = [];
                }

                if (quantity) {
                    ingredientsMap[name].push(quantity);
                } else {
                    ingredientsMap[name].push('');
                }
            });
        }
    });

    res.render('shopping-list', { ingredientsMap });
});


app.get('/tutorial', (req, res) => {
    res.render('tutorial');
});

app.get('/reference', (req, res) => {
    res.render('reference');
});

// ✅ Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
