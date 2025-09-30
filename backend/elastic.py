from elasticsearch import Elasticsearch, helpers
from data_processing import load_and_process_recipes

#once you get elastic runnning save info and add to .env and load here
ES_HOST = "https://localhost:9200"
ES_USER = "elastic"
ES_PASSWORD = "bbroOr3dD6zP=6*VsarI"
ES_FINGERPRINT = "97a5ecf51cf9875c04ce0614427bcece39b96d51056804235d1c1c01d533a27e"

try:
    client = Elasticsearch(
        ES_HOST,
        basic_auth=("elastic", ES_PASSWORD),
        ssl_assert_fingerprint=ES_FINGERPRINT 
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
        "ingredients": {"type": "text"},
        "calories": {"type": "integer"},
        "protein_grams": {"type": "float"},
        "carbs_grams": {"type": "float"},
        "fat_grams": {"type": "float"},
        "tags": {"type": "keyword"}
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