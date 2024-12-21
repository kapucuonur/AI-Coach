from django.urls import path
from .views import AllBlogsListView, AllBlogsAPIView, ApplaudDetailView, ApplaudPostView
from .views import BlogListCreateAPIView
from . import views
urlpatterns = [
    # HTML Görünümü
    path('blogs/', AllBlogsListView.as_view(), name='blog-list'),  # ListView kullanılıyor
    path('applaud/<int:pk>/', ApplaudPostView.as_view(), name='applaud-post'),
    path('blog/<int:pk>/', ApplaudDetailView.as_view(), name='blog-detail'),
    
    # API Görünümü
    path('api/blogs/', AllBlogsAPIView.as_view(), name='api-blog-list'),  # APIView kullanılıyor
    path('api/blog/create/', BlogListCreateAPIView.as_view(), name='api-blog-create'),  # Blog oluşturma
]
