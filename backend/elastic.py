import os
from data_processing import load_and_process_recipes
from elasticsearch import Elasticsearch
from dotenv import load_dotenv

load_dotenv()

#once you get elastic runnning save info and add to .env and load here
ES_HOST = "http://localhost:9200"
ES_USER = "elastic"
ES_PASSWORD = "123456"
ES_FINGERPRINT = ""
ES_API_KEY = os.getenv("ES_API_KEY")

try:
    client = Elasticsearch(
        ES_HOST,
        api_key=(ES_API_KEY)
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

recipes = load_and_process_recipes()

# adds the recipes to elasticsearch
for i, recipe in enumerate(recipes):
    # The id is a unique identifier for the document
    client.index(index=INDEX_NAME, id=i, document=recipe)


# forces a refresh so the documents are immediately available for searching. 
# Otherwise they are place on like a hold for 1 second which our program is faster than so it would search nothing
client.indices.refresh(index=INDEX_NAME)


#EXAMPLE USE
#chatgpt hardcoded example of fidning a recipe with 20g of protein
print("\n" + "="*40)
print("  SEARCHING FOR RECIPES WITH > 20g PROTEIN")
print("="*40)

query = {
    "range": {
        "protein_grams": {
            "gte": 20  # "gte" means "Greater Than or Equal to"
        }
    }
}

response = client.search(index=INDEX_NAME, query=query)

# Print the results
print(f"Found {response['hits']['total']['value']} matching recipes:")

if not response['hits']['hits']:
    print("No recipes found matching your criteria.")
else:
    for hit in response['hits']['hits']:
        # The actual recipe data is in the '_source' field
        recipe_data = hit['_source']
        print(
            f"  - Name: {recipe_data['name']}\n"
            f"    Calories: {recipe_data['calories']} kcal\n"
            f"    Protein: {recipe_data['protein_grams']} g\n"
        )

# EXMAPLE 2 this time with typo(fuzzy) handling. fuzzy measure character differences to determine typos
print("\n" + "="*50)
print("  QUERY 2: Searching for 'chickn' (with a typo)")
print("="*50)

search_term_with_typo = "chickn"

query_fuzzy = {
    "match": {
        "name": {
            "query": search_term_with_typo,
            "fuzziness": "AUTO"  # This enables typo tolerance
        }
    }
}

response_fuzzy = client.search(index=INDEX_NAME, query=query_fuzzy)

print(f"Found {response_fuzzy['hits']['total']['value']} matching recipes for the fuzzy search:")
for hit in response_fuzzy['hits']['hits']:
    recipe_data = hit['_source']
    print(f"  - {recipe_data['name']} (Relevance Score: {hit['_score']:.2f})")