# elastic.py
import os
from data_processing import load_and_process_recipes
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from elasticsearch import helpers

load_dotenv()

ES_HOST = "http://localhost:9200"
ES_API_KEY = os.getenv("ES_API_KEY")

try:
    client = Elasticsearch(
        ES_HOST,
        api_key=ES_API_KEY
    )
    if not client.ping():
        raise ConnectionError("couldnt connect")
    print("Elasticsearch client connected!")

except ConnectionError as e:
    print(f"Connection failed: {e}")
    # We exit here if we're running this file directly
    # If app.py imports this, it will just have a 'None' client
    pass 
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    pass


INDEX_NAME = "recipes"
MAPPING = {
    # ... (your mapping is correct, no changes needed) ...
    "properties": {
        "name": {"type": "text"},
        "prep_time": {"type": "text"},
        "cook_time": {"type": "text"},
        "total_time": {"type": "text"},
        "servings": {"type": "text"},
        "yield": {"type": "text"},
        "ingredients": {"type": "text"},
        "directions": {"type": "text"},
        "rating": {"type": "float"},
        "url": {"type": "keyword"},
        "cuisine_path": {"type": "text"},
        "nutrition": {"type": "text"},
        "calories": {"type": "float"},
        "protein_grams": {"type": "float"},
        "fat_grams": {"type": "float"},
        # ... etc ...
        "carbs_grams": {"type": "float"},
        "img_src": {"type": "keyword"}
    }
}


# This special block only runs when you execute: python3 elastic.py
# It will NOT run when app.py imports this file.
if __name__ == "__main__":
    
    print("Running Elasticsearch setup...")
    
    # Check connection again, in case it failed silently above
    if not client.ping():
        print("Cannot run setup. Elasticsearch client is not connected.")
        exit()

    # Deletes and creates old index and mappings per run
    if client.indices.exists(index=INDEX_NAME):
        print(f"Deleting old index '{INDEX_NAME}'")
        client.indices.delete(index=INDEX_NAME)

    print(f"Creating new index '{INDEX_NAME}'")
    client.indices.create(index=INDEX_NAME, mappings=MAPPING)

    print("Loading real recipe data from CSV...")
    recipes = load_and_process_recipes()
    print(f"Loaded {len(recipes)} recipes from CSV.")

    actions = [
        {
            "_index": INDEX_NAME,
            "_source": recipe
        }
        for recipe in recipes
    ]

    print(f"Indexing {len(actions)} documents into Elasticsearch...")
    helpers.bulk(client, actions)
    
    print("Elasticsearch setup and indexing complete! 🚀")