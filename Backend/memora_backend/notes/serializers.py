from rest_framework import serializers 
from .models import User, Note, Event 
from django.contrib.auth import authenticate 


class RegisterSerializer(serializers.ModelSerializer): 
    password = serializers.CharField(write_only=True, min_length=6) 

    class Meta: 
        model = User 
        fields = ["id", "name", "email", "gender", "password"]

    def validate_email(self, value):
      if User.objects.filter(email=value).exists():
        raise serializers.ValidationError("Email already exists.")
      return value 

    def create(self, validated_data): 
            return User.objects.create_user( 
                email=validated_data["email"], 
                name=validated_data["name"], 
                password=validated_data["password"], 
                gender=validated_data.get("gender", "neutral"), 
                )
         
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(data["password"]):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("Account is disabled.")

        data["user"] = user
        return data    

class UserSerializer(serializers.ModelSerializer): 
    class Meta: 
        model = User 
        fields = ["id", "name", "email", "gender", "created_at"] 

class NoteSerializer(serializers.ModelSerializer): 
    class Meta: 
        model = Note 
        fields = ["id", "title", "content", "color", "is_locked", "created_at", "updated_at"] 
        read_only_fields = ["id", "created_at", "updated_at"]
 
class EventSerializer(serializers.ModelSerializer): 
    class Meta: 
        model = Event 
        fields = ["id", "title", "date", "created_at"] 
        read_only_fields = ["id", "created_at"]