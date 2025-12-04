from flask import Flask
from config import Config
from extensions import init_extensions
from routes import register_blueprints

def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    app.url_map.strict_slashes = False
    init_extensions(app)
    register_blueprints(app)
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=False, use_reloader=False)
