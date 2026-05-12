// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Turkish (`tr`).
class AppLocalizationsTr extends AppLocalizations {
  AppLocalizationsTr([String locale = 'tr']) : super(locale);

  @override
  String get appTitle => 'Gemini AI';

  @override
  String get geminiTitle => 'Gemini 2.5 Flash';

  @override
  String get hintText => 'Mesaj yaz veya konuş...';

  @override
  String get thinking => 'Gemini düşünüyor...';

  @override
  String get welcomeMessage => 'Merhaba! Ben Gemini 2.5 Flash. Resim gönderebilir, konuşarak mesaj atabilirsin!';

  @override
  String get imagePromptGallery => 'Bu resimde ne var? Açıklayabilir misin?';

  @override
  String get imagePromptCamera => 'Bu fotoğrafı çektim, ne görüyorsun?';
}
