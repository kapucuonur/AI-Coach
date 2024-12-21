from rest_framework import generics

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .serializers import BlogSerializer
from .pagination import CustomPageNumberPagination
from django.shortcuts import render
from django.views.generic import ListView, DetailView
from .models import Blog
from django.http import HttpResponse

from django.shortcuts import render

def home(request):
    return render(request, 'home.html')  # Replace with your desired template



# Blog ile ilgili Detaylı Görüntüleme (HTML)
class ApplaudPostView(DetailView):
    model = Blog  # Assuming Blog is your model
    template_name = 'blog/applaud_post.html'  # Adjust the template path if needed

# Tüm Bloglar Listesi (HTML)
class AllBlogsListView(ListView):
    model = Blog
    template_name = 'blog_list.html'  # Your template file name
    context_object_name = 'blogs'

# Blog Detayı Görüntüleme (HTML)
class ApplaudDetailView(DetailView):
    model = Blog
    template_name = 'blog_detail.html'  # Your template file name
    context_object_name = 'blog'

# API ile Tüm Blogları Listeleme
class AllBlogsAPIView(APIView):
    pagination_class = CustomPageNumberPagination

    def get(self, request):
        blogs = Blog.objects.all()  # Fetch all blogs from the database.
        paginator = self.pagination_class()  # Instantiate your custom pagination class.
        result_page = paginator.paginate_queryset(blogs, request)
        serializer = BlogSerializer(result_page, many=True)  # Serialize the data.
        return paginator.get_paginated_response(serializer.data)  # Return paginated response

# Blog Oluşturma ve Listeleme API View
class BlogListCreateAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [FormParser, MultiPartParser]
    pagination_class = CustomPageNumberPagination

    def get(self, request: Request, *args, **kwargs):
        blogs = Blog.objects.all()
        paginator = CustomPageNumberPagination()
        result_page = paginator.paginate_queryset(blogs, request)
        serializer = BlogSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request, *args, **kwargs):
        serializer = BlogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
