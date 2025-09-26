from elasticsearch import Elasticsearch

#once you get elastic runnning save info and add to .env and load here
ES_HOST = "http://localhost:9200"
ES_USER = "elastic"
ES_PASSWORD = "123456"
ES_FINGERPRINT = "N3VyZWdaa0I1cDF5QXBlYnJIZEM6bF9nNkdVRnptMER1X09PWHVkYVNOUQ=="

try:
    client = Elasticsearch(
        ES_HOST,
        api_key=(ES_FINGERPRINT)
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
        "calories": {"type": "integer"},
        "protein_grams": {"type": "integer"}
    }
}

#deletes and creates old index and mappings per run in case any changes are made
if client.indices.exists(index=INDEX_NAME):
    print(f"Deleting old index '{INDEX_NAME}'")
    client.indices.delete(index=INDEX_NAME)

print(f"Creating new index '{INDEX_NAME}'")
client.indices.create(index=INDEX_NAME, mappings=MAPPING)


#random chatgpt mock data
print("Indexing mock recipes...")
mock_recipes = [
    {"name": "High-Protein Chicken Bowl", "calories": 450, "protein_grams": 40},
    {"name": "Simple Lentil Soup", "calories": 320, "protein_grams": 18},
    {"name": "Keto Egg Scramble", "calories": 550, "protein_grams": 25}
]

# adds the recipes to elasticsearch
for i, recipe in enumerate(mock_recipes):
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
            f"    Protein: {recipe_data['protein_grams']}g\n"
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