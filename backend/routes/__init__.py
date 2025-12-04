from .meal_plan import bp as meal_plan_bp
from .favorites import bp as favorites_bp
from .search import bp as search_bp
from .users import bp as users_bp
from .macros import bp as macros_bp

def register_blueprints(app):
    app.register_blueprint(meal_plan_bp, url_prefix="/meal-plan")
    app.register_blueprint(favorites_bp, url_prefix="/favorites")
    app.register_blueprint(search_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/user_demographics")
    app.register_blueprint(macros_bp)
