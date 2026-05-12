// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Gemini AI';

  @override
  String get geminiTitle => 'Gemini 2.5 Flash';

  @override
  String get hintText => 'Type a message or speak...';

  @override
  String get thinking => 'Gemini is thinking...';

  @override
  String get welcomeMessage => 'Hi! I\'m Gemini 2.5 Flash. You can send images or speak to me!';

  @override
  String get imagePromptGallery => 'What\'s in this image? Can you describe it?';

  @override
  String get imagePromptCamera => 'I just took this photo, what do you see?';
}
