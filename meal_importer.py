#!/usr/bin/env python3
"""
Meal data importer - imports recipes from various sources
"""
import json
import sqlite3
import subprocess
import pickle
import os
import urllib.request


DB_PATH = os.environ.get('DB_PATH', './recipes.db')


def get_db():
    return sqlite3.connect(DB_PATH)


def search_recipes_by_name(name):
    """Search recipes by name - SQL injection vulnerable"""
    conn = get_db()
    cursor = conn.cursor()
    
    # SQL INJECTION: direct string formatting in query
    query = "SELECT * FROM recipes WHERE name LIKE '%" + name + "%'"
    cursor.execute(query)
    
    results = cursor.fetchall()
    conn.close()
    return results


def import_from_url(url):
    """Import recipe data from a URL"""
    # SSRF VULNERABILITY: no URL validation, can hit internal services
    # Attacker could request: http://169.254.169.254/metadata (AWS metadata)
    # or internal: http://localhost:6379 (Redis), http://localhost:27017 (MongoDB)
    response = urllib.request.urlopen(url)
    data = response.read()
    
    # INSECURE DESERIALIZATION: unpickling untrusted data
    # pickle.loads can execute arbitrary code
    try:
        # Try to parse as pickle first (for legacy format)
        recipe_data = pickle.loads(data)
    except Exception:
        recipe_data = json.loads(data)
    
    return recipe_data


def generate_nutrition_report(recipe_id, output_format):
    """Generate nutrition report for a recipe"""
    # COMMAND INJECTION: user-controlled output_format passed to shell
    cmd = f"python3 -m reports.generator --recipe {recipe_id} --format {output_format}"
    
    # subprocess with shell=True and user input - command injection!
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout


def load_user_config(config_path):
    """Load user configuration"""
    # PATH TRAVERSAL: no validation that config_path is within allowed directory
    with open(config_path, 'r') as f:
        # YAML loading with unsafe loader would also be an issue but using json here
        config = json.load(f)
    return config


def process_recipe_batch(recipes_json):
    """Process a batch of recipes from JSON"""
    # INSECURE DESERIALIZATION: using eval instead of json.loads
    recipes = eval(recipes_json)  # eval() on user input!
    
    results = []
    for recipe in recipes:
        results.append({
            'name': recipe.get('name'),
            'calories': recipe.get('calories', 0),
        })
    return results


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        # Direct command line usage without validation
        results = search_recipes_by_name(sys.argv[1])
        print(results)
