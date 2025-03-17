import csv
import re
import requests
import time
import random
import os
from bs4 import BeautifulSoup

# Define file paths
BASE_DIR = os.path.abspath(os.getcwd())  
RECIPE_CSV_FILE = os.path.join(BASE_DIR, "recipe_urls.csv")  # Original file
CLEANED_CSV_FILE = os.path.join(BASE_DIR, "cleaned_recipe_urls.csv")  # Updated file
FAILED_SEARCHES_LOG = os.path.join(BASE_DIR, "recipe_url_failed_searches.log")  # Log file

# Function to clean AllRecipes URLs
def clean_allrecipes_url(url):
    """Removes the numeric ID from AllRecipes URLs."""
    match = re.search(r"https://www.allrecipes.com/recipe/\d+/(.+)/", url)
    if match:
        return f"https://www.allrecipes.com/recipe/{match.group(1)}/"
    return url

# Function to search AllRecipes for a given recipe name
def search_allrecipes(recipe_name):
    """Uses Google search to find an AllRecipes link for a given recipe name."""
    search_url = f"https://www.google.com/search?q=site:allrecipes.com+{recipe_name.replace(' ', '+')}"
    headers = {
        "User-Agent": random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        ])
    }

    try:
        response = requests.get(search_url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            for link in soup.find_all("a", href=True):
                href = link["href"]
                if "allrecipes.com/recipe/" in href:
                    # Extract clean URL and return
                    return clean_allrecipes_url(href)
    except Exception as e:
        print(f"❌ Search failed for {recipe_name}: {e}")

    return None

# Function to process the recipe URLs
def process_recipe_urls():
    updated_recipes = []
    failed_searches = []
    processed_count = 0

    # Read the CSV file
    with open(RECIPE_CSV_FILE, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        header = next(reader)  # Read the header row
        updated_recipes.append(header)  # Keep the header row

        for row in reader:
            if len(row) < 6:
                continue  # Skip invalid rows

            recipe_id = row[0].strip()
            recipe_name = row[1].strip()
            recipe_url = row[2].strip()

            # Check if it's an AllRecipes URL
            if "allrecipes.com/recipe/" in recipe_url:
                cleaned_url = clean_allrecipes_url(recipe_url)
                print(f"✅ Fixed AllRecipes URL: {recipe_url} → {cleaned_url}")
                row[2] = cleaned_url  # Update row with cleaned URL
            else:
                # If not from AllRecipes, try to find an alternative
                print(f"🔍 Searching for AllRecipes version of: {recipe_name}")
                new_url = search_allrecipes(recipe_name)

                if new_url:
                    print(f"✅ Found AllRecipes alternative: {new_url}")
                    row[2] = new_url  # Replace with the new AllRecipes URL
                else:
                    print(f"❌ No AllRecipes alternative found for {recipe_name}")
                    failed_searches.append(recipe_name)

            updated_recipes.append(row)
            processed_count += 1

            # Sleep to avoid getting blocked (random delay between 10-20 seconds)
            sleep_time = random.randint(5, 10)
            print(f"⏳ Sleeping for {sleep_time} seconds to avoid blocking...")
            time.sleep(sleep_time)

            # Process only the first 20 rows for testing
            if processed_count >= 1060:
                break

    # Save updated URLs to a new CSV file
    with open(CLEANED_CSV_FILE, "w", newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(updated_recipes)

    # Save failed searches
    if failed_searches:
        with open(FAILED_SEARCHES_LOG, "w", encoding="utf-8") as log_file:
            log_file.write("\n".join(failed_searches))
    
    print(f"🎉 Process completed! Cleaned URLs saved in {CLEANED_CSV_FILE}")

# Run the script
if __name__ == "__main__":
    process_recipe_urls()
