import os
import sqlite3
import random
import pandas as pd

# Database file path
DB_FILE = "./recipe-ingredient.db"

# Local directories
JSON_DIR = "./recipes429/recipes/"
IMAGE_DIR = "./recipes429/images/"

# Connect to the database
def connect_db(db_file):
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except sqlite3.Error as e:
        print(f"❌ Database connection error: {e}")
        return None

# Check if required data exists
def check_database_data(conn):
    cursor = conn.cursor()
    
    # Check the number of recipes
    cursor.execute("SELECT COUNT(*) FROM recipe_metadata;")
    recipe_count = cursor.fetchone()[0]
    
    # Check a sample of 5 recipes
    cursor.execute("SELECT recipe_name, json_path, image_path FROM recipe_metadata ORDER BY RANDOM() LIMIT 5;")
    sample_recipes = cursor.fetchall()

    return recipe_count, sample_recipes

# Validate file existence
def validate_files(sample_recipes):
    missing_json = []
    missing_images = []
    
    for recipe_name, json_path, image_path in sample_recipes:
        json_exists = os.path.exists(os.path.join(JSON_DIR, json_path))
        image_exists = os.path.exists(os.path.join(IMAGE_DIR, image_path))
        
        if not json_exists:
            missing_json.append((recipe_name, json_path))
        if not image_exists:
            missing_images.append((recipe_name, image_path))
    
    return missing_json, missing_images

# Fetch and display sample data
def fetch_sample_data(conn):
    query = "SELECT * FROM recipe_metadata ORDER BY RANDOM() LIMIT 10;"
    df = pd.read_sql_query(query, conn)
    print("\n✅ Sample Recipe Metadata:")
    print(df)

# Main execution
def main():
    conn = connect_db(DB_FILE)
    if not conn:
        return
    
    recipe_count, sample_recipes = check_database_data(conn)
    
    print(f"✅ Total Recipes in Database: {recipe_count}")
    
    if recipe_count == 0:
        print("⚠️ No recipes found in the database!")
        return
    
    # Validate files
    missing_json, missing_images = validate_files(sample_recipes)
    
    if missing_json:
        print("\n❌ Missing JSON files:")
        for item in missing_json:
            print(f" - {item[0]}: {item[1]}")
    else:
        print("\n✅ All JSON files exist!")
    
    if missing_images:
        print("\n❌ Missing Image files:")
        for item in missing_images:
            print(f" - {item[0]}: {item[1]}")
    else:
        print("\n✅ All Image files exist!")
    
    # Display sample data for verification
    fetch_sample_data(conn)
    
    # Close the database connection
    conn.close()

if __name__ == "__main__":
    main()
