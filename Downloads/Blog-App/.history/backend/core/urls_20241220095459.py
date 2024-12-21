from django.contrib import admin
from django.urls import include, path
from django.http import HttpResponse


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('accounts.urls')),
    path('api/blogs/', include('blogs.urls')),
     # New path to handle the root URL
]
