def get_current_week_start():
    """
    Returns the Monday date of the current week in YYYY-MM-DD format.
    """
    from datetime import datetime, timedelta
    today = datetime.now()
    # Get Monday (weekday 0)
    days_since_monday = today.weekday()
    monday = today - timedelta(days=days_since_monday)
    return monday.strftime("%Y-%m-%d")