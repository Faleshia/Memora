from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Auth
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Notes
    path("notes/", views.NoteListCreateView.as_view(), name="notes-list"),
    path("notes/<int:pk>/", views.NoteDetailView.as_view(), name="notes-detail"),
    path("notes/<int:pk>/lock/", views.NoteLockView.as_view(), name="notes-lock"),

    # Events
    path("events/", views.EventListCreateView.as_view(), name="events-list"),
]