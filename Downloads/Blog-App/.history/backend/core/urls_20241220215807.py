from django.contrib import admin
from django.urls import include, path
from . import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('accounts.urls')),
    path('api/blogs/', include('blogs.urls')),
    path('', views.root, name='root'), 
    path('', views.home, name='home'),
     # Add this line to handle the root URL
     # New path to handle the root URL
]
