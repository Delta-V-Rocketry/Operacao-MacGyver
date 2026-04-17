# ═══════════════════════════════════════════════════════════
#  DeltaV Rocketry · Entry point para Azure App Service
#
#  O Azure procura por uma variável chamada `app` neste arquivo.
#  Comando de startup configurado no Azure:
#    gunicorn --bind=0.0.0.0:8000 main:app
# ═══════════════════════════════════════════════════════════

from app import app  # noqa: F401  — expõe `app` para o gunicorn