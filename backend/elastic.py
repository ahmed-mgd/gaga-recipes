import os
from data_processing import load_and_process_recipes
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
from elasticsearch import helpers

load_dotenv()

#once you get elastic runnning save info and add to .env and load here
# ES_USER="elastic"
# ES_PASSWORD = os.getenv("ES_PASSWORD")
# ES_FINGERPRINT = os.getenv("ES_FINGERPRINT")
ES_HOST = "http://localhost:9200"
ES_API_KEY = os.getenv("ES_API_KEY")

try:
    client = Elasticsearch(
        ES_HOST,
        api_key=ES_API_KEY
    )
    if not client.ping():
        raise ConnectionError("couldnt connect")
    print("connected!")

except ConnectionError as e:
    print(f"Connection failed: {e}")
    exit()

#works on mappings to know exactly what to look for and how
INDEX_NAME = "recipes"
MAPPING = {
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
        "saturated_fat_grams": {"type": "float"},
        "cholesterol_mg": {"type": "float"},
        "sodium_mg": {"type": "float"},
        "carbs_grams": {"type": "float"},
        "fiber_grams": {"type": "float"},
        "sugar_grams": {"type": "float"},
        "vitamin_c_mg": {"type": "float"},
        "calcium_mg": {"type": "float"},
        "iron_mg": {"type": "float"},
        "potassium_mg": {"type": "float"},
        "timing": {"type": "text"},
        "img_src": {"type": "keyword"}
    }
}

#deletes and creates old index and mappings per run in case any changes are made
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
